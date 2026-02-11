-- 업로드된 파일 이력
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  bank_name text, -- 'IBK', 'KB', 'SHINHAN' 등
  account_number text,
  account_holder text,
  period_start date,
  period_end date,
  total_withdrawal bigint default 0,
  total_deposit bigint default 0,
  row_count integer default 0,
  created_at timestamptz default now()
);

-- 파싱된 거래 내역
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references uploads(id) on delete cascade,
  seq integer, -- 원본 순번
  transaction_date timestamptz not null,
  withdrawal bigint default 0, -- 출금액
  deposit bigint default 0, -- 입금액
  balance bigint default 0, -- 거래후 잔액
  description text, -- 거래내용 (적요)
  counterpart_account text, -- 상대계좌번호
  counterpart_bank text, -- 상대은행
  memo text, -- 메모
  transaction_type text, -- 거래구분 (BC, 체크, 펌이체 등)
  counterpart_name text, -- 상대계좌예금주명
  -- AI 분개 결과
  debit_account text, -- 차변 계정과목
  credit_account text, -- 대변 계정과목
  vat_deductible boolean, -- 부가세 공제 여부
  ai_confidence real, -- AI 확신도 (0~1)
  ai_reason text, -- AI 판단 근거
  status text default 'pending' check (status in ('pending', 'classified', 'confirmed', 'rejected')),
  created_at timestamptz default now()
);

-- 인덱스
create index idx_transactions_upload on transactions(upload_id);
create index idx_transactions_date on transactions(transaction_date);
create index idx_transactions_status on transactions(status);
