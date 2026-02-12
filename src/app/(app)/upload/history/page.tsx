import { createAdminClient } from '@/utils/supabase/admin'
import { HistoryClient } from './history-client'

export const dynamic = 'force-dynamic'

export default async function UploadHistoryPage() {
  let uploads: Record<string, unknown>[] = []
  let hasError = false

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('uploads')
      .select('id, file_name, file_type, bank_name, account_number, row_count, total_withdrawal, total_deposit, file_size, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) hasError = true
    if (data) uploads = data
  } catch {
    hasError = true
  }

  const typedUploads = uploads.map(u => ({
    id: String(u.id),
    fileName: String(u.file_name),
    fileType: String(u.file_type ?? 'bank_statement'),
    bankName: u.bank_name ? String(u.bank_name) : null,
    accountNumber: u.account_number ? String(u.account_number) : null,
    rowCount: Number(u.row_count) || 0,
    totalWithdrawal: Number(u.total_withdrawal) || 0,
    totalDeposit: Number(u.total_deposit) || 0,
    fileSize: Number(u.file_size) || 0,
    storagePath: u.storage_path ? String(u.storage_path) : null,
    createdAt: String(u.created_at),
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          업로드 이력
        </h2>
        <a
          href="/upload"
          className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]"
        >
          새 업로드
        </a>
      </div>
      <p className="text-[var(--color-text-secondary)] mb-6">
        업로드한 자료를 날짜·종류별로 관리하고 다시 다운로드할 수 있습니다.
      </p>

      {hasError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      )}

      <HistoryClient uploads={typedUploads} />
    </div>
  )
}
