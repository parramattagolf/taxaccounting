'use client'

import { getDownloadUrl } from '@/actions/upload-actions'

interface Meta {
  id: string
  fileName: string
  fileType: string
  fileTypeLabel: string
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
  periodStart: string | null
  periodEnd: string | null
  totalWithdrawal: number
  totalDeposit: number
  rowCount: number
  fileSize: number
  storagePath: string | null
  createdAt: string
}

interface Transaction {
  seq: number
  transactionDate: string
  withdrawal: number
  deposit: number
  balance: number
  description: string
  counterpartAccount: string | null
  counterpartBank: string | null
  counterpartName: string | null
  memo: string | null
  transactionType: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const BANK_NAMES: Record<string, string> = {
  IBK: 'IBK 기업은행',
  KB: 'KB 국민은행',
  SHINHAN: '신한은행',
  WOORI: '우리은행',
  HANA: '하나은행',
}

export function DetailClient({ meta, transactions }: { meta: Meta; transactions: Transaction[] }) {
  const handleDownload = async () => {
    if (!meta.storagePath) return
    const res = await getDownloadUrl(meta.storagePath)
    if (res.url) {
      const a = document.createElement('a')
      a.href = res.url
      a.download = meta.fileName
      a.click()
    } else {
      alert(`다운로드 오류: ${res.error}`)
    }
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <a
          href="/upload/history"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          &larr; 이력
        </a>
        <span className="text-[var(--color-text-muted)]">/</span>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
          {meta.fileName}
        </h2>
      </div>

      {/* 원본 스타일 헤더 정보 (은행 거래내역 양식) */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] mb-6">
        {/* 제목 영역 */}
        <div className="px-6 py-4 border-b border-[var(--color-divider)] bg-[var(--color-surface-hover)]">
          <h3 className="text-lg font-bold text-center">
            {meta.fileTypeLabel}
            {meta.bankName && ` - ${BANK_NAMES[meta.bankName] || meta.bankName}`}
          </h3>
        </div>

        {/* 계좌 정보 */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b border-[var(--color-divider)]">
          {meta.accountNumber && (
            <div>
              <span className="text-[var(--color-text-muted)]">계좌번호</span>
              <p className="font-medium mt-0.5">{meta.accountNumber}</p>
            </div>
          )}
          {meta.accountHolder && (
            <div>
              <span className="text-[var(--color-text-muted)]">예금주명</span>
              <p className="font-medium mt-0.5">{meta.accountHolder}</p>
            </div>
          )}
          {meta.periodStart && meta.periodEnd && (
            <div>
              <span className="text-[var(--color-text-muted)]">조회기간</span>
              <p className="font-medium mt-0.5">{meta.periodStart} ~ {meta.periodEnd}</p>
            </div>
          )}
          <div>
            <span className="text-[var(--color-text-muted)]">거래건수</span>
            <p className="font-medium mt-0.5">{meta.rowCount}건</p>
          </div>
        </div>

        {/* 합계 */}
        <div className="px-6 py-3 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">업로드일시:</span>
            <span>{new Date(meta.createdAt).toLocaleString('ko-KR')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">파일크기:</span>
            <span>{formatFileSize(meta.fileSize)}</span>
          </div>
          {meta.storagePath && (
            <button
              onClick={handleDownload}
              className="ml-auto px-4 py-1.5 text-sm font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              원본 다운로드
            </button>
          )}
        </div>
      </div>

      {/* 거래 내역 테이블 (원본 양식 스타일) */}
      {transactions.length > 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] overflow-hidden">
          {/* 데스크탑 테이블 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-hover)] border-b-2 border-[var(--color-divider)]">
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--color-text-secondary)] w-12">번호</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--color-text-secondary)]">거래일시</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[var(--color-text-secondary)]">출금액</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[var(--color-text-secondary)]">입금액</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[var(--color-text-secondary)]">거래후잔액</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-text-secondary)]">거래내용</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-text-secondary)]">상대계좌번호</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-text-secondary)]">상대은행</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-text-secondary)]">메모</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--color-text-secondary)]">거래구분</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-text-secondary)]">상대예금주명</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={tx.seq}
                    className={`border-b border-[var(--color-divider)] ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{tx.seq}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">{formatDateTime(tx.transactionDate)}</td>
                    <td className="px-3 py-2 text-right font-medium text-red-600 whitespace-nowrap">
                      {tx.withdrawal > 0 ? tx.withdrawal.toLocaleString() : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-blue-600 whitespace-nowrap">
                      {tx.deposit > 0 ? tx.deposit.toLocaleString() : ''}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{tx.balance.toLocaleString()}</td>
                    <td className="px-3 py-2">{tx.description}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{tx.counterpartAccount || ''}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{tx.counterpartBank || ''}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{tx.memo || ''}</td>
                    <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{tx.transactionType || ''}</td>
                    <td className="px-3 py-2">{tx.counterpartName || ''}</td>
                  </tr>
                ))}
              </tbody>
              {/* 합계 행 */}
              <tfoot>
                <tr className="bg-[var(--color-surface-hover)] border-t-2 border-[var(--color-divider)] font-semibold">
                  <td colSpan={2} className="px-3 py-2.5 text-center">합계</td>
                  <td className="px-3 py-2.5 text-right text-red-600 whitespace-nowrap">
                    {meta.totalWithdrawal.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-600 whitespace-nowrap">
                    {meta.totalDeposit.toLocaleString()}
                  </td>
                  <td colSpan={7}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 모바일 카드 리스트 */}
          <div className="md:hidden">
            {/* 합계 바 */}
            <div className="px-4 py-3 bg-[var(--color-surface-hover)] border-b border-[var(--color-divider)] flex justify-between text-sm font-medium">
              <span>합계 {transactions.length}건</span>
              <div className="flex gap-4">
                <span className="text-red-600">출금 {meta.totalWithdrawal.toLocaleString()}</span>
                <span className="text-blue-600">입금 {meta.totalDeposit.toLocaleString()}</span>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-divider)]">
              {transactions.map((tx) => (
                <div key={tx.seq} className="px-4 py-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDateTime(tx.transactionDate)}
                        {tx.counterpartName && ` · ${tx.counterpartName}`}
                        {tx.transactionType && ` · ${tx.transactionType}`}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">#{tx.seq}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <div className="flex gap-3">
                      {tx.withdrawal > 0 && (
                        <span className="text-red-600 font-medium">-{tx.withdrawal.toLocaleString()}</span>
                      )}
                      {tx.deposit > 0 && (
                        <span className="text-blue-600 font-medium">+{tx.deposit.toLocaleString()}</span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">잔액 {tx.balance.toLocaleString()}</span>
                  </div>
                  {(tx.counterpartAccount || tx.memo) && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
                      {tx.counterpartAccount && <span>계좌 {tx.counterpartAccount}</span>}
                      {tx.counterpartAccount && tx.memo && <span> · </span>}
                      {tx.memo && <span>{tx.memo}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">이 파일에 연결된 거래 내역이 없습니다.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            (세금계산서, 급여내역, 영수증 등은 파싱 없이 원본 파일만 보관됩니다)
          </p>
        </div>
      )}
    </>
  )
}
