'use server'

import { parseBankExcel } from '@/lib/parse-bank-excel'
import { classifyTransaction } from '@/lib/classify-transaction'
import { createAdminClient } from '@/utils/supabase/admin'

export type FileType = 'bank_statement' | 'credit_card' | 'tax_invoice' | 'payroll' | 'receipt'

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  bank_statement: '은행 입출금 내역',
  credit_card: '신용카드 내역',
  tax_invoice: '전자세금계산서',
  payroll: '급여 내역',
  receipt: '영수증',
}

export interface UploadResult {
  success: boolean
  error?: string
  uploadId?: string
  transactionCount?: number
  totalWithdrawal?: number
  totalDeposit?: number
  bankName?: string
  accountNumber?: string
  isDuplicate?: boolean
}

/** SHA-256 해시 (중복 감지용) */
async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const crypto = await import('crypto')
  const hash = crypto.createHash('sha256')
  hash.update(Buffer.from(buffer))
  return hash.digest('hex')
}

export async function uploadBankExcel(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file') as File
    const fileType = (formData.get('fileType') as FileType) || 'bank_statement'

    if (!file) {
      return { success: false, error: '파일이 선택되지 않았습니다.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      return { success: false, error: '지원하지 않는 파일 형식입니다. (xlsx, xls, csv만 가능)' }
    }

    const buffer = await file.arrayBuffer()
    const supabase = createAdminClient()

    // 중복 파일 감지
    const fileHash = await hashBuffer(buffer)
    const { data: existing } = await supabase
      .from('uploads')
      .select('id, file_name, created_at')
      .eq('file_hash', fileHash)
      .limit(1)

    if (existing && existing.length > 0) {
      const prev = existing[0]
      return {
        success: false,
        isDuplicate: true,
        error: `동일한 파일이 이미 업로드되어 있습니다. (${prev.file_name}, ${new Date(String(prev.created_at)).toLocaleDateString('ko-KR')})`,
      }
    }

    // 1. Supabase Storage에 파일 저장
    const timestamp = Date.now()
    const storagePath = `${fileType}/${timestamp}_${file.name}`
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return { success: false, error: `파일 저장 실패: ${storageError.message}` }
    }

    // 2. 엑셀 파싱 (은행/카드 내역만)
    let result
    let rowCount = 0
    let totalWithdrawal = 0
    let totalDeposit = 0
    let bankName = ''
    let accountNumber = ''
    let accountHolder = ''
    let periodStart = ''
    let periodEnd = ''

    if (fileType === 'bank_statement' || fileType === 'credit_card') {
      result = parseBankExcel(buffer)
      rowCount = result.transactions.length
      totalWithdrawal = result.totalWithdrawal
      totalDeposit = result.totalDeposit
      bankName = result.meta.bankName
      accountNumber = result.meta.accountNumber
      accountHolder = result.meta.accountHolder
      periodStart = result.meta.periodStart
      periodEnd = result.meta.periodEnd
    }

    // 3. uploads 테이블에 파일 정보 저장
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath,
        file_size: buffer.byteLength,
        file_hash: fileHash,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        account_holder: accountHolder || null,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        total_withdrawal: totalWithdrawal,
        total_deposit: totalDeposit,
        row_count: rowCount,
      })
      .select('id')
      .single()

    if (uploadError) {
      console.error('Upload insert error:', uploadError)
      // 스토리지에서 삭제
      await supabase.storage.from('uploads').remove([storagePath])
      return { success: false, error: `DB 저장 실패: ${uploadError.message}` }
    }

    // 4. 거래 내역 분개 및 저장 (은행/카드만)
    if (result && result.transactions.length > 0) {
      const txRows = result.transactions.map((tx) => {
        const classification = classifyTransaction({
          withdrawal: tx.withdrawal,
          deposit: tx.deposit,
          description: tx.description,
          counterpartName: tx.counterpartName,
          counterpartBank: tx.counterpartBank,
          transactionType: tx.transactionType,
          memo: tx.memo,
        })

        return {
          upload_id: upload.id,
          seq: tx.seq,
          transaction_date: tx.transactionDate,
          withdrawal: tx.withdrawal,
          deposit: tx.deposit,
          balance: tx.balance,
          description: tx.description,
          counterpart_account: tx.counterpartAccount,
          counterpart_bank: tx.counterpartBank,
          memo: tx.memo,
          transaction_type: tx.transactionType,
          counterpart_name: tx.counterpartName,
          debit_account: classification.debitAccount,
          credit_account: classification.creditAccount,
          vat_deductible: classification.vatDeductible,
          ai_confidence: classification.confidence,
          ai_reason: classification.reason,
          status: 'classified',
        }
      })

      const { error: txError } = await supabase
        .from('transactions')
        .insert(txRows)

      if (txError) {
        console.error('Transactions insert error:', txError)
        await supabase.from('uploads').delete().eq('id', upload.id)
        await supabase.storage.from('uploads').remove([storagePath])
        return { success: false, error: `거래 내역 저장 실패: ${txError.message}` }
      }
    }

    return {
      success: true,
      uploadId: upload.id,
      transactionCount: rowCount,
      totalWithdrawal,
      totalDeposit,
      bankName: bankName || undefined,
      accountNumber: accountNumber || undefined,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}

/**
 * 파일 다운로드 URL 생성 (60분 유효)
 */
export async function getDownloadUrl(storagePath: string): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(storagePath, 3600) // 60분

    if (error) return { error: error.message }
    return { url: data.signedUrl }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 업로드 파일 삭제
 */
export async function deleteUpload(uploadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // storage_path 조회
    const { data: upload } = await supabase
      .from('uploads')
      .select('storage_path')
      .eq('id', uploadId)
      .single()

    // Storage 파일 삭제
    if (upload?.storage_path) {
      await supabase.storage.from('uploads').remove([upload.storage_path])
    }

    // DB 레코드 삭제 (cascade로 transactions도 삭제됨)
    const { error } = await supabase
      .from('uploads')
      .delete()
      .eq('id', uploadId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}
