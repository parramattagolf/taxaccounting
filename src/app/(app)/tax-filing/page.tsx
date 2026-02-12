export default function TaxFilingPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        세금 신고
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        완성된 장부를 기반으로 전자신고 파일을 생성합니다.
      </p>

      <div className="space-y-4">
        <TaxItem
          title="부가가치세"
          period="2026년 1기 (1월~6월)"
          deadline="2026-07-25"
          status="준비 중"
        />
        <TaxItem
          title="종합소득세"
          period="2025년 귀속"
          deadline="2026-05-31"
          status="준비 중"
        />
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          본 서비스의 결과물은 참고용이며, 최종 신고 책임은 납세자 본인에게 있습니다.
        </p>
      </div>
    </div>
  )
}

function TaxItem({ title, period, deadline, status }: {
  title: string; period: string; deadline: string; status: string
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-5 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{period}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">마감: {deadline}</p>
      </div>
      <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
        {status}
      </span>
    </div>
  )
}
