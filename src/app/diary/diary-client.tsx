'use client'

import { useState, useRef, useTransition, useMemo, useEffect, useCallback } from 'react'
import {
  createDiaryEntry,
  deleteDiaryEntry,
  updateDiaryFollowUp,
  getReceiptUrl,
  type DiaryEntry,
  type DiaryJournalEntry,
  type PaymentMethod,
} from '@/actions/diary-actions'

const CATEGORY_COLORS: Record<string, string> = {
  // 지출 카테고리
  '식사': 'bg-orange-100 text-orange-700',
  '교통': 'bg-blue-100 text-blue-700',
  '주유': 'bg-purple-100 text-purple-700',
  '사무용품': 'bg-teal-100 text-teal-700',
  '경조사': 'bg-pink-100 text-pink-700',
  '접대': 'bg-red-100 text-red-700',
  '교육': 'bg-indigo-100 text-indigo-700',
  '광고': 'bg-yellow-100 text-yellow-700',
  '임대': 'bg-gray-100 text-gray-700',
  '보험': 'bg-emerald-100 text-emerald-700',
  '통신': 'bg-cyan-100 text-cyan-700',
  '수리': 'bg-amber-100 text-amber-700',
  '배송': 'bg-lime-100 text-lime-700',
  '구매': 'bg-violet-100 text-violet-700',
  // 수입 카테고리
  '매출': 'bg-blue-100 text-blue-700',
  '급여': 'bg-emerald-100 text-emerald-700',
  '이자': 'bg-sky-100 text-sky-700',
  '배당': 'bg-indigo-100 text-indigo-700',
  '환급': 'bg-teal-100 text-teal-700',
  '용역': 'bg-cyan-100 text-cyan-700',
  '정산': 'bg-slate-100 text-slate-700',
  '임대수입': 'bg-purple-100 text-purple-700',
}

const EXPENSE_CATEGORIES = ['식사', '교통', '접대', '사무용품', '경조사', '교육', '광고', '구매']
const INCOME_CATEGORIES = ['매출', '급여', '용역', '이자', '배당', '환급', '정산', '임대수입']

/* ─── 후속질문 상태 타입 ─── */
interface FollowUp {
  entryId: string
  entryType: 'income' | 'expense'
  needs: ('debitAccount' | 'paymentMethod')[]  // 분개에 필요한 누락 정보만
  selectedPayment: string | null
  selectedCategory: string | null
  journalEntry?: DiaryJournalEntry
}

/* ─── 분개 기반 후속질문 필요 여부 판단 ─── */
function shouldFollowUp(entry: DiaryEntry): FollowUp | null {
  const journal = entry.journalEntry
  // 분개 confidence >= 0.7 → 후속질문 불필요
  if (journal && !journal.needsReview && journal.confidence >= 0.7) return null

  const needs: FollowUp['needs'] = []

  // 차변 계정 불확실 → 용도 질문
  if (!journal || journal.confidence < 0.5) {
    needs.push('debitAccount')
  }
  // 결제수단 모름 → 결제수단 질문
  if (!entry.paymentMethod) {
    needs.push('paymentMethod')
  }

  if (needs.length === 0) return null

  return {
    entryId: entry.id,
    entryType: entry.entryType,
    needs,
    selectedPayment: null,
    selectedCategory: null,
    journalEntry: journal,
  }
}

/* ─── 후속질문 텍스트 생성 ─── */
function generateQuestion(needs: FollowUp['needs'], entryType: 'income' | 'expense'): string {
  const parts: string[] = []
  const isIncome = entryType === 'income'

  if (needs.includes('debitAccount')) {
    parts.push(isIncome ? '어떤 종류의 수입인가요?' : '어떤 용도의 지출인가요?')
  }
  if (needs.includes('paymentMethod')) {
    parts.push(isIncome ? '어떻게 받았어요?' : '어떻게 결제했어요?')
  }

  return parts.join(' ')
}

/* ─── 후속답변에서 상대방 파싱 (조사 제거) ─── */
function cleanCounterpart(text: string): string {
  return text
    .replace(/(이?랑|과|와|하고|에서|에게|한테|이랑요?|로부터|에게서)\s*$/g, '')
    .replace(/^(이?랑|과|와|하고|에서)\s*/g, '')
    .trim()
}

