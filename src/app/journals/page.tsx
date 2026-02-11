export default function JournalsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        분개장
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        AI가 자동 분류한 거래 내역을 확인하고 수정할 수 있습니다.
      </p>

      {/* 분개 테이블 */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-divider)] bg-[var(--color-surface-hover)]">
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">날짜</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">적요</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">차변</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">대변</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">금액</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                자료를 업로드하면 AI가 자동으로 분개합니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
