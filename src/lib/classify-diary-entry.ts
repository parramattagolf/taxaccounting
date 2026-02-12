/**
 * 금전일기장 항목 → 분개(Journal Entry) 생성 엔진
 *
 * 파싱된 다이어리 입력을 복식부기 분개로 변환한다.
 *
 * 예시:
 *  "사무실 선풍기 35000원 체크카드" →
 *    (차) 비품          31,818
 *    (차) 부가세대급금    3,182
 *    (대) 보통예금       35,000
 *
 *  "거래처 김과장과 59000원 식사" →
 *    (차) 접대비         53,636
 *    (차) 부가세대급금    5,364
 *    (대) 미지급금       59,000
 */

import { ACCOUNT_BY_NAME, type Account } from './chart-of-accounts'
import type { DiaryParsed } from './parse-diary-entry'

/* ─── 결과 타입 ─── */

export interface JournalLine {
  account: string       // 계정과목명
  accountCode: string   // 계정코드
  debit: number         // 차변
  credit: number        // 대변
}

export interface DiaryJournalEntry {
  date: string
  lines: JournalLine[]
  confidence: number    // 0~1
  reason: string
  needsReview: boolean  // 사용자 확인 필요 여부
}

/* ─── 계정과목 룩업 헬퍼 ─── */

function accountCode(name: string): string {
  return ACCOUNT_BY_NAME.get(name)?.code ?? '???'
}

function accountInfo(name: string): Account | undefined {
  return ACCOUNT_BY_NAME.get(name)
}

/* ═══════════════════════════════════════════
   1. 물품/서비스 → 차변 계정과목 룰
   ═══════════════════════════════════════════ */

interface DebitRule {
  match: RegExp
  account: string
  vatDeductible: boolean
  confidence: number
}

