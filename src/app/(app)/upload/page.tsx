'use client'

import { useState, useCallback } from 'react'
import {
  uploadBankExcel,
  getDownloadUrl,
  deleteUpload,
  FILE_TYPE_LABELS,
  type UploadResult,
  type FileType,
} from '@/actions/upload-actions'

export default function UploadPage() {
  const [fileType, setFileType] = useState<FileType>('bank_statement')
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
    formData.append('fileType', fileType)

    const res = await uploadBankExcel(formData)
    setResult(res)
    setIsUploading(false)
  }, [fileType])

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
        파일을 업로드하면 보관되며 언제든 다시 다운로드할 수 있습니다.
      </p>

      {/* 문서 유형 선택 */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          문서 유형
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(FILE_TYPE_LABELS) as [FileType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFileType(key)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                fileType === key
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-divider)] hover:border-[var(--color-primary-light)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
            <p className="text-lg mb-2">파일을 여기에 드래그하세요</p>
            <p className="text-sm mb-4">또는</p>
            <label className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-primary-dark)] transition-colors">
              파일 선택
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={onFileSelect}
              />
            </label>
            <p className="text-xs mt-3 text-[var(--color-text-muted)]">
              {fileType === 'bank_statement' && '지원: IBK 기업은행 (.xlsx)'}
              {fileType === 'credit_card' && '지원: 카드사 엑셀 (.xlsx, .xls, .csv)'}
              {fileType === 'tax_invoice' && '지원: 전자세금계산서 (.xlsx, .csv)'}
              {fileType === 'payroll' && '지원: 급여대장 (.xlsx, .xls)'}
              {fileType === 'receipt' && '지원: 영수증 이미지/PDF (.jpg, .png, .pdf)'}
            </p>
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <div className={`mt-6 rounded-xl border p-5 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : result.isDuplicate
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
        }`}>
          {result.success ? (
            <>
              <h3 className="font-semibold text-green-800 mb-3">업로드 완료</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {result.bankName && (
                  <div>
                    <span className="text-green-700">은행:</span>{' '}
                    <span className="font-medium">{result.bankName}</span>
                  </div>
                )}
                {result.accountNumber && (
                  <div>
                    <span className="text-green-700">계좌:</span>{' '}
                    <span className="font-medium">{result.accountNumber}</span>
                  </div>
                )}
                {(result.transactionCount ?? 0) > 0 && (
                  <>
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
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <a
                  href="/journals"
                  className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-dark)]"
                >
                  분개장에서 확인
                </a>
                <a
                  href="/upload/history"
                  className="inline-block px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-sm rounded-lg border border-[var(--color-divider)] hover:bg-[var(--color-surface-hover)]"
                >
                  업로드 이력 보기
                </a>
              </div>
            </>
          ) : (
            <div>
              <h3 className={`font-semibold mb-1 ${result.isDuplicate ? 'text-yellow-800' : 'text-red-800'}`}>
                {result.isDuplicate ? '중복 파일 감지' : '업로드 실패'}
              </h3>
              <p className={`text-sm ${result.isDuplicate ? 'text-yellow-700' : 'text-red-700'}`}>
                {result.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
