'use client'

import { useState, useTransition } from 'react'
import {
  classifyPendingTransactions,
  confirmTransaction,
  rejectTransaction,
  updateJournalEntry,
} from '@/actions/classify-actions'
import { ACCOUNTS } from '@/lib/chart-of-accounts'

interface Transaction {
  id: string
  transaction_date: string
  description: string
  counterpart_name: string | null
  counterpart_bank: string | null
  withdrawal: number
  deposit: number
  balance: number
  debit_account: string | null
  credit_account: string | null
  vat_deductible: boolean | null
  ai_confidence: number | null
  ai_reason: string | null
  status: string
}

export function JournalToolbar({ pendingCount }: { pendingCount: number }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  const handleClassify = () => {
    startTransition(async () => {
      const res = await classifyPendingTransactions()
      if (res.success) {
        setResult(`${res.classifiedCount}건 분류 완료`)
        // 페이지 새로고침으로 결과 반영
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setResult(`오류: ${res.error}`)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <button
        onClick={handleClassify}
        disabled={isPending || pendingCount === 0}
        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? '분류 중...' : `자동 분개 실행 (${pendingCount}건)`}
      </button>
      <div className="flex gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">미분류 {pendingCount}</span>
      </div>
      {result && (
        <span className="text-sm text-[var(--color-text-secondary)]">{result}</span>
      )}
    </div>
  )
}

export function JournalTable({ transactions }: { transactions: Transaction[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] overflow-hidden">
      {/* 데스크탑 테이블 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-divider)] bg-[var(--color-surface-hover)]">
              <th className="text-left px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">날짜</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">적요</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">거래처</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">출금</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">입금</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">차변</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">대변</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">부가세</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">확신도</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">상태</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-secondary)]">작업</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map((tx) => (
              editingId === tx.id ? (
                <EditRow key={tx.id} tx={tx} onClose={() => setEditingId(null)} />
              ) : (
                <tr key={tx.id} className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                  <td className="px-3 py-2.5 text-sm max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                  <td className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)] max-w-[120px] truncate">
                    {tx.counterpart_name || tx.counterpart_bank || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-right text-red-600 font-medium whitespace-nowrap">
                    {tx.withdrawal > 0 ? `₩${tx.withdrawal.toLocaleString()}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-right text-blue-600 font-medium whitespace-nowrap">
                    {tx.deposit > 0 ? `₩${tx.deposit.toLocaleString()}` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    {tx.debit_account ? (
                      <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                        {tx.debit_account}
                      </span>
                    ) : <span className="text-[var(--color-text-muted)]">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    {tx.credit_account ? (
                      <span className="inline-block px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-xs font-medium">
                        {tx.credit_account}
                      </span>
                    ) : <span className="text-[var(--color-text-muted)]">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {tx.vat_deductible != null && (
                      <span className={`text-xs ${tx.vat_deductible ? 'text-green-600' : 'text-[var(--color-text-muted)]'}`}>
                        {tx.vat_deductible ? '공제' : '불공제'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {tx.ai_confidence != null && (
                      <ConfidenceBadge value={tx.ai_confidence} reason={tx.ai_reason} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ActionButtons tx={tx} onEdit={() => setEditingId(tx.id)} />
                  </td>
                </tr>
              )
            )) : (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                  자료를 업로드하면 여기에 거래 내역이 표시됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 리스트 */}
      <div className="lg:hidden divide-y divide-[var(--color-divider)]">
        {transactions.length > 0 ? transactions.map((tx) => (
          <MobileCard key={tx.id} tx={tx} />
        )) : (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            자료를 업로드하면 여기에 거래 내역이 표시됩니다.
          </div>
        )}
      </div>
    </div>
  )
}

function MobileCard({ tx }: { tx: Transaction }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(tx.status)

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await confirmTransaction(tx.id)
      if (res.success) setStatus('confirmed')
    })
  }
  const handleReject = () => {
    startTransition(async () => {
      const res = await rejectTransaction(tx.id)
      if (res.success) setStatus('rejected')
    })
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <span className="text-sm font-medium">{tx.description}</span>
        <StatusBadge status={status} />
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mb-2">
        {formatDate(tx.transaction_date)}
        {tx.counterpart_name && ` · ${tx.counterpart_name}`}
      </div>
      <div className="flex justify-between text-sm mb-2">
        {tx.withdrawal > 0 && (
          <span className="text-red-600 font-medium">-₩{tx.withdrawal.toLocaleString()}</span>
        )}
        {tx.deposit > 0 && (
          <span className="text-blue-600 font-medium">+₩{tx.deposit.toLocaleString()}</span>
        )}
      </div>
      {tx.debit_account && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded font-medium">{tx.debit_account}</span>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded font-medium">{tx.credit_account}</span>
          {tx.vat_deductible && <span className="text-green-600">공제</span>}
        </div>
      )}
      {tx.ai_reason && (
        <p className="text-xs text-[var(--color-text-muted)] mb-2">{tx.ai_reason}</p>
      )}
      {status === 'classified' && (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            확인
          </button>
          <button
            onClick={handleReject}
            disabled={isPending}
            className="flex-1 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            거부
          </button>
        </div>
      )}
    </div>
  )
}