// 구체적 물품 키워드 → 계정과목 (우선순위순: 구체적 → 포괄적)
const ITEM_DEBIT_RULES: DebitRule[] = [
  // ── 비품 (고정자산, 장기 사용) ──
  { match: /선풍기|에어컨|냉장고|전자레인지|정수기|세탁기|청소기|가습기|제습기|공기청정기/, account: '비품', vatDeductible: true, confidence: 0.9 },
  { match: /컴퓨터|노트북|데스크탑|모니터|키보드|마우스|태블릿|아이패드|맥북/, account: '비품', vatDeductible: true, confidence: 0.9 },
  { match: /프린터|복합기|스캐너|팩스|복사기/, account: '비품', vatDeductible: true, confidence: 0.9 },
  { match: /책상|의자|캐비닛|서랍장|선반|파티션|금고|사물함|진열대/, account: '비품', vatDeductible: true, confidence: 0.9 },
  { match: /전화기|인터폰|CCTV|카메라/, account: '비품', vatDeductible: true, confidence: 0.85 },

  // ── 소모품비 ──
  { match: /볼펜|연필|메모지|포스트잇|화이트보드|마커|형광펜|노트|수첩/, account: '소모품비', vatDeductible: true, confidence: 0.9 },
  { match: /A4|용지|토너|잉크|카트리지|복사용지/, account: '소모품비', vatDeductible: true, confidence: 0.9 },
  { match: /봉투|테이프|스테이플러|가위|칼|풀|클립|바인더/, account: '소모품비', vatDeductible: true, confidence: 0.85 },
  { match: /건전지|배터리|전구|형광등|LED등/, account: '소모품비', vatDeductible: true, confidence: 0.85 },
  { match: /휴지|화장지|물티슈|쓰레기봉투|세제|청소용품|행주|걸레/, account: '소모품비', vatDeductible: true, confidence: 0.85 },
  { match: /사무용품|문구/, account: '소모품비', vatDeductible: true, confidence: 0.8 },

  // ── 차량유지비 ──
  { match: /주유|기름|휘발유|경유|LPG/, account: '차량유지비', vatDeductible: true, confidence: 0.95 },
  { match: /세차/, account: '차량유지비', vatDeductible: true, confidence: 0.9 },
  { match: /타이어|엔진오일|와이퍼|부동액|냉각수/, account: '차량유지비', vatDeductible: true, confidence: 0.9 },
  { match: /차량\s*정비|자동차\s*수리|차량\s*수리/, account: '차량유지비', vatDeductible: true, confidence: 0.85 },

  // ── 여비교통비 ──
  { match: /택시비?/, account: '여비교통비', vatDeductible: true, confidence: 0.95 },
  { match: /버스|지하철|전철|KTX|SRT|기차|열차/, account: '여비교통비', vatDeductible: true, confidence: 0.9 },
  { match: /주차비?|톨비|하이패스|고속도로비?/, account: '여비교통비', vatDeductible: true, confidence: 0.9 },
  { match: /항공|비행기|숙박|호텔|모텔|출장/, account: '여비교통비', vatDeductible: true, confidence: 0.85 },

  // ── 접대비 (명시적 키워드) ──
  { match: /접대/, account: '접대비', vatDeductible: true, confidence: 0.95 },
  { match: /경조사비?|축의금|조의금|부의금|화환|조화/, account: '접대비', vatDeductible: false, confidence: 0.9 },

  // ── 복리후생비 (직원 관련) ──
  { match: /간식|다과|음료수|과자|떡|과일/, account: '복리후생비', vatDeductible: true, confidence: 0.85 },

  // ── 광고선전비 ──
  { match: /광고|마케팅|홍보|전단지|현수막|배너|판촉물|네이버광고|구글광고/, account: '광고선전비', vatDeductible: true, confidence: 0.9 },
  { match: /명함|카달로그|브로셔|리플렛/, account: '광고선전비', vatDeductible: true, confidence: 0.85 },

  // ── 임차료 ──
  { match: /월세|임대료|임차료/, account: '임차료', vatDeductible: true, confidence: 0.95 },
  { match: /관리비/, account: '임차료', vatDeductible: true, confidence: 0.85 },
  { match: /렌탈료?|리스료?/, account: '임차료', vatDeductible: true, confidence: 0.8 },

  // ── 통신비 ──
  { match: /전화요금|휴대폰\s*요금|인터넷\s*요금|통신비/, account: '통신비', vatDeductible: true, confidence: 0.9 },

  // ── 수도광열비 ──
  { match: /전기세|전기요금|전기료/, account: '수도광열비', vatDeductible: true, confidence: 0.9 },
  { match: /수도세|수도요금|수도료/, account: '수도광열비', vatDeductible: true, confidence: 0.9 },
  { match: /가스비|가스요금|가스료|난방비/, account: '수도광열비', vatDeductible: true, confidence: 0.9 },

  // ── 교육훈련비 ──
  { match: /교육비?|세미나|강의|수강료?|학원비?|자격증|연수/, account: '교육훈련비', vatDeductible: true, confidence: 0.85 },

  // ── 도서인쇄비 ──
  { match: /책|도서|서적|잡지|신문/, account: '도서인쇄비', vatDeductible: true, confidence: 0.85 },
  { match: /인쇄비?|출력/, account: '도서인쇄비', vatDeductible: true, confidence: 0.8 },

  // ── 보험료 ──
  { match: /보험료|화재보험|배상책임보험|자동차보험/, account: '보험료', vatDeductible: false, confidence: 0.9 },

  // ── 세금과공과 ──
  { match: /부가세|소득세|법인세|재산세|자동차세|주민세|면허세/, account: '세금과공과', vatDeductible: false, confidence: 0.95 },
  { match: /벌금|과태료|범칙금/, account: '세금과공과', vatDeductible: false, confidence: 0.9 },
  { match: /인지세|등록세|취득세/, account: '세금과공과', vatDeductible: false, confidence: 0.9 },
  { match: /4대\s*보험|국민연금|건강보험|고용보험|산재보험/, account: '세금과공과', vatDeductible: false, confidence: 0.9 },

  // ── 지급수수료 ──
  { match: /수수료|세무사|회계사|변호사|법무사|중개/, account: '지급수수료', vatDeductible: true, confidence: 0.85 },

  // ── 급여 ──
  { match: /급여|월급|임금|인건비|상여금?|보너스/, account: '급여', vatDeductible: false, confidence: 0.95 },

  // ── 운반비 ──
  { match: /택배비?|배송비?|운반비?|화물비?|퀵비?/, account: '운반비', vatDeductible: true, confidence: 0.85 },

  // ── 수선비 ──
  { match: /수리비?|수선비?|정비비?|AS비?/, account: '수선비', vatDeductible: true, confidence: 0.85 },
]

