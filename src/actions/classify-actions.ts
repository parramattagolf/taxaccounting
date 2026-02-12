'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { classifyTransaction } from '@/lib/classify-transaction'
import { ACCOUNTS } from '@/lib/chart-of-accounts'

export interface ClassifyResult {
  success: boolean
  error?: string
  classifiedCount?: number
  totalCount?: number
}

/**
 * pending 상태의 거래를 일괄 자동 분류
 */
export async function classifyPendingTransactions(): Promise<ClassifyResult> {
  try {
    const supabase = createAdminClient()

    // pending 상태 거래 조회
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, withdrawal, deposit, description, counterpart_name, counterpart_bank, transaction_type, memo')
      .eq('status', 'pending')
      .limit(500)

    if (fetchError) {
      return { success: false, error: `조회 실패: ${fetchError.message}` }
    }

    if (!transactions || transactions.length === 0) {
      return { success: true, classifiedCount: 0, totalCount: 0 }
    }

    // 각 거래 분류
    let classifiedCount = 0
    for (const tx of transactions) {
      const result = classifyTransaction({
        withdrawal: Number(tx.withdrawal) || 0,
        deposit: Number(tx.deposit) || 0,
        description: tx.description ?? '',
        counterpartName: tx.counterpart_name,
        counterpartBank: tx.counterpart_bank,
        transactionType: tx.transaction_type,
        memo: tx.memo,
      })

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          debit_account: result.debitAccount,
          credit_account: result.creditAccount,
          vat_deductible: result.vatDeductible,
          ai_confidence: result.confidence,
          ai_reason: result.reason,
          status: 'classified',
        })
        .eq('id', tx.id)

      if (!updateError) classifiedCount++
    }

    return {
      success: true,
      classifiedCount,
      totalCount: transactions.length,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return { success: false, error: message }
  }
}

/**
 * 개별 거래 확인 (confirmed)
 */
export async function confirmTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'confirmed' })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 개별 거래 거부 (rejected) → pending으로 되돌림
 */
export async function rejectTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 분개 수동 수정
 */
export async function updateJournalEntry(
  id: string,
  debitAccount: string,
  creditAccount: string,
  vatDeductible: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('transactions')
      .update({
        debit_account: debitAccount,
        credit_account: creditAccount,
        vat_deductible: vatDeductible,
        ai_reason: '수동 수정',
        ai_confidence: 1.0,
        status: 'confirmed',
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '오류' }
  }
}

/**
 * 계정과목 목록 반환 (클라이언트에서 사용)
 */
export async function getAccountList() {
  return ACCOUNTS.map(a => ({ code: a.code, name: a.name, category: a.category }))
}
