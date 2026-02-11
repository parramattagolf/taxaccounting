import * as XLSX from 'xlsx'

export interface BankMeta {
  bankName: string
  accountNumber: string
  accountHolder: string
  periodStart: string // YYYY-MM-DD
  periodEnd: string
  currentBalance: number
}

export interface BankTransaction {
  seq: number
  transactionDate: string // ISO string
  withdrawal: number
  deposit: number
  balance: number
  description: string
  counterpartAccount: string | null
  counterpartBank: string | null
  memo: string | null
  transactionType: string | null
  counterpartName: string | null
}

export interface ParseResult {
  meta: BankMeta
  transactions: BankTransaction[]
  totalWithdrawal: number
  totalDeposit: number
}

/**
 * IBK 기업은행 엑셀 파싱
 * 양식: 거래내역조회_입출식 예금
 * 행0: 제목, 행1: 계좌정보, 행2: 헤더, 행3~N-1: 데이터, 행N: 합계
 */
function parseIBK(rows: unknown[][]): ParseResult {
  // 행1에서 계좌 정보 추출
  const infoText = String(rows[1]?.[0] ?? '')
  const accountMatch = infoText.match(/계좌번호[:\s]*([0-9\-]+)/)
  const holderMatch = infoText.match(/예금주명[:\s]*(.+?)[\s]+/)
  const balanceMatch = infoText.match(/현재잔액[:\s]*([\d,]+)원/)
  const startMatch = infoText.match(/조회시작일자[:\s]*([\d\-]+)/)
  const endMatch = infoText.match(/조회종료일자[:\s]*([\d\-]+)/)

  const meta: BankMeta = {
    bankName: 'IBK',
    accountNumber: accountMatch?.[1] ?? '',
    accountHolder: holderMatch?.[1]?.trim() ?? '',
    periodStart: startMatch?.[1] ?? '',
    periodEnd: endMatch?.[1] ?? '',
    currentBalance: parseInt(balanceMatch?.[1]?.replace(/,/g, '') ?? '0', 10),
  }

  // 행3부터 데이터, 마지막 행(합계) 제외
  const transactions: BankTransaction[] = []
  let totalWithdrawal = 0
  let totalDeposit = 0

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i]
    // 합계 행 감지: 첫 번째 셀이 null이거나 "합계" 문자열
    if (row[0] === null || row[0] === undefined || String(row[0]) === '합계') break
    // 빈 행 스킵
    if (!row[1]) continue

    const seq = Number(row[0]) || i - 2
    const withdrawal = Number(row[2]) || 0
    const deposit = Number(row[3]) || 0

    transactions.push({
      seq,
      transactionDate: parseDateTime(String(row[1])),
      withdrawal,
      deposit,
      balance: Number(row[4]) || 0,
      description: row[5] != null ? String(row[5]).trim() : '',
      counterpartAccount: row[6] != null ? String(row[6]) : null,
      counterpartBank: row[7] != null ? String(row[7]) : null,
      memo: row[8] != null ? String(row[8]) : null,
      transactionType: row[9] != null ? String(row[9]) : null,
      counterpartName: row[12] != null ? String(row[12]).trim() : null,
    })

    totalWithdrawal += withdrawal
    totalDeposit += deposit
  }

  return { meta, transactions, totalWithdrawal, totalDeposit }
}

/** "2025-12-15 11:59:13" → ISO string */
function parseDateTime(s: string): string {
  // 이미 ISO 형식에 가까우므로 T만 넣어줌
  const trimmed = s.trim()
  if (trimmed.includes(' ')) {
    return trimmed.replace(' ', 'T') + '+09:00' // KST
  }
  return trimmed + 'T00:00:00+09:00'
}

/** 은행 자동 감지 */
function detectBank(rows: unknown[][]): string {
  const title = String(rows[0]?.[0] ?? '').trim()
  if (title.includes('입출식 예금') || title.includes('기업은행') || title.includes('IBK')) {
    return 'IBK'
  }
  // 향후 다른 은행 추가
  return 'UNKNOWN'
}

/** 메인 파싱 함수 */
export function parseBankExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const bank = detectBank(rows)

  switch (bank) {
    case 'IBK':
      return parseIBK(rows)
    default:
      throw new Error(`지원하지 않는 은행 양식입니다: "${String(rows[0]?.[0])}"`)
  }
}
