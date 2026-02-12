/**
 * 금전일기장 자연어 파서
 *
 * "오늘 거래처 김과장과 59000원 식사했다" → { type: "expense", amount: 59000, counterpart: "김과장", category: "식사", ... }
 * "어제 택시비 15000원" → { type: "expense", date: yesterday, amount: 15000, category: "교통" }
 * "거래처에서 200만원 입금받았다" → { type: "income", amount: 2000000, category: "매출" }
 */

export interface DiaryParsed {
  date: string          // YYYY-MM-DD
  type: 'income' | 'expense'
  amount: number | null
  counterpart: string | null
  category: string | null
  paymentMethod: string | null
  description: string   // 정리된 설명
}

// 날짜 패턴
const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => string | null][] = [
  // "2026-02-11", "2026.02.11", "2026/02/11"
  [/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/, (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`],
  // "2월 11일", "2월11일"
  [/(\d{1,2})월\s*(\d{1,2})일/, (m) => {
    const now = new Date()
    return `${now.getFullYear()}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }],
  // "오늘"
  [/오늘/, () => toDateStr(new Date())],
  // "어제"
  [/어제/, () => { const d = new Date(); d.setDate(d.getDate() - 1); return toDateStr(d) }],
  // "그제", "그저께"
  [/그제|그저께/, () => { const d = new Date(); d.setDate(d.getDate() - 2); return toDateStr(d) }],
  // "엊그제"
  [/엊그제/, () => { const d = new Date(); d.setDate(d.getDate() - 3); return toDateStr(d) }],
]

// 수입 감지 키워드
const INCOME_KEYWORDS = /입금|받았|받음|수금|수입|매출|급여|월급|임금|보너스|상여|이자|배당|환급|정산|판매대금|용역대금|수당|들어왔|들어옴|벌었|벌음|매각|수령/

// 지출 카테고리 키워드 매핑
const EXPENSE_CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/식사|밥|점심|저녁|아침|식비|식당|카페|커피|음료|치킨|피자|배달/, '식사'],
  [/택시|교통|버스|지하철|KTX|기차|주차|톨비|하이패스|고속도로/, '교통'],
  [/주유|기름/, '주유'],
  [/사무용품|문구|프린터|토너|복사/, '사무용품'],
  [/선물|경조사|축의금|조의금|부의금|화환/, '경조사'],
  [/접대|술|회식|노래방|유흥/, '접대'],
  [/교육|강의|세미나|학원|수강/, '교육'],
  [/광고|마케팅|홍보|전단/, '광고'],
  [/임대|월세|관리비|보증금/, '임대'],
  [/보험|보험료/, '보험'],
  [/통신|전화|인터넷|요금/, '통신'],
  [/수리|수선|정비|AS/, '수리'],
  [/택배|배송|운반|화물/, '배송'],
  [/구매|구입|쇼핑|매입|샀|사왔|주문/, '구매'],
]

// 수입 카테고리 키워드 매핑
const INCOME_CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/매출|판매|판매대금/, '매출'],
  [/급여|월급|임금|수당|상여|보너스/, '급여'],
  [/이자/, '이자'],
  [/배당/, '배당'],
  [/환급|세금환급/, '환급'],
  [/용역|용역대금|수수료/, '용역'],
  [/정산/, '정산'],
  [/임대|월세|관리비/, '임대수입'],
]

// 결제수단 키워드 매핑 (구체적 → 포괄적 순서)
const PAYMENT_KEYWORDS: [RegExp, string][] = [
  [/체크\s*카드(로|결제)?/, '체크카드'],
  [/신용\s*카드(로|결제)?/, '신용카드'],
  [/현금(으로|결제)?/, '현금'],
  [/계좌\s*이체|이체(로)?|송금/, '계좌이체'],
  [/카드(로|결제)?\b|카드/, '신용카드'],  // 일반적인 "카드" → 신용카드
]

