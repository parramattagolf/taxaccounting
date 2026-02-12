import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      {/* 로고 영역 */}
      <div className="mb-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
            <path d="M8 10h8" />
            <path d="M8 14h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">세무회계</h1>
        <p className="text-sm text-gray-500 mt-1">AI 기반 세무회계 자동화</p>
      </div>

      {/* 로그인 버튼 */}
      <Link
        href="/diary"
        className="w-full max-w-xs px-6 py-4 text-center text-lg font-semibold text-white bg-[var(--color-primary)] rounded-2xl shadow-md hover:bg-[var(--color-primary-dark)] active:scale-[0.98] transition-all"
      >
        시작하기
      </Link>

      <p className="mt-4 text-xs text-gray-400">로그인 없이 바로 사용할 수 있습니다</p>
    </div>
  )
}