/* ═══════════════════════════════════════════
   2. 맥락 기반 룰 (식사/커피 → 접대비 vs 복리후생비)
   ═══════════════════════════════════════════ */

interface ContextRule {
  contextMatch: RegExp    // 맥락 키워드 (거래처, 직원 등)
  itemMatch: RegExp       // 식사/커피 등
  account: string
  vatDeductible: boolean
  confidence: number
}

const CONTEXT_DEBIT_RULES: ContextRule[] = [
  // 거래처/고객 + 식사/커피/술 → 접대비
  {
    contextMatch: /거래처|고객|바이어|클라이언트|업체|외부|손님/,
    itemMatch: /식사|밥|점심|저녁|아침|커피|카페|술|회식|노래방|유흥/,
    account: '접대비', vatDeductible: true, confidence: 0.9,
  },
  // 직원/팀/사내 + 식사/커피 → 복리후생비
  {
    contextMatch: /직원|팀원|사내|우리|회사|동료|부서/,
    itemMatch: /식사|밥|점심|저녁|아침|커피|카페|간식|회식/,
    account: '복리후생비', vatDeductible: true, confidence: 0.85,
  },
]

// 식사/커피 기본 분류 (맥락 없을 때): 개인사업자 → 복리후생비
const MEAL_FALLBACK_RULES: DebitRule[] = [
  { match: /회식|노래방|유흥|술/, account: '접대비', vatDeductible: true, confidence: 0.7 },
  { match: /식사|밥|점심|저녁|아침|식비|식당/, account: '복리후생비', vatDeductible: true, confidence: 0.7 },
  { match: /커피|카페|음료|차/, account: '복리후생비', vatDeductible: true, confidence: 0.7 },
  { match: /치킨|피자|배달|족발|보쌈|햄버거|분식/, account: '복리후생비', vatDeductible: true, confidence: 0.7 },
]

/* ═══════════════════════════════════════════
   3. 결제수단 → 대변 계정과목
   ═══════════════════════════════════════════ */

function getCreditAccountForExpense(paymentMethod: string | null): { account: string; confidence: number } {
  switch (paymentMethod) {
    case '현금':     return { account: '현금', confidence: 1.0 }
    case '체크카드':  return { account: '보통예금', confidence: 1.0 }   // 즉시 출금
    case '계좌이체':  return { account: '보통예금', confidence: 1.0 }
    case '신용카드':  return { account: '미지급금', confidence: 1.0 }   // 후불
    default:        return { account: '미지급금', confidence: 0.75 }   // 결제수단 모르면 미지급금 추정
  }
}

function getDebitAccountForIncome(paymentMethod: string | null): { account: string; confidence: number } {
  switch (paymentMethod) {
    case '현금':     return { account: '현금', confidence: 1.0 }
    case '계좌이체':  return { account: '보통예금', confidence: 1.0 }
    default:        return { account: '보통예금', confidence: 0.7 }   // 기본: 보통예금
  }
}

/* ═══════════════════════════════════════════
   4. 수입 → 대변 계정과목
   ═══════════════════════════════════════════ */