function EditRow({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const [debit, setDebit] = useState(tx.debit_account ?? '')
  const [credit, setCredit] = useState(tx.credit_account ?? '')
  const [vat, setVat] = useState(tx.vat_deductible ?? false)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateJournalEntry(tx.id, debit, credit, vat)
      if (res.success) {
        window.location.reload()
      }
    })
  }

  const accountOptions = ACCOUNTS.map(a => a.name)

  return (
    <tr className="border-b border-[var(--color-divider)] bg-blue-50/50">
      <td className="px-3 py-2 text-sm whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
      <td className="px-3 py-2 text-sm">{tx.description}</td>
      <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">
        {tx.counterpart_name || '-'}
      </td>
      <td className="px-3 py-2 text-sm text-right text-red-600 font-medium">
        {tx.withdrawal > 0 ? `₩${tx.withdrawal.toLocaleString()}` : ''}
      </td>
      <td className="px-3 py-2 text-sm text-right text-blue-600 font-medium">
        {tx.deposit > 0 ? `₩${tx.deposit.toLocaleString()}` : ''}
      </td>
      <td className="px-3 py-2">
        <select
          value={debit}
          onChange={e => setDebit(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded border border-[var(--color-divider)] bg-white"
        >
          <option value="">선택</option>
          {accountOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={credit}
          onChange={e => setCredit(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded border border-[var(--color-divider)] bg-white"
        >
          <option value="">선택</option>
          {accountOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={vat}
          onChange={e => setVat(e.target.checked)}
          className="w-4 h-4"
        />
      </td>
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={isPending || !debit || !credit}
            className="px-2 py-1 text-xs font-medium text-white bg-[var(--color-primary)] rounded hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] bg-gray-100 rounded hover:bg-gray-200"
          >
            취소
          </button>
        </div>
      </td>
    </tr>
  )
}

function ActionButtons({ tx, onEdit }: { tx: Transaction; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(tx.status)

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await confirmTransaction(tx.id)
      if (res.success) setCurrentStatus('confirmed')
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const res = await rejectTransaction(tx.id)
      if (res.success) setCurrentStatus('rejected')
    })
  }

  if (currentStatus === 'pending') {
    return <span className="text-xs text-[var(--color-text-muted)]">분류 필요</span>
  }

  if (currentStatus === 'confirmed') {
    return (
      <button
        onClick={onEdit}
        className="text-xs text-[var(--color-primary)] hover:underline"
      >
        수정
      </button>
    )
  }

  return (
    <div className="flex gap-1 justify-center">
      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
        title="확인"
      >
        ✓
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
        title="거부"
      >
        ✗
      </button>
      <button
        onClick={onEdit}
        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
        title="수정"
      >
        ✎
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    classified: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    pending: '미분류',
    classified: 'AI분류',
    confirmed: '확인완료',
    rejected: '거부',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

function ConfidenceBadge({ value, reason }: { value: number; reason: string | null }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
  return (
    <span className={`text-xs font-medium ${color} cursor-help`} title={reason || ''}>
      {pct}%
    </span>
  )
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
