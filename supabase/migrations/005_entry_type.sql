-- 수입/지출 구분 컬럼 추가
ALTER TABLE cash_diary ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'expense'
  CHECK (entry_type IN ('income', 'expense'));
