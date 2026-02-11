'use server'

import { parseBankExcel } from '@/lib/parse-bank-excel'
import { createAdminClient } from '@/utils/supabase/admin'

export interface UploadResult {
  success: boolean
  error?: string
  uploadId?: string
  transactionCount?: number
  totalWithdrawal?: number
  totalDeposit?: number
  bankName?: string
  accountNumber?: string
}

export async function uploadBankExcel(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: '파일이 선택되지 않았습니다.' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      return { success: false, error: '지원하지 않는 파일 형식입니다. (xlsx, xls, csv만 가능)' }
    }

    // 엑셀 파싱
    const buffer = await file.arrayBuffer()
    const result = parseBankExcel(buffer)

    const supabase = createAdminClient()

    // 1. uploads 테이블에 파일 정보 저장
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        file_name: file.name,
        bank_name: result.meta.bankName,
        account_number: result.meta.accountNumber,
        account_holder: result.meta.accountHolder,
        period_start: result.meta.periodStart || null,
        period_end: result.meta.periodEnd || null,
        total_withdrawal: result.totalWithdrawal,
        total_deposit: result.totalDeposit,
        row_count: result.transactions.length,
      })
      .select('id')
      .single()

    if (uploadError) {
      console.error('Upload insert error:', uploadError)
      return { success: false, error: `DB 저장 실패: ${uploadError.message}` }
    }

    // 2. transactions 테이블에 거래 내역 일괄 삽입
    const txRows = result.transactions.map((tx) => ({
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
      status: 'pending',
    }))

    const { error: txError } = await supabase
      .from('transactions')
      .insert(txRows)

    if (txError) {
      console.error('Transactions insert error:', txError)
      // 롤백: upload도 삭제
      await supabase.from('uploads').delete().eq('id', upload.id)
      return { success: false, error: `거래 내역 저장 실패: ${txError.message}` }
    }

    return {
      success: true,
      uploadId: upload.id,
      transactionCount: result.transactions.length,
      totalWithdrawal: result.totalWithdrawal,
      totalDeposit: result.totalDeposit,
      bankName: result.meta.bankName,
      accountNumber: result.meta.accountNumber,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}
