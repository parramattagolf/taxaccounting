import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        대시보드
      </h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="이번 달 매출" value="₩0" color="income" />
        <SummaryCard title="이번 달 매입" value="₩0" color="expense" />
        <SummaryCard title="예상 부가세" value="₩0" color="debit" />
        <SummaryCard title="미분류 거래" value="0건" color="warning" />
      </div>

      {/* 최근 활동 */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-6">
        <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
        {user ? (
          <p className="text-[var(--color-text-secondary)]">
            자료를 업로드하여 자동 기장을 시작하세요.
          </p>
        ) : (
          <p className="text-[var(--color-text-secondary)]">
            로그인 후 이용할 수 있습니다.
          </p>
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
