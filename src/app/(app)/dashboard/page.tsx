import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let uploads: Record<string, unknown>[] = []
  let stats: Record<string, unknown>[] = []

  try {
    const supabase = createAdminClient()

    const { data: u } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    if (u) uploads = u

    const { data: s } = await supabase
      .from('transactions')
      .select('withdrawal, deposit, status')
    if (s) stats = s
  } catch {
    // DB not ready yet, show empty state
  }

  const totalWithdrawal = stats.reduce((sum, t) => sum + Number(t.withdrawal), 0)
  const totalDeposit = stats.reduce((sum, t) => sum + Number(t.deposit), 0)
  const pendingCount = stats.filter(t => t.status === 'pending').length
  const classifiedCount = stats.filter(t => t.status === 'classified').length
  const confirmedCount = stats.filter(t => t.status === 'confirmed').length
  const totalCount = stats.length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        대시보드
      </h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard title="총 입금" value={`₩${totalDeposit.toLocaleString()}`} color="income" />
        <SummaryCard title="총 출금" value={`₩${totalWithdrawal.toLocaleString()}`} color="expense" />
        <SummaryCard title="전체 거래" value={`${totalCount}건`} color="debit" />
        <SummaryCard title="미분류" value={`${pendingCount}건`} color="warning" />
        <SummaryCard title="분류완료" value={`${classifiedCount + confirmedCount}건`} color="income" />
      </div>

      {/* 최근 업로드 */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">최근 업로드</h3>
        {uploads.length > 0 ? (
          <div className="space-y-3">
            {uploads.map((u) => (
              <div key={String(u.id)} className="flex items-center justify-between py-2 border-b border-[var(--color-divider)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{String(u.file_name)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {String(u.bank_name)} · {String(u.account_number)} · {String(u.row_count)}건
                  </p>
                </div>
                <div className="text-right text-xs text-[var(--color-text-muted)]">
                  {new Date(String(u.created_at)).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[var(--color-text-muted)] mb-3">아직 업로드된 자료가 없습니다.</p>
            <a
              href="/upload"
              className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]"
            >
              자료 업로드하기
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    income: 'var(--color-income)',
    expense: 'var(--color-expense)',
    debit: 'var(--color-debit)',
    warning: 'var(--color-warning)',
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-5">
      <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: colorMap[color] }}>
        {value}
      </p>
    </div>
  )
}