// 상대방 추출 패턴
const COUNTERPART_PATTERNS = [
  /(.+?)(이?랑|과|와|에게|한테)\s/,           // "김과장과", "거래처랑"
  /(.+?)(에서|에서의)\s/,                     // "문구점에서"
  /(.+?)(로부터|에게서)\s/,                   // "거래처로부터"
  /(.+?)\s+(사장|대표|과장|부장|팀장|님)/,      // "김 사장"
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isValidDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function parseAmount(text: string): number | null {
  // 가장 구체적인 패턴부터 매칭 (긴 패턴 → 짧은 패턴)

  // "5만9천원", "5만 9천원", "5만9천" (만+천 조합)
  const manChun = text.match(/(\d[\d,]*)\s*만\s*(\d[\d,]*)\s*천\s*원?/)
  if (manChun) {
    return parseInt(manChun[1].replace(/,/g, ''), 10) * 10000 +
           parseInt(manChun[2].replace(/,/g, ''), 10) * 1000
  }

  // "5만원", "200만원"
  const man = text.match(/(\d[\d,]*)\s*만\s*원/)
  if (man) {
    return parseInt(man[1].replace(/,/g, ''), 10) * 10000
  }

  // "5천원"
  const chun = text.match(/(\d[\d,]*)\s*천\s*원/)
  if (chun) {
    return parseInt(chun[1].replace(/,/g, ''), 10) * 1000
  }

  // "59000원", "59,000원"
  const won = text.match(/(\d[\d,]*)\s*원/)
  if (won) {
    return parseInt(won[1].replace(/,/g, ''), 10)
  }

  // 숫자만 있으면 그것도 시도
  const nums = text.match(/(\d[\d,]{2,})/)
  if (nums) {
    const val = parseInt(nums[1].replace(/,/g, ''), 10)
    if (val >= 100) return val // 100원 이상만
  }

  return null
}

function parseDate(text: string): string {
  for (const [pattern, extract] of DATE_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const result = extract(m)
      if (result && isValidDate(result)) return result
    }
  }
  // 기본: 오늘
  return toDateStr(new Date())
}

function parseType(text: string): 'income' | 'expense' {
  if (INCOME_KEYWORDS.test(text)) return 'income'
  return 'expense'
}

function parseCategory(text: string, type: 'income' | 'expense'): string | null {
  const keywords = type === 'income' ? INCOME_CATEGORY_KEYWORDS : EXPENSE_CATEGORY_KEYWORDS
  for (const [pattern, category] of keywords) {
    if (pattern.test(text)) return category
  }
  // 수입인데 카테고리 못 찾으면 지출 카테고리도 확인 (예: "임대" 같은 양방향)
  if (type === 'income') {
    for (const [pattern, category] of EXPENSE_CATEGORY_KEYWORDS) {
      if (pattern.test(text)) return category
    }
  }
  return null
}

function parsePaymentMethod(text: string): string | null {
  for (const [pattern, method] of PAYMENT_KEYWORDS) {
    if (pattern.test(text)) return method
  }
  return null
}

// 카테고리 키워드와 겹치는 단어를 상대방으로 잡지 않기 위한 필터
const COUNTERPART_EXCLUDE = /^(식사|밥|점심|저녁|아침|택시|교통|버스|주유|사무용품|문구|선물|경조사|접대|교육|광고|임대|보험|통신|수리|택배|구매|매출|급여)$/

function parseCounterpart(text: string): string | null {
  for (const pattern of COUNTERPART_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const name = m[1].trim()
      if (name.length >= 1 && name.length <= 20 && !COUNTERPART_EXCLUDE.test(name)) {
        return name
      }
    }
  }
  return null
}

/**
 * 자연어 텍스트를 파싱하여 구조화된 데이터를 추출
 */
export function parseDiaryEntry(text: string): DiaryParsed {
  const trimmed = text.trim()

  const date = parseDate(trimmed)
  const type = parseType(trimmed)
  const amount = parseAmount(trimmed)
  const category = parseCategory(trimmed, type)
  const counterpart = parseCounterpart(trimmed)
  const paymentMethod = parsePaymentMethod(trimmed)

  // 설명: 원문을 그대로 사용하되, 날짜 키워드는 제거
  let description = trimmed
    .replace(/오늘|어제|그제|그저께|엊그제/, '')
    .replace(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/, '')
    .replace(/\d{1,2}월\s*\d{1,2}일/, '')
    .trim()

  // 앞뒤 공백/쉼표 정리
  description = description.replace(/^[,.\s]+|[,.\s]+$/g, '').trim()

  return {
    date,
    type,
    amount,
    counterpart,
    category,
    paymentMethod,
    description: description || trimmed,
  }
}
