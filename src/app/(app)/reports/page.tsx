export default function ReportsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        재무제표
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        분개 데이터를 기반으로 생성된 재무제표를 확인합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard
          title="합계잔액시산표"
          description="계정과목별 차변/대변 잔액 합계"
        />
        <ReportCard
          title="재무상태표 (대차대조표)"
          description="자산, 부채, 자본의 현재 상태"
        />
        <ReportCard
          title="손익계산서"
          description="수익과 비용의 발생 현황"
        />
        <ReportCard
          title="부가세 신고서"
          description="매출세액 및 매입세액 요약"
        />
      </div>
    </div>
  )
}

function ReportCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">{description}</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        분개 데이터가 필요합니다.
      </p>
    </div>
  )
}
