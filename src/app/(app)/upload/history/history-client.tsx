'use client'

import { useState, useTransition, useMemo } from 'react'
import { getDownloadUrl, deleteUpload, FILE_TYPE_LABELS, type FileType } from '@/actions/upload-actions'

interface Upload {
  id: string
  fileName: string
  fileType: string
  bankName: string | null
  accountNumber: string | null
  rowCount: number
  totalWithdrawal: number
  totalDeposit: number
  fileSize: number
  storagePath: string | null
  createdAt: string
}

const FILE_TYPE_ICONS: Record<string, string> = {
  bank_statement: '🏦',
  credit_card: '💳',
  tax_invoice: '📄',
  payroll: '💰',
  receipt: '🧾',
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryClient({ uploads }: { uploads: Upload[] }) {
  const [filterType, setFilterType] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (filterType === 'all') return uploads
    return uploads.filter(u => u.fileType === filterType)
  }, [uploads, filterType])

  // 날짜별 그루핑
  const grouped = useMemo(() => {
    const groups: Record<string, Upload[]> = {}
    for (const u of filtered) {
      const date = formatDate(u.createdAt)
      if (!groups[date]) groups[date] = []
      groups[date].push(u)
    }
    return groups
  }, [filtered])

  const handleDownload = async (storagePath: string, fileName: string) => {
    const res = await getDownloadUrl(storagePath)
    if (res.url) {
      const a = document.createElement('a')
      a.href = res.url
      a.download = fileName
      a.click()
    } else {
      alert(`다운로드 오류: ${res.error}`)
    }
  }

  const handleDelete = (id: string, fileName: string) => {
    if (!confirm(`"${fileName}"을(를) 삭제하시겠습니까?\n연결된 거래 내역도 함께 삭제됩니다.`)) return
    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteUpload(id)
      if (res.success) {
        window.location.reload()
      } else {
        alert(`삭제 실패: ${res.error}`)
      }
      setDeletingId(null)
    })
  }

  // 유형별 건수 계산
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: uploads.length }
    for (const u of uploads) {
      counts[u.fileType] = (counts[u.fileType] || 0) + 1
    }
    return counts
  }, [uploads])

  return (
    <>
      {/* 유형 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterButton
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
          label="전체"
          count={typeCounts.all}
        />
        {(Object.entries(FILE_TYPE_LABELS) as [FileType, string][]).map(([key, label]) => (
          typeCounts[key] ? (
            <FilterButton
              key={key}
              active={filterType === key}
              onClick={() => setFilterType(key)}
              label={label}
              count={typeCounts[key]}
            />
          ) : null
        ))}
      </div>

      {/* 리스트 */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-12 text-center">
          <p className="text-[var(--color-text-muted)] mb-3">업로드된 자료가 없습니다.</p>
          <a
            href="/upload"
            className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]"
          >
            자료 업로드하기
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{date}</h3>
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] divide-y divide-[var(--color-divider)]">
                {items.map((u) => (
                  <div key={u.id} className="p-4 hover:bg-[var(--color-surface-hover)] transition-colors">
                    {/* 데스크탑 */}
                    <div className="hidden md:flex items-center gap-4">
                      <a href={`/upload/history/${u.id}`} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                        <span className="text-2xl" title={FILE_TYPE_LABELS[u.fileType as FileType] || u.fileType}>
                          {FILE_TYPE_ICONS[u.fileType] || '📁'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate hover:text-[var(--color-primary)]">{u.fileName}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {FILE_TYPE_LABELS[u.fileType as FileType] || u.fileType}
                            {u.bankName && ` · ${u.bankName}`}
                            {u.accountNumber && ` · ${u.accountNumber}`}
                            {u.rowCount > 0 && ` · ${u.rowCount}건`}
                            {` · ${formatFileSize(u.fileSize)}`}
                          </p>
                        </div>
                      </a>
                      {u.totalWithdrawal > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">출금</p>
                          <p className="text-sm font-medium text-red-600">₩{u.totalWithdrawal.toLocaleString()}</p>
                        </div>
                      )}
                      {u.totalDeposit > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">입금</p>
                          <p className="text-sm font-medium text-blue-600">₩{u.totalDeposit.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                        {formatDateTime(u.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        {u.storagePath && (
                          <button
                            onClick={() => handleDownload(u.storagePath!, u.fileName)}
                            className="px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100"
                          >
                            다운로드
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id, u.fileName)}
                          disabled={isPending && deletingId === u.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                          {isPending && deletingId === u.id ? '삭제중...' : '삭제'}
                        </button>
                      </div>
                    </div>

                    {/* 모바일 */}
                    <div className="md:hidden">
                      <a href={`/upload/history/${u.id}`} className="flex items-start gap-3 mb-2">
                        <span className="text-xl">{FILE_TYPE_ICONS[u.fileType] || '📁'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate hover:text-[var(--color-primary)]">{u.fileName}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {FILE_TYPE_LABELS[u.fileType as FileType] || u.fileType}
                            {u.bankName && ` · ${u.bankName}`}
                            {u.rowCount > 0 && ` · ${u.rowCount}건`}
                          </p>
                        </div>
                      </a>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 text-xs">
                          {u.totalWithdrawal > 0 && (
                            <span className="text-red-600 font-medium">출금 ₩{u.totalWithdrawal.toLocaleString()}</span>
                          )}
                          {u.totalDeposit > 0 && (
                            <span className="text-blue-600 font-medium">입금 ₩{u.totalDeposit.toLocaleString()}</span>
                          )}
                          <span className="text-[var(--color-text-muted)]">{formatFileSize(u.fileSize)}</span>
                        </div>
                        <div className="flex gap-2">
                          {u.storagePath && (
                            <button
                              onClick={() => handleDownload(u.storagePath!, u.fileName)}
                              className="px-2 py-1 text-xs text-[var(--color-primary)] bg-blue-50 rounded"
                            >
                              다운로드
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u.id, u.fileName)}
                            disabled={isPending && deletingId === u.id}
                            className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function FilterButton({ active, onClick, label, count }: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-divider)] hover:border-[var(--color-primary-light)]'
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  )
}
