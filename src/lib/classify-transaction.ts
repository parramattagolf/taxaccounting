/**
 * 규칙기반 거래 분류 엔진
 *
 * 은행 거래 내역을 분석하여 차변/대변 계정과목을 자동 배정
 *
 * 기본 원리:
 * - 출금(withdrawal) → (차변) 비용/자산 증가 / (대변) 보통예금 감소
 * - 입금(deposit)    → (차변) 보통예금 증가 / (대변) 매출/수익
 */

export interface ClassificationResult {
  debitAccount: string   // 차변 계정과목명
  creditAccount: string  // 대변 계정과목명
  vatDeductible: boolean // 부가세 공제 여부
  confidence: number     // 확신도 (0~1)
  reason: string         // 판단 근거
}

interface TransactionInput {
  withdrawal: number
  deposit: number
  description: string
  counterpartName: string | null
  counterpartBank: string | null
  transactionType: string | null
  memo: string | null
}

// ── 출금 분류 규칙 (우선순위 순) ──

interface Rule {
  match: (tx: TransactionInput) => boolean
  debit: string
  credit: string
  vatDeductible: boolean
  confidence: number
  reason: string
}

const WITHDRAWAL_RULES: Rule[] = [
  // 급여/인건비
  {
    match: (tx) => /급여|월급|상여|보너스|인건비/.test(tx.description + (tx.memo ?? '')),
    debit: '급여', credit: '보통예금',
    vatDeductible: false, confidence: 0.95, reason: '적요에 급여 관련 키워드',
  },
  // 4대보험
  {
    match: (tx) => /국민연금|건강보험|고용보험|산재보험|4대보험/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '세금과공과', credit: '보통예금',
    vatDeductible: false, confidence: 0.95, reason: '4대보험 납부',
  },
  // 세금 납부
  {
    match: (tx) => /부가세|부가가치세|소득세|원천세|법인세|지방세|재산세|종합소득세|주민세/.test(tx.description + (tx.memo ?? '')),
    debit: '세금과공과', credit: '보통예금',
    vatDeductible: false, confidence: 0.95, reason: '세금 납부',
  },
  {
    match: (tx) => /국세|세무서|세관|관세/.test(tx.counterpartName ?? ''),
    debit: '세금과공과', credit: '보통예금',
    vatDeductible: false, confidence: 0.9, reason: '국세/세무서 관련 거래처',
  },
  // 임대료/월세
  {
    match: (tx) => /임대료|월세|관리비|렌탈료|리스료/.test(tx.description + (tx.memo ?? '')),
    debit: '임차료', credit: '보통예금',
    vatDeductible: true, confidence: 0.9, reason: '임대료/관리비 키워드',
  },
  // 보험료
  {
    match: (tx) => /보험료|화재보험|자동차보험|배상책임보험/.test(tx.description + (tx.memo ?? '')),
    debit: '보험료', credit: '보통예금',
    vatDeductible: false, confidence: 0.9, reason: '보험료 키워드',
  },
  {
    match: (tx) => /보험|삼성화재|현대해상|DB손해|메리츠/.test(tx.counterpartName ?? ''),
    debit: '보험료', credit: '보통예금',
    vatDeductible: false, confidence: 0.85, reason: '보험사 거래처명',
  },
  // 통신비
  {
    match: (tx) => /통신비|전화료|인터넷|SK텔레콤|KT|LG유플러스|SKT/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '통신비', credit: '보통예금',
    vatDeductible: true, confidence: 0.9, reason: '통신비 키워드 또는 통신사',
  },
  // 수도광열비
  {
    match: (tx) => /전기료|수도료|가스료|한국전력|수도사업소|도시가스|난방비/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '수도광열비', credit: '보통예금',
    vatDeductible: true, confidence: 0.9, reason: '공과금 관련 키워드',
  },
  // 차량유지비
  {
    match: (tx) => /주유|주유소|세차|정비|자동차|차량|타이어|GS칼텍스|SK에너지|현대오일/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '차량유지비', credit: '보통예금',
    vatDeductible: true, confidence: 0.85, reason: '차량 관련 키워드',
  },
  // 교통비
  {
    match: (tx) => /교통|택시|버스|지하철|KTX|톨비|하이패스|고속도로/.test(tx.description + (tx.memo ?? '')),
    debit: '여비교통비', credit: '보통예금',
    vatDeductible: true, confidence: 0.85, reason: '교통비 키워드',
  },
  // 접대비
  {
    match: (tx) => /접대|회식|선물|경조사/.test(tx.description + (tx.memo ?? '')),
    debit: '접대비', credit: '보통예금',
    vatDeductible: true, confidence: 0.85, reason: '접대비 키워드',
  },
  // 광고선전비
  {
    match: (tx) => /광고|네이버광고|구글광고|페이스북|인스타|마케팅|홍보/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '광고선전비', credit: '보통예금',
    vatDeductible: true, confidence: 0.85, reason: '광고/마케팅 키워드',
  },
  // 소모품비
  {
    match: (tx) => /사무용품|소모품|문구|토너|복사/.test(tx.description + (tx.memo ?? '')),
    debit: '소모품비', credit: '보통예금',
    vatDeductible: true, confidence: 0.85, reason: '소모품 키워드',
  },
  // 복리후생비
  {
    match: (tx) => /식대|중식|석식|커피|간식|복리후생|경조금|체력단련/.test(tx.description + (tx.memo ?? '')),
    debit: '복리후생비', credit: '보통예금',
    vatDeductible: true, confidence: 0.8, reason: '복리후생비 키워드',
  },
  // 카드 결제 (출금) - 수수료
  {
    match: (tx) => /카드수수료|BC카드|비씨카드|신한카드|삼성카드|현대카드|롯데카드|국민카드|하나카드|우리카드/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '지급수수료', credit: '보통예금',
    vatDeductible: false, confidence: 0.8, reason: '카드 관련 수수료',
  },
  // 은행 수수료
  {
    match: (tx) => /수수료|이체수수료|인터넷뱅킹수수료|펌수수료/.test(tx.description),
    debit: '지급수수료', credit: '보통예금',
    vatDeductible: false, confidence: 0.9, reason: '수수료 키워드',
  },
  // 이자 비용
  {
    match: (tx) => /이자|대출이자/.test(tx.description) && tx.withdrawal > 0,
    debit: '이자비용', credit: '보통예금',
    vatDeductible: false, confidence: 0.9, reason: '이자 관련 출금',
  },
  // 대출 상환
  {
    match: (tx) => /대출상환|원금상환|원리금/.test(tx.description),
    debit: '단기차입금', credit: '보통예금',
    vatDeductible: false, confidence: 0.85, reason: '대출 상환 키워드',
  },
  // 사업주 인출
  {
    match: (tx) => /인출|생활비|개인용/.test(tx.description + (tx.memo ?? '')),
    debit: '인출금', credit: '보통예금',
    vatDeductible: false, confidence: 0.8, reason: '사업주 인출 추정',
  },
  // 펌뱅킹/이체 → 일반 비용으로 추정
  {
    match: (tx) => /펌뱅킹|자동이체/.test(tx.transactionType ?? ''),
    debit: '지급수수료', credit: '보통예금',
    vatDeductible: false, confidence: 0.5, reason: '펌뱅킹/자동이체 (구체적 판단 어려움)',
  },
]

