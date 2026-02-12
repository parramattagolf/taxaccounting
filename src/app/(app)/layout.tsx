export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - 데스크탑 */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[var(--color-divider)] bg-[var(--color-surface)]">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-[var(--color-primary)]">세무회계</h1>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            <a href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              대시보드
            </a>
            <a href="/upload" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              자료 업로드
            </a>
            <a href="/upload/history" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] pl-7">
              업로드 이력
            </a>
            <a href="/diary" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              금전일기장
            </a>
            <a href="/journals" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              분개장
            </a>
            <a href="/reports" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              재무제표
            </a>
            <a href="/tax-filing" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
              세금 신고
            </a>
          </nav>
        </div>
      </aside>

      {/* 모바일 상단 헤더 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">세무회계</h1>
          <a href="/diary" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
            일기장
          </a>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0">
          {children}
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-divider)]">
        <div className="flex justify-around py-2">
          <a href="/dashboard" className="flex flex-col items-center px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <span>홈</span>
          </a>
          <a href="/upload" className="flex flex-col items-center px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <span>업로드</span>
          </a>
          <a href="/journals" className="flex flex-col items-center px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <span>분개장</span>
          </a>
          <a href="/reports" className="flex flex-col items-center px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <span>리포트</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
