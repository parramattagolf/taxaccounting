-- uploads 테이블에 파일 유형, 저장경로, 파일크기, 해시(중복방지) 추가
alter table uploads add column if not exists file_type text default 'bank_statement';
alter table uploads add column if not exists storage_path text;
alter table uploads add column if not exists file_size bigint default 0;
alter table uploads add column if not exists file_hash text; -- SHA-256 for dedup

-- file_type: bank_statement, credit_card, tax_invoice, payroll, receipt
-- 인덱스
create index if not exists idx_uploads_file_type on uploads(file_type);
create index if not exists idx_uploads_created on uploads(created_at);
create index if not exists idx_uploads_file_hash on uploads(file_hash);

-- Storage 버킷 생성
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Storage 정책: service role만 접근 (admin client 사용)
create policy "Service role full access" on storage.objects
  for all using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');