const DEPOSIT_RULES: Rule[] = [
  // 이자 수입
  {
    match: (tx) => /이자|이자입금|보통예금이자|정기예금이자/.test(tx.description),
    debit: '보통예금', credit: '이자수익',
    vatDeductible: false, confidence: 0.95, reason: '이자 수입 키워드',
  },
  // 매출 입금 - 카드매출
  {
    match: (tx) => /카드매출|카드입금|PG|결제대금|카드대금|VAN/.test(tx.description + (tx.counterpartName ?? '')),
    debit: '보통예금', credit: '매출',
    vatDeductible: false, confidence: 0.9, reason: '카드매출/PG 입금',
  },
  // 대출 입금
  {
    match: (tx) => /대출|융자|차입/.test(tx.description),
    debit: '보통예금', credit: '단기차입금',
    vatDeductible: false, confidence: 0.85, reason: '대출/차입 입금',
  },
  // 환불/반환
  {
    match: (tx) => /환불|반환|취소|반품/.test(tx.description + (tx.memo ?? '')),
    debit: '보통예금', credit: '잡이익',
    vatDeductible: false, confidence: 0.8, reason: '환불/반환 키워드',
  },
  // 보증금 반환
  {
    match: (tx) => /보증금|임대보증금/.test(tx.description),
    debit: '보통예금', credit: '보증금',
    vatDeductible: false, confidence: 0.8, reason: '보증금 반환',
  },
  // 사업주 입금(추가 자본)
  {
    match: (tx) => /자본금|출자|사업자금/.test(tx.description + (tx.memo ?? '')),
    debit: '보통예금', credit: '자본금',
    vatDeductible: false, confidence: 0.8, reason: '사업주 자본 입금',
  },
]

/**
 * 단일 거래를 분류
 */
export function classifyTransaction(tx: TransactionInput): ClassificationResult {
  const isWithdrawal = tx.withdrawal > 0

  if (isWithdrawal) {
    for (const rule of WITHDRAWAL_RULES) {
      if (rule.match(tx)) {
        return {
          debitAccount: rule.debit,
          creditAccount: rule.credit,
          vatDeductible: rule.vatDeductible,
          confidence: rule.confidence,
          reason: rule.reason,
        }
      }
    }
    // 기본 출금: 매입으로 추정
    return {
      debitAccount: '매입',
      creditAccount: '보통예금',
      vatDeductible: true,
      confidence: 0.3,
      reason: '기본 출금 분류 (수동 확인 필요)',
    }
  } else {
    for (const rule of DEPOSIT_RULES) {
      if (rule.match(tx)) {
        return {
          debitAccount: rule.debit,
          creditAccount: rule.credit,
          vatDeductible: rule.vatDeductible,
          confidence: rule.confidence,
          reason: rule.reason,
        }
      }
    }
    // 기본 입금: 매출로 추정
    return {
      debitAccount: '보통예금',
      creditAccount: '매출',
      vatDeductible: false,
      confidence: 0.4,
      reason: '기본 입금 분류 (수동 확인 필요)',
    }
  }
}

/**
 * 여러 거래를 일괄 분류
 */
export function classifyTransactions(transactions: TransactionInput[]): ClassificationResult[] {
  return transactions.map(classifyTransaction)
}
