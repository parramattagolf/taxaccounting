import { getDiaryEntries, getPaymentMethods } from '@/actions/diary-actions'
import { DiaryClient } from './diary-client'

export const dynamic = 'force-dynamic'

export default async function DiaryPage() {
  const [entries, paymentMethods] = await Promise.all([
    getDiaryEntries(100),
    getPaymentMethods().catch(() => []),
  ])

  return (
    <>
      {/* 모바일: 전체화면 채팅 (헤더 포함) */}
      <div className="lg:hidden flex flex-col h-dvh">
        {/* 상단 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-divider)] bg-[var(--color-surface)]">
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">금전일기장</h1>
          <a
            href="/dashboard"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            세무회계
          </a>
        </div>
        <DiaryClient initialEntries={entries} paymentMethods={paymentMethods} mode="mobile" />
      </div>

      {/* 데스크탑: 표 뷰 (사이드바 없이) */}
      <div className="hidden lg:block p-6 max-w-5xl mx-auto">
        <DiaryClient initialEntries={entries} paymentMethods={paymentMethods} mode="desktop" />
      </div>
    </>
  )
}
