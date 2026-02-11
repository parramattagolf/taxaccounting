import { createClient } from '@/utils/supabase/server'

export default async function JournalsPage() {
  const supabase = await createClient()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(100)

  const hasData = !error && transactions && transactions.length > 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        분개장
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        AI가 자동 분류한 거래 내역을 확인하고 수정할 수 있습니다.
      </p>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] overflow-hidden">
        {/* 데스크탑 테이블 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-divider)] bg-[var(--color-surface-hover)]">
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">날짜</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">적요</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">거래처</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">출금</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">입금</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">잔액</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">상태</th>
              </tr>
            </thead>
            <tbody>
              {hasData ? transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="px-4 py-3 text-sm">{tx.description}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    {tx.counterpart_name || tx.counterpart_bank || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                    {tx.withdrawal > 0 ? `₩${Number(tx.withdrawal).toLocaleString()}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                    {tx.deposit > 0 ? `₩${Number(tx.deposit).toLocaleString()}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-[var(--color-text-secondary)]">
                    ₩{Number(tx.balance).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    {error
                      ? '데이터를 불러올 수 없습니다. DB 테이블을 먼저 생성해주세요.'
                      : '자료를 업로드하면 여기에 거래 내역이 표시됩니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 리스트 */}
        <div className="md:hidden divide-y divide-[var(--color-divider)]">
          {hasData ? transactions.map((tx) => (
            <div key={tx.id} className="p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium">{tx.description}</span>
                <StatusBadge status={tx.status} />
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">
                {formatDate(tx.transaction_date)}
                {tx.counterpart_name && ` · ${tx.counterpart_name}`}
              </div>
              <div className="flex justify-between text-sm">
                {tx.withdrawal > 0 && (
                  <span className="text-red-600 font-medium">
                    -₩{Number(tx.withdrawal).toLocaleString()}
                  </span>
                )}
                {tx.deposit > 0 && (
                  <span className="text-blue-600 font-medium">
                    +₩{Number(tx.deposit).toLocaleString()}
                  </span>
                )}
                <span className="text-[var(--color-text-muted)]">
                  잔액 ₩{Number(tx.balance).toLocaleString()}
                </span>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
              자료를 업로드하면 여기에 거래 내역이 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    classified: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    pending: '미분류',
    classified: 'AI분류',
    confirmed: '확인완료',
    rejected: '거부',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}
