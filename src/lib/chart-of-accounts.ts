/**
 * 계정과목 (Chart of Accounts)
 * 개인사업자 간편장부 기준 + 복식부기 기본 계정과목
 */

export interface Account {
  code: string       // 계정코드
  name: string       // 계정과목명
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  subcategory: string // 세부 분류
  vatRelevant?: boolean // 부가세 관련 여부
}

// 주요 계정과목 (개인사업자 간편장부 + 복식부기 기본)
export const ACCOUNTS: Account[] = [
  // ── 자산 (Assets) ──
  { code: '101', name: '보통예금', category: 'asset', subcategory: '유동자산' },
  { code: '102', name: '현금', category: 'asset', subcategory: '유동자산' },
  { code: '103', name: '외상매출금', category: 'asset', subcategory: '유동자산' },
  { code: '104', name: '받을어음', category: 'asset', subcategory: '유동자산' },
  { code: '105', name: '미수금', category: 'asset', subcategory: '유동자산' },
  { code: '106', name: '선급금', category: 'asset', subcategory: '유동자산' },
  { code: '107', name: '부가세대급금', category: 'asset', subcategory: '유동자산', vatRelevant: true },
  { code: '108', name: '단기대여금', category: 'asset', subcategory: '유동자산' },
  { code: '151', name: '건물', category: 'asset', subcategory: '고정자산' },
  { code: '152', name: '차량운반구', category: 'asset', subcategory: '고정자산' },
  { code: '153', name: '비품', category: 'asset', subcategory: '고정자산' },
  { code: '154', name: '보증금', category: 'asset', subcategory: '고정자산' },

  // ── 부채 (Liabilities) ──
  { code: '201', name: '외상매입금', category: 'liability', subcategory: '유동부채' },
  { code: '202', name: '지급어음', category: 'liability', subcategory: '유동부채' },
  { code: '203', name: '미지급금', category: 'liability', subcategory: '유동부채' },
  { code: '204', name: '예수금', category: 'liability', subcategory: '유동부채' },
  { code: '205', name: '부가세예수금', category: 'liability', subcategory: '유동부채', vatRelevant: true },
  { code: '206', name: '단기차입금', category: 'liability', subcategory: '유동부채' },
  { code: '251', name: '장기차입금', category: 'liability', subcategory: '비유동부채' },

  // ── 자본 (Equity) ──
  { code: '301', name: '자본금', category: 'equity', subcategory: '자본금' },
  { code: '302', name: '인출금', category: 'equity', subcategory: '자본금' },

  // ── 수익 (Revenue) ──
  { code: '401', name: '매출', category: 'revenue', subcategory: '영업수익', vatRelevant: true },
  { code: '402', name: '이자수익', category: 'revenue', subcategory: '영업외수익' },
  { code: '403', name: '잡이익', category: 'revenue', subcategory: '영업외수익' },
  { code: '404', name: '임대수익', category: 'revenue', subcategory: '영업외수익' },

  // ── 비용 (Expenses) ──
  { code: '501', name: '매입', category: 'expense', subcategory: '매출원가', vatRelevant: true },
  { code: '511', name: '급여', category: 'expense', subcategory: '판매비와관리비' },
  { code: '512', name: '퇴직급여', category: 'expense', subcategory: '판매비와관리비' },
  { code: '513', name: '복리후생비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '514', name: '여비교통비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '515', name: '접대비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '516', name: '통신비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '517', name: '수도광열비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '518', name: '세금과공과', category: 'expense', subcategory: '판매비와관리비' },
  { code: '519', name: '감가상각비', category: 'expense', subcategory: '판매비와관리비' },
  { code: '520', name: '임차료', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '521', name: '수선비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '522', name: '보험료', category: 'expense', subcategory: '판매비와관리비' },
  { code: '523', name: '차량유지비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '524', name: '운반비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '525', name: '교육훈련비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '526', name: '도서인쇄비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '527', name: '소모품비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '528', name: '지급수수료', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '529', name: '광고선전비', category: 'expense', subcategory: '판매비와관리비', vatRelevant: true },
  { code: '530', name: '대손상각비', category: 'expense', subcategory: '판매비와관리비' },
  { code: '541', name: '이자비용', category: 'expense', subcategory: '영업외비용' },
  { code: '542', name: '잡손실', category: 'expense', subcategory: '영업외비용' },
]

// 빠른 조회를 위한 맵
export const ACCOUNT_MAP = new Map(ACCOUNTS.map(a => [a.code, a]))
export const ACCOUNT_BY_NAME = new Map(ACCOUNTS.map(a => [a.name, a]))
