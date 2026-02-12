import { createAdminClient } from '@/utils/supabase/admin'
import { JournalToolbar, JournalTable } from './journal-client'

export const dynamic = 'force-dynamic'

export default async function JournalsPage() {
  let transactions: Record<string, unknown>[] = []
  let hasError = false

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_date, description, counterpart_name, counterpart_bank, withdrawal, deposit, balance, debit_account, credit_account, vat_deductible, ai_confidence, ai_reason, status')
      .order('transaction_date', { ascending: false })
      .limit(200)

    if (error) hasError = true
    if (data) transactions = data
  } catch {
    hasError = true
  }

  const pendingCount = transactions.filter(t => t.status === 'pending').length

  const typedTransactions = transactions.map(tx => ({
    id: String(tx.id),
    transaction_date: String(tx.transaction_date),
    description: String(tx.description ?? ''),
    counterpart_name: tx.counterpart_name ? String(tx.counterpart_name) : null,
    counterpart_bank: tx.counterpart_bank ? String(tx.counterpart_bank) : null,
    withdrawal: Number(tx.withdrawal) || 0,
    deposit: Number(tx.deposit) || 0,
    balance: Number(tx.balance) || 0,
    debit_account: tx.debit_account ? String(tx.debit_account) : null,
    credit_account: tx.credit_account ? String(tx.credit_account) : null,
    vat_deductible: tx.vat_deductible != null ? Boolean(tx.vat_deductible) : null,
    ai_confidence: tx.ai_confidence != null ? Number(tx.ai_confidence) : null,
    ai_reason: tx.ai_reason ? String(tx.ai_reason) : null,
    status: String(tx.status ?? 'pending'),
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        분개장
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-4">
        AI가 자동 분류한 거래 내역을 확인하고 수정할 수 있습니다.
      </p>

      {hasError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      )}

      <JournalToolbar pendingCount={pendingCount} />
      <JournalTable transactions={typedTransactions} />
    </div>
  )
}
