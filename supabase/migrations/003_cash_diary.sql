-- 금전일기장: 사용자가 자유 텍스트로 기록한 거래 메모
create table if not exists cash_diary (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  raw_text text not null,              -- 원문 ("거래처 사람과 59000원 식사")
  parsed_amount bigint,                -- 파싱된 금액
  parsed_counterpart text,             -- 파싱된 상대방/거래처
  parsed_category text,                -- 파싱된 용도 (식사, 교통, 사무용품 등)
  parsed_description text,             -- 정리된 설명
  receipt_path text,                   -- 영수증 이미지 Storage 경로
  matched_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_diary_date on cash_diary(entry_date);
create index if not exists idx_diary_matched on cash_diary(matched_transaction_id);
