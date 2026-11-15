-- T2 (2026-11-15): the 450 students seeded on 2026-11-04 under 15 real college
-- names (institutions 5-19) are synthetic: no login, created within one second,
-- yet is_verified = true. Employers must never see them as verified real people.
-- Adds students.is_synthetic and flags exactly those rows. Guarded: aborts unless
-- the selection is the expected 450 rows.

alter table public.students
  add column if not exists is_synthetic boolean not null default false;

comment on column public.students.is_synthetic is
  'Seeded/demo record, not a real person. Excluded from employer search and partner sync.';

do $$
declare
  n int;
begin
  select count(*) into n
  from public.students
  where institution_id between 5 and 19
    and auth_id is null
    and created_at >= '2026-11-04 08:46:00+00'
    and created_at <  '2026-11-04 08:47:00+00';

  if n <> 450 then
    raise exception 'T2 guard: expected 450 seeded students, found %', n;
  end if;

  update public.students
     set is_synthetic = true,
         is_verified  = false
   where institution_id between 5 and 19
     and auth_id is null
     and created_at >= '2026-11-04 08:46:00+00'
     and created_at <  '2026-11-04 08:47:00+00';
end $$;

create index if not exists students_is_synthetic_idx on public.students (is_synthetic) where is_synthetic;
