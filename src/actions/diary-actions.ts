'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { parseDiaryEntry } from '@/lib/parse-diary-entry'
import { classifyDiaryEntry, validateJournalEntry, type DiaryJournalEntry, type JournalLine } from '@/lib/classify-diary-entry'

export type { DiaryJournalEntry, JournalLine }

export interface DiaryEntry {
  id: string
  entryDate: string
  entryType: 'income' | 'expense'
  rawText: string
  parsedAmount: number | null
  parsedCounterpart: string | null
  parsedCategory: string | null
  parsedDescription: string | null
  paymentMethod: string | null
  receiptPath: string | null
  matchedTransactionId: string | null
  createdAt: string
  journalEntry?: DiaryJournalEntry  // 분개 결과
}

export interface PaymentMethod {
  id: string
  methodType: string
  name: string
  details: string | null
}

export interface CreateDiaryResult {
  success: boolean
  error?: string
  entry?: DiaryEntry
}

/**
 * 금전일기장 항목 생성 (자연어 텍스트 + 선택적 영수증)
 */
export async function createDiaryEntry(formData: FormData): Promise<CreateDiaryResult> {
  try {
    const rawText = formData.get('text') as string
    const receiptFile = formData.get('receipt') as File | null

    if (!rawText?.trim()) {
      return { success: false, error: '내용을 입력해주세요.' }
    }

    const supabase = createAdminClient()
    const parsed = parseDiaryEntry(rawText)

    // 영수증 이미지 업로드
    let receiptPath: string | null = null
    if (receiptFile && receiptFile.size > 0) {
      const ext = receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const timestamp = Date.now()
      const path = `receipts/${timestamp}.${ext}`

      const buffer = await receiptFile.arrayBuffer()
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(path, buffer, {
          contentType: receiptFile.type || 'image/jpeg',
          upsert: false,
        })

      if (!storageError) {
        receiptPath = path
      }
    }

    // DB 삽입
    const { data, error } = await supabase
      .from('cash_diary')
      .insert({
        entry_date: parsed.date,
        raw_text: rawText.trim(),
        parsed_amount: parsed.amount,
        parsed_counterpart: parsed.counterpart,
        parsed_category: parsed.category,
        parsed_description: parsed.description,
        payment_method: parsed.paymentMethod,
        entry_type: parsed.type,
        receipt_path: receiptPath,
      })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: `저장 실패: ${error.message}` }
    }

    // 분개 생성
    const journalEntry = classifyDiaryEntry(parsed, rawText)
    const validation = validateJournalEntry(journalEntry)
    if (!validation.valid) {
      journalEntry.needsReview = true
    }

    const entry = mapRow(data)
    entry.journalEntry = journalEntry

    return { success: true, entry }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 후속질문 응답으로 항목 업데이트
 */
export async function updateDiaryFollowUp(
  id: string,
  updates: { counterpart?: string; category?: string; paymentMethod?: string; entryType?: 'income' | 'expense' }
): Promise<CreateDiaryResult> {
  try {
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (updates.counterpart) updateData.parsed_counterpart = updates.counterpart
    if (updates.category) updateData.parsed_category = updates.category
    if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod
    if (updates.entryType) updateData.entry_type = updates.entryType

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: '업데이트할 내용이 없습니다.' }
    }

    const { data, error } = await supabase
      .from('cash_diary')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: `업데이트 실패: ${error.message}` }
    }

    // 업데이트된 데이터로 재분류
    const entry = mapRow(data)
    const reparsed = parseDiaryEntry(entry.rawText)
    // 후속질문으로 업데이트된 필드 반영
    if (updates.category) reparsed.category = updates.category
    if (updates.paymentMethod) reparsed.paymentMethod = updates.paymentMethod
    const journalEntry = classifyDiaryEntry(reparsed, entry.rawText)
    entry.journalEntry = journalEntry

    return { success: true, entry }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 결제수단 목록 조회
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('payment_methods')
    .select('*')
    .order('sort_order', { ascending: true })

  return (data ?? []).map(row => ({
    id: String(row.id),
    methodType: String(row.method_type),
    name: String(row.name),
    details: row.details ? String(row.details) : null,
  }))
}

/**
 * 금전일기장 목록 조회
 */
export async function getDiaryEntries(limit = 50): Promise<DiaryEntry[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cash_diary')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapRow)
}

/**
 * 금전일기장 항목 삭제
 */
export async function deleteDiaryEntry(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 영수증 파일 삭제
    const { data: entry } = await supabase
      .from('cash_diary')
      .select('receipt_path')
      .eq('id', id)
      .single()

    if (entry?.receipt_path) {
      await supabase.storage.from('uploads').remove([entry.receipt_path])
    }

    const { error } = await supabase
      .from('cash_diary')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 영수증 다운로드 URL
 */
export async function getReceiptUrl(receiptPath: string): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(receiptPath, 3600)

    if (error) return { error: error.message }
    return { url: data.signedUrl }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '오류' }
  }
}

function mapRow(row: Record<string, unknown>): DiaryEntry {
  return {
    id: String(row.id),
    entryDate: String(row.entry_date),
    entryType: (row.entry_type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
    rawText: String(row.raw_text),
    parsedAmount: row.parsed_amount != null ? Number(row.parsed_amount) : null,
    parsedCounterpart: row.parsed_counterpart ? String(row.parsed_counterpart) : null,
    parsedCategory: row.parsed_category ? String(row.parsed_category) : null,
    parsedDescription: row.parsed_description ? String(row.parsed_description) : null,
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    receiptPath: row.receipt_path ? String(row.receipt_path) : null,
    matchedTransactionId: row.matched_transaction_id ? String(row.matched_transaction_id) : null,
    createdAt: String(row.created_at),
  }
}