const INCOME_CREDIT_RULES: DebitRule[] = [
  { match: /매출|판매|판매대금|매출액/, account: '매출', vatDeductible: false, confidence: 0.9 },
  { match: /용역|용역대금|서비스료/, account: '매출', vatDeductible: false, confidence: 0.85 },
  { match: /거래처.*(입금|보내|송금)|거래대금/, account: '매출', vatDeductible: false, confidence: 0.8 },
  { match: /이자/, account: '이자수익', vatDeductible: false, confidence: 0.95 },
  { match: /임대수입|월세수입|임대료.*받/, account: '임대수익', vatDeductible: false, confidence: 0.9 },
  { match: /환급|세금환급/, account: '잡이익', vatDeductible: false, confidence: 0.85 },
  { match: /입금/, account: '매출', vatDeductible: false, confidence: 0.7 },
]

/* ═══════════════════════════════════════════
   5. 부가세 계산
   ═══════════════════════════════════════════ */

function splitVat(totalAmount: number): { supply: number; vat: number } {
  const supply = Math.round(totalAmount / 1.1)
  const vat = totalAmount - supply
  return { supply, vat }
}

/* ═══════════════════════════════════════════
   6. 메인 분류 함수
   ═══════════════════════════════════════════ */

export function classifyDiaryEntry(parsed: DiaryParsed, rawText: string): DiaryJournalEntry {
  const text = rawText.toLowerCase()
  const amount = parsed.amount

  if (amount == null || amount <= 0) {
    return {
      date: parsed.date,
      lines: [],
      confidence: 0,
      reason: '금액을 파악할 수 없습니다.',
      needsReview: true,
    }
  }

  if (parsed.type === 'income') {
    return classifyIncome(parsed, text, amount)
  } else {
    return classifyExpense(parsed, text, amount)
  }
}

/* ── 지출 분개 생성 ── */
function classifyExpense(parsed: DiaryParsed, text: string, amount: number): DiaryJournalEntry {
  // Step 1: 맥락 기반 룰 체크 (거래처+식사 → 접대비, 직원+식사 → 복리후생비)
  for (const rule of CONTEXT_DEBIT_RULES) {
    if (rule.contextMatch.test(text) && rule.itemMatch.test(text)) {
      return buildExpenseEntry(parsed, amount, rule.account, rule.vatDeductible, rule.confidence, `맥락: ${rule.account}`)
    }
  }

  // Step 2: 물품/서비스 키워드 매칭
  for (const rule of ITEM_DEBIT_RULES) {
    if (rule.match.test(text)) {
      return buildExpenseEntry(parsed, amount, rule.account, rule.vatDeductible, rule.confidence, `키워드 매칭: ${rule.account}`)
    }
  }

  // Step 3: 식사/커피 폴백 (맥락 없이 단독)
  for (const rule of MEAL_FALLBACK_RULES) {
    if (rule.match.test(text)) {
      return buildExpenseEntry(parsed, amount, rule.account, rule.vatDeductible, rule.confidence, `기본 분류: ${rule.account}`)
    }
  }

  // Step 4: 파서 카테고리 기반 폴백
  if (parsed.category) {
    const mapped = CATEGORY_TO_ACCOUNT[parsed.category]
    if (mapped) {
      return buildExpenseEntry(parsed, amount, mapped.account, mapped.vatDeductible, 0.6, `카테고리 추정: ${parsed.category} → ${mapped.account}`)
    }
  }

  // Step 5: 기본값 - 분류 불가
  return buildExpenseEntry(parsed, amount, '매입', true, 0.3, '자동 분류 불가 (수동 확인 필요)')
}

