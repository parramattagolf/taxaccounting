-- 결제수단 테이블
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method_type TEXT NOT NULL,  -- cash, credit_card, debit_card, bank_transfer
  name TEXT NOT NULL,
  details TEXT,               -- 계좌번호, 카드명 등
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cash_diary에 결제수단 컬럼 추가
ALTER TABLE cash_diary ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 기본 결제수단 시드
INSERT INTO payment_methods (method_type, name, sort_order) VALUES
  ('cash', '현금', 1),
  ('credit_card', '신용카드', 2),
  ('debit_card', '체크카드', 3),
  ('bank_transfer', '계좌이체', 4);
