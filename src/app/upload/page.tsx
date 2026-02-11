'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false)

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
        onDrop={(e) => { e.preventDefault(); setIsDragging(false) }}
      >
        <div className="text-[var(--color-text-muted)]">
          <p className="text-lg mb-2">엑셀 파일을 여기에 드래그하세요</p>
          <p className="text-sm mb-4">또는</p>
          <label className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-primary-dark)] transition-colors">
            파일 선택
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" multiple />
          </label>
          <p className="text-xs mt-3 text-[var(--color-text-muted)]">
            지원 형식: .xlsx, .xls, .csv
          </p>
        </div>
      </div>

      {/* 업로드 이력 */}
      <div className="mt-8 bg-[var(--color-surface)] rounded-xl border border-[var(--color-divider)] p-6">
        <h3 className="text-lg font-semibold mb-4">업로드 이력</h3>
        <p className="text-[var(--color-text-muted)] text-sm">
          아직 업로드된 파일이 없습니다.
        </p>
      </div>
    </div>
  )
}
