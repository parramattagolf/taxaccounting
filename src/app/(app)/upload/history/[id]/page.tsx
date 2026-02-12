import { createAdminClient } from '@/utils/supabase/admin'
import { DetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

const FILE_TYPE_LABELS: Record<string, string> = {
  bank_statement: '은행 입출금 내역',
  credit_card: '신용카드 내역',
  tax_invoice: '전자세금계산서',
  payroll: '급여 내역',
  receipt: '영수증',
}

export default async function UploadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createAdminClient()

  // 업로드 정보 조회
  const { data: upload, error: uploadError } = await supabase
    .from('uploads')
    .select('*')
    .eq('id', id)
    .single()

  if (uploadError || !upload) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700">업로드 정보를 찾을 수 없습니다.</p>
          <a href="/upload/history" className="inline-block mt-3 text-sm text-[var(--color-primary)] hover:underline">
            업로드 이력으로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  // 연결된 거래 내역 조회
  const { data: transactions } = await supabase
    .from('transactions')
    .select('seq, transaction_date, withdrawal, deposit, balance, description, counterpart_account, counterpart_bank, counterpart_name, memo, transaction_type')
    .eq('upload_id', id)
    .order('seq', { ascending: true })

  const meta = {
    id: String(upload.id),
    fileName: String(upload.file_name),
    fileType: String(upload.file_type ?? 'bank_statement'),
    fileTypeLabel: FILE_TYPE_LABELS[String(upload.file_type)] || String(upload.file_type),
    bankName: upload.bank_name ? String(upload.bank_name) : null,
    accountNumber: upload.account_number ? String(upload.account_number) : null,
    accountHolder: upload.account_holder ? String(upload.account_holder) : null,
    periodStart: upload.period_start ? String(upload.period_start) : null,
    periodEnd: upload.period_end ? String(upload.period_end) : null,
    totalWithdrawal: Number(upload.total_withdrawal) || 0,
    totalDeposit: Number(upload.total_deposit) || 0,
    rowCount: Number(upload.row_count) || 0,
    fileSize: Number(upload.file_size) || 0,
    storagePath: upload.storage_path ? String(upload.storage_path) : null,
    createdAt: String(upload.created_at),
  }

  const rows = (transactions ?? []).map(tx => ({
    seq: Number(tx.seq) || 0,
    transactionDate: String(tx.transaction_date),
    withdrawal: Number(tx.withdrawal) || 0,
    deposit: Number(tx.deposit) || 0,
    balance: Number(tx.balance) || 0,
    description: String(tx.description ?? ''),
    counterpartAccount: tx.counterpart_account ? String(tx.counterpart_account) : null,
    counterpartBank: tx.counterpart_bank ? String(tx.counterpart_bank) : null,
    counterpartName: tx.counterpart_name ? String(tx.counterpart_name) : null,
    memo: tx.memo ? String(tx.memo) : null,
    transactionType: tx.transaction_type ? String(tx.transaction_type) : null,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <DetailClient meta={meta} transactions={rows} />
    </div>
  )
}