export function DiaryClient({
  initialEntries,
  paymentMethods,
  mode,
}: {
  initialEntries: DiaryEntry[]
  paymentMethods: PaymentMethod[]
  mode: 'mobile' | 'desktop'
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [text, setText] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [followUp, setFollowUp] = useState<FollowUp | null>(null)

  // 채팅 스크롤 하단 유지
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, followUp])

  // 새 항목 생성 후 분개 기반 후속질문 체크
  const checkAndSetFollowUp = useCallback((entry: DiaryEntry) => {
    const fu = shouldFollowUp(entry)
    setFollowUp(fu)
  }, [])

  const handleSubmit = () => {
    if (!text.trim() && !followUp) return

    // 후속질문 모드
    if (followUp) {
      handleFollowUpSubmit()
      return
    }

    // 새 항목 생성
    startTransition(async () => {
      const formData = new FormData()
      formData.append('text', text)
      if (receiptFile) formData.append('receipt', receiptFile)

      const result = await createDiaryEntry(formData)
      if (result.success && result.entry) {
        setEntries(prev => [...prev, result.entry!])
        setText('')
        setReceiptFile(null)
        setReceiptPreview(null)
        inputRef.current?.focus()
        checkAndSetFollowUp(result.entry)
      }
    })
  }

  const handleFollowUpSubmit = () => {
    if (!followUp) return
    if (!text.trim() && !followUp.selectedPayment && !followUp.selectedCategory) return

    startTransition(async () => {
      const updates: { counterpart?: string; category?: string; paymentMethod?: string } = {}

      // 텍스트 답변 → 상대방 정보로 처리
      if (text.trim()) {
        const cleaned = cleanCounterpart(text.trim())
        if (cleaned) updates.counterpart = cleaned
      }

      if (followUp.selectedPayment) updates.paymentMethod = followUp.selectedPayment
      if (followUp.selectedCategory) updates.category = followUp.selectedCategory

      if (Object.keys(updates).length === 0) return

      const result = await updateDiaryFollowUp(followUp.entryId, updates)
      if (result.success && result.entry) {
        setEntries(prev => prev.map(e => e.id === followUp.entryId ? result.entry! : e))
        setText('')

        // 재분류 후 아직 후속질문 필요한지 체크
        const fu = shouldFollowUp(result.entry)
        setFollowUp(fu)
        inputRef.current?.focus()
      }
    })
  }

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    startTransition(async () => {
      const res = await deleteDiaryEntry(id)
      if (res.success) {
        setEntries(prev => prev.filter(e => e.id !== id))
        if (followUp?.entryId === id) setFollowUp(null)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 날짜별 그루핑 (시간순 정렬)
  const grouped = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const groups: { date: string; items: DiaryEntry[] }[] = []
    for (const entry of sorted) {
      const date = entry.entryDate
      const last = groups[groups.length - 1]
      if (last && last.date === date) {
        last.items.push(entry)
      } else {
        groups.push({ date, items: [entry] })
      }
    }
    return groups
  }, [entries])

  // 역순 (데스크탑 테이블용)
  const entriesDesc = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries]
  )

  if (mode === 'desktop') {
    return <DesktopView entries={entriesDesc} text={text} setText={setText} receiptPreview={receiptPreview} removeReceipt={removeReceipt} fileInputRef={fileInputRef} handleReceiptSelect={handleReceiptSelect} handleSubmit={handleSubmit} handleDelete={handleDelete} isPending={isPending} />
  }

  // ─── 후속질문 모드에서의 placeholder
  const inputPlaceholder = followUp
    ? '추가 정보를 입력하세요'
    : '거래 내용을 입력하세요'

  // ─── 전송 가능 여부
  const canSend = followUp
    ? (text.trim() || followUp.selectedPayment || followUp.selectedCategory)
    : text.trim()

  return (
    <>
      {/* ═══════ 모바일: 카카오톡 스타일 ═══════ */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-[var(--color-text-muted)]">
                <p className="text-base mb-1">금전일기장</p>
                <p className="text-sm">거래 내용을 메시지처럼 입력하세요</p>
              </div>
            </div>
          ) : (
            grouped.map(({ date, items }) => (
              <div key={date}>
                {/* 날짜 구분선 */}
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs rounded-full">
                    {formatDateLabel(date)}
                  </span>
                </div>
                {/* 메시지들 */}
                {items.map((entry) => (
                  <ChatBubble key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            ))
          )}

          {/* ═══ 봇: 분개 결과 (항상 표시) + 후속질문 (필요시) ═══ */}
          {(() => {
            const lastEntry = entries[entries.length - 1]
            if (lastEntry?.journalEntry && lastEntry.journalEntry.lines.length > 0) {
              return <JournalPreview entry={lastEntry} />
            }
            return null
          })()}
          {followUp && (
            <BotFollowUp
              followUp={followUp}
              paymentMethods={paymentMethods}
              onSelectPayment={(name) =>
                setFollowUp(prev => prev ? { ...prev, selectedPayment: prev.selectedPayment === name ? null : name } : null)
              }
              onSelectCategory={(cat) =>
                setFollowUp(prev => prev ? { ...prev, selectedCategory: prev.selectedCategory === cat ? null : cat } : null)
              }
            />
          )}

          <div ref={chatEndRef} />
        </div>

        {/* 영수증 미리보기 바 */}
        {receiptPreview && !followUp && (
          <div className="px-3 py-2 border-t border-[var(--color-divider)] bg-[var(--color-surface)]">
            <div className="relative inline-block">
              <img src={receiptPreview} alt="영수증" className="h-16 rounded-lg border border-[var(--color-divider)]" />
              <button
                onClick={removeReceipt}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* 입력 바 */}
        <div className="border-t border-[var(--color-divider)] bg-[var(--color-surface)] px-3 py-2">
          <div className="flex items-end gap-2">
            {/* 카메라/사진 버튼 (후속질문 모드에서는 숨김) */}
            {!followUp && (
              <label className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface-hover)] cursor-pointer hover:bg-gray-200 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-muted)]">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleReceiptSelect}
                />
              </label>
            )}

            {/* 후속질문 모드 건너뛰기 버튼 */}
            {followUp && (
              <button
                onClick={() => setFollowUp(null)}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:bg-gray-200 transition-colors text-xs"
                title="건너뛰기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}

            {/* 텍스트 입력 */}
            <div className="flex-1 bg-[var(--color-surface-hover)] rounded-2xl px-4 py-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                rows={1}
                className="w-full resize-none bg-transparent text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none max-h-20"
                style={{ minHeight: '1.25rem' }}
              />
            </div>

            {/* 전송 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isPending || !canSend}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:opacity-40 transition-colors"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

    </>
  )
}

/* ─── 봇: 분개 결과 미리보기 ─── */
function JournalPreview({ entry }: { entry: DiaryEntry }) {
  const journal = entry.journalEntry
  if (!journal || journal.lines.length === 0) return null

  const debitLines = journal.lines.filter(l => l.debit > 0)
  const creditLines = journal.lines.filter(l => l.credit > 0)

  return (
    <div className="flex justify-start mb-2 mt-2">
      <div className="max-w-[85%]">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
              <path d="M8 10h8"/>
              <path d="M8 14h4"/>
            </svg>
          </div>
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-3 border border-gray-200 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">분개 처리됨</p>
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pr-3 pb-1 font-medium">계정</th>
                  <th className="text-right pr-3 pb-1 font-medium">차변</th>
                  <th className="text-right pb-1 font-medium">대변</th>
                </tr>
              </thead>
              <tbody>
                {debitLines.map((l, i) => (
                  <tr key={`d-${i}`}>
                    <td className="pr-3 py-0.5 text-gray-900">{l.account}</td>
                    <td className="pr-3 py-0.5 text-right text-blue-700 font-medium">{l.debit.toLocaleString()}</td>
                    <td className="py-0.5"></td>
                  </tr>
                ))}
                {creditLines.map((l, i) => (
                  <tr key={`c-${i}`}>
                    <td className="pr-3 py-0.5 text-gray-900 pl-3">{l.account}</td>
                    <td className="pr-3 py-0.5"></td>
                    <td className="py-0.5 text-right text-red-600 font-medium">{l.credit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {journal.confidence < 0.8 && (
              <p className="text-[10px] text-amber-600 mt-2">
                확신도 {Math.round(journal.confidence * 100)}% — {journal.reason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── 봇 후속질문 말풍선 ─── */
function BotFollowUp({
  followUp,
  paymentMethods,
  onSelectPayment,
  onSelectCategory,
}: {
  followUp: FollowUp
  paymentMethods: PaymentMethod[]
  onSelectPayment: (name: string) => void
  onSelectCategory: (cat: string) => void
}) {
  const question = generateQuestion(followUp.needs, followUp.entryType)
  const showPayment = followUp.needs.includes('paymentMethod')
  const showAccount = followUp.needs.includes('debitAccount')
  const categoryOptions = followUp.entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="flex justify-start mb-2 mt-2">
      <div className="max-w-[85%]">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
              <path d="M8 10h8"/>
              <path d="M8 14h4"/>
            </svg>
          </div>
          <div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-gray-200 shadow-sm">
              <p className="text-sm leading-relaxed text-gray-900">{question}</p>
            </div>

            {showPayment && paymentMethods.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-[var(--color-text-muted)] mb-1 ml-1">
                  {followUp.entryType === 'income' ? '입금 방법' : '결제 방법'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onSelectPayment(m.name)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        followUp.selectedPayment === m.name
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showAccount && (
              <div className="mt-2">
                <p className="text-[10px] text-[var(--color-text-muted)] mb-1 ml-1">
                  {followUp.entryType === 'income' ? '수입 종류' : '용도'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => onSelectCategory(cat)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        followUp.selectedCategory === cat
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── 모바일: 채팅 말풍선 ─── */
function ChatBubble({ entry, onDelete }: { entry: DiaryEntry; onDelete: (id: string) => void }) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const isIncome = entry.entryType === 'income'
  const bubbleColor = isIncome ? 'bg-[#DCFCE7]' : 'bg-[#FEE500]'

  const handleViewReceipt = async () => {
    if (receiptUrl) { setShowReceipt(!showReceipt); return }
    if (!entry.receiptPath) return
    const res = await getReceiptUrl(entry.receiptPath)
    if (res.url) { setReceiptUrl(res.url); setShowReceipt(true) }
  }

  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-[85%]">
        {/* 시간 + 말풍선 */}
        <div className="flex items-end gap-1.5 justify-end">
          <span className="text-[10px] text-[var(--color-text-muted)] mb-0.5">
            {new Date(entry.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div
            className={`${bubbleColor} rounded-2xl rounded-tr-sm px-3.5 py-2.5 relative`}
            onClick={() => setShowMenu(!showMenu)}
          >
            <p className="text-sm leading-relaxed text-gray-900">{entry.rawText}</p>
          </div>
        </div>

        {/* 파싱 결과 태그 */}
        <div className="flex flex-wrap gap-1 mt-1 justify-end pr-1">
          {/* 수입/지출 구분 태그 */}
          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
            isIncome ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
          }`}>
            {isIncome ? '수입' : '지출'}
          </span>
          {entry.parsedAmount != null && (
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
              isIncome ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
            }`}>
              {isIncome ? '+' : '-'}{entry.parsedAmount.toLocaleString()}원
            </span>
          )}
          {entry.parsedCategory && (
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${CATEGORY_COLORS[entry.parsedCategory] || 'bg-gray-100 text-gray-700'}`}>
              {entry.parsedCategory}
            </span>
          )}
          {entry.parsedCounterpart && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded-full">
              {entry.parsedCounterpart}
            </span>
          )}
          {entry.paymentMethod && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
              {entry.paymentMethod}
            </span>
          )}
        </div>

        {/* 영수증 이미지 (사진 메시지처럼) */}
        {entry.receiptPath && (
          <div className="flex justify-end mt-1">
            <button
              onClick={handleViewReceipt}
              className="flex items-end gap-1.5"
            >
              {showReceipt && receiptUrl ? (
                <img src={receiptUrl} alt="영수증" className="max-w-[200px] rounded-xl border border-[var(--color-divider)]" />
              ) : (
                <span className="px-2.5 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                  영수증 보기
                </span>
              )}
            </button>
          </div>
        )}

        {/* 롱프레스 메뉴 */}
        {showMenu && (
          <div className="flex justify-end mt-1 pr-1">
            <button
              onClick={() => { setShowMenu(false); onDelete(entry.id) }}
              className="px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded-lg shadow-sm"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── 데스크탑: 테이블 뷰 ─── */
function DesktopView({
  entries, text, setText, receiptPreview, removeReceipt, fileInputRef, handleReceiptSelect, handleSubmit, handleDelete, isPending,
}: {
  entries: DiaryEntry[]
  text: string
  setText: (v: string) => void
  receiptPreview: string | null
  removeReceipt: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleReceiptSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: () => void
  handleDelete: (id: string) => void
  isPending: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">금전일기장</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            거래 내용을 기록하면 은행·카드 내역 대조 시 분개 정확도가 높아집니다.
          </p>
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder='예: "거래처에서 200만원 입금" 또는 "택시비 15000원" (Ctrl+Enter로 전송)'
              rows={2}
              className="w-full resize-none bg-[var(--color-surface-hover)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]"
            />
            {receiptPreview && (
              <div className="mt-2 relative inline-block">
                <img src={receiptPreview} alt="영수증" className="h-16 rounded-lg border border-[var(--color-divider)]" />
                <button onClick={removeReceipt} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">&times;</button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-center">
              영수증
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptSelect} />
            </label>
            <button
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
            >
              {isPending ? '...' : '기록'}
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {entries.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-12 text-center text-[var(--color-text-muted)]">
          <p>아직 기록이 없습니다. 위에서 거래 내용을 입력해보세요.</p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-hover)] border-b border-[var(--color-divider)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">날짜</th>
                <th className="text-center px-3 py-3 font-medium text-[var(--color-text-secondary)]">구분</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">내용</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)]">금액</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">용도</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">상대방</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">결제</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">영수증</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">매칭</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <DesktopRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ─── 데스크탑: 테이블 행 ─── */
function DesktopRow({ entry, onDelete }: { entry: DiaryEntry; onDelete: (id: string) => void }) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const isIncome = entry.entryType === 'income'

  const handleReceipt = async () => {
    if (!entry.receiptPath) return
    if (receiptUrl) { window.open(receiptUrl, '_blank'); return }
    const res = await getReceiptUrl(entry.receiptPath)
    if (res.url) { setReceiptUrl(res.url); window.open(res.url, '_blank') }
  }

  return (
    <tr className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-hover)]">
      <td className="px-4 py-3 whitespace-nowrap">{formatDateLabel(entry.entryDate)}</td>
      <td className="px-3 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
          isIncome ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
        }`}>
          {isIncome ? '수입' : '지출'}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="max-w-[300px]">{entry.rawText}</p>
      </td>
      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
        {entry.parsedAmount != null ? (
          <span className={isIncome ? 'text-blue-700' : 'text-red-600'}>
            {isIncome ? '+' : '-'}{entry.parsedAmount.toLocaleString()}원
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {entry.parsedCategory ? (
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[entry.parsedCategory] || 'bg-gray-100 text-gray-700'}`}>
            {entry.parsedCategory}
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
        {entry.parsedCounterpart || '-'}
      </td>
      <td className="px-4 py-3 text-center text-xs">
        {entry.paymentMethod ? (
          <span className="inline-block px-2 py-0.5 font-medium bg-blue-100 text-blue-700 rounded-full">
            {entry.paymentMethod}
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)]">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {entry.receiptPath ? (
          <button onClick={handleReceipt} className="text-amber-600 hover:text-amber-800 text-xs font-medium">
            보기
          </button>
        ) : (
          <span className="text-[var(--color-text-muted)]">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {entry.matchedTransactionId ? (
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="거래 매칭됨" />
        ) : (
          <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" title="미매칭" />
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-xs text-red-400 hover:text-red-600"
        >
          삭제
        </button>
      </td>
    </tr>
  )
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  const date = new Date(dateStr + 'T00:00:00')
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (dateStr === todayStr) return '오늘'
  if (dateStr === yesterdayStr) return '어제'

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`
}
