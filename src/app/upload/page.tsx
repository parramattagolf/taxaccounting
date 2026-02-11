'use client'

import { useState, useCallback } from 'react'
import { uploadBankExcel, type UploadResult } from '@/actions/upload-actions'

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [fileName, setFileName] = useState<string>('')

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setIsUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadBankExcel(formData)
    setResult(res)
    setIsUploading(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        자료 업로드
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        은행/카드 엑셀 파일을 업로드하면 AI가 자동으로 분개합니다.
      </p>

      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-primary)] bg-blue-50'
            : 'border-[var(--color-divider)] hover:border-[var(--color-primary-light)]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {isUploading ? (
          <div className="text-[var(--color-primary)]">
            <p className="text-lg mb-2">처리 중...</p>
            <p className="text-sm text-[var(--color-text-muted)]">{fileName}</p>
          </div>
        ) : (
          <div className="text-[var(--color-text-muted)]">
            <p className="text-lg mb-2">엑셀 파일을 여기에 드래그하세요</p>
            <p className="text-sm mb-4">또는</p>
            <label className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-primary-dark)] transition-colors">
              파일 선택
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onFileSelect}
              />
            </label>
            <p className="text-xs mt-3 text-[var(--color-text-muted)]">
              지원: IBK 기업은행 입출식 예금 (.xlsx)
            </p>
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <div className={`mt-6 rounded-xl border p-5 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {result.success ? (
            <>
              <h3 className="font-semibold text-green-800 mb-3">업로드 완료</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-green-700">은행:</span>{' '}
                  <span className="font-medium">{result.bankName}</span>
                </div>
                <div>
                  <span className="text-green-700">계좌:</span>{' '}
                  <span className="font-medium">{result.accountNumber}</span>
                </div>
                <div>
                  <span className="text-green-700">거래 건수:</span>{' '}
                  <span className="font-medium">{result.transactionCount}건</span>
                </div>
                <div>
                  <span className="text-green-700">총 출금:</span>{' '}
                  <span className="font-medium text-red-600">
                    ₩{result.totalWithdrawal?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-green-700">총 입금:</span>{' '}
                  <span className="font-medium text-blue-600">
                    ₩{result.totalDeposit?.toLocaleString()}
                  </span>
                </div>
              </div>
              <a
                href="/journals"
                className="inline-block mt-4 px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                분개장에서 확인하기
              </a>
            </>
          ) : (
            <div>
              <h3 className="font-semibold text-red-800 mb-1">업로드 실패</h3>
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