/* ── 수입 분개 생성 ── */
function classifyIncome(parsed: DiaryParsed, text: string, amount: number): DiaryJournalEntry {
  const { account: debitAccount, confidence: debitConf } = getDebitAccountForIncome(parsed.paymentMethod)

  // 수입 유형 파악
  let creditAccount = '매출'
  let creditConf = 0.5
  let reason = '기본 매출 추정'

  for (const rule of INCOME_CREDIT_RULES) {
    if (rule.match.test(text)) {
      creditAccount = rule.account
      creditConf = rule.confidence
      reason = `키워드 매칭: ${rule.account}`
      break
    }
  }

  // 수입 카테고리 폴백
  if (creditConf < 0.7 && parsed.category) {
    const catMap: Record<string, string> = {
      '매출': '매출', '용역': '매출', '이자': '이자수익',
      '배당': '잡이익', '환급': '잡이익', '임대수입': '임대수익',
      '정산': '매출',
    }
    if (catMap[parsed.category]) {
      creditAccount = catMap[parsed.category]
      creditConf = 0.7
      reason = `카테고리: ${parsed.category} → ${creditAccount}`
    }
  }

  const confidence = Math.min(debitConf, creditConf)

  const lines: JournalLine[] = [
    { account: debitAccount, accountCode: accountCode(debitAccount), debit: amount, credit: 0 },
    { account: creditAccount, accountCode: accountCode(creditAccount), debit: 0, credit: amount },
  ]

  return {
    date: parsed.date,
    lines,
    confidence,
    reason,
    needsReview: confidence < 0.7,
  }
}

/* ── 지출 분개 빌더 (부가세 분리 포함) ── */
function buildExpenseEntry(
  parsed: DiaryParsed,
  amount: number,
  debitAccountName: string,
  vatDeductible: boolean,
  itemConfidence: number,
  reason: string,
): DiaryJournalEntry {
  const { account: creditAccount, confidence: creditConf } = getCreditAccountForExpense(parsed.paymentMethod)
  const confidence = Math.min(itemConfidence, creditConf)

  const lines: JournalLine[] = []

  if (vatDeductible) {
    // 부가세 공제 가능 → 공급가액 + VAT 분리
    const { supply, vat } = splitVat(amount)
    lines.push(
      { account: debitAccountName, accountCode: accountCode(debitAccountName), debit: supply, credit: 0 },
      { account: '부가세대급금', accountCode: accountCode('부가세대급금'), debit: vat, credit: 0 },
    )
  } else {
    // 면세/불공제 → 전액 비용 처리
    lines.push(
      { account: debitAccountName, accountCode: accountCode(debitAccountName), debit: amount, credit: 0 },
    )
  }

  // 대변: 결제수단에 따른 자산 감소/부채 증가
  lines.push(
    { account: creditAccount, accountCode: accountCode(creditAccount), debit: 0, credit: amount },
  )

  return {
    date: parsed.date,
    lines,
    confidence,
    reason,
    needsReview: confidence < 0.7,
  }
}

/* ── 파서 카테고리 → 계정과목 폴백 매핑 ── */
const CATEGORY_TO_ACCOUNT: Record<string, { account: string; vatDeductible: boolean }> = {
  '식사':    { account: '복리후생비', vatDeductible: true },
  '교통':    { account: '여비교통비', vatDeductible: true },
  '주유':    { account: '차량유지비', vatDeductible: true },
  '사무용품': { account: '소모품비', vatDeductible: true },
  '경조사':  { account: '접대비', vatDeductible: false },
  '접대':    { account: '접대비', vatDeductible: true },
  '교육':    { account: '교육훈련비', vatDeductible: true },
  '광고':    { account: '광고선전비', vatDeductible: true },
  '임대':    { account: '임차료', vatDeductible: true },
  '보험':    { account: '보험료', vatDeductible: false },
  '통신':    { account: '통신비', vatDeductible: true },
  '수리':    { account: '수선비', vatDeductible: true },
  '배송':    { account: '운반비', vatDeductible: true },
  '구매':    { account: '매입', vatDeductible: true },
}

/* ═══════════════════════════════════════════
   7. 검증: 대차평균의 원리
   ═══════════════════════════════════════════ */

export function validateJournalEntry(entry: DiaryJournalEntry): { valid: boolean; error?: string } {
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0)

  if (totalDebit !== totalCredit) {
    return { valid: false, error: `대차 불일치: 차변 ${totalDebit} ≠ 대변 ${totalCredit}` }
  }
  if (totalDebit === 0) {
    return { valid: false, error: '금액이 0입니다.' }
  }
  return { valid: true }
}
