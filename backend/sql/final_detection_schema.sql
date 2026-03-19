-- Final detection-domain schema (bigint + timestamp)
-- Idempotent: safe to run multiple times

create extension if not exists pg_trgm;

-- Drop policies first for idempotent re-run
DROP POLICY IF EXISTS "inspection_tasks_owner_select" ON public.inspection_tasks;
DROP POLICY IF EXISTS "inspection_tasks_owner_insert" ON public.inspection_tasks;
DROP POLICY IF EXISTS "inspection_tasks_owner_update" ON public.inspection_tasks;

DROP POLICY IF EXISTS "task_images_owner_select" ON public.task_images;
DROP POLICY IF EXISTS "task_images_owner_insert" ON public.task_images;
DROP POLICY IF EXISTS "task_images_owner_update" ON public.task_images;

DROP POLICY IF EXISTS "detection_results_owner_select" ON public.detection_results;
DROP POLICY IF EXISTS "detection_results_owner_insert" ON public.detection_results;
DROP POLICY IF EXISTS "detection_results_owner_update" ON public.detection_results;

DROP POLICY IF EXISTS "result_regions_owner_select" ON public.result_regions;
DROP POLICY IF EXISTS "result_regions_owner_insert" ON public.result_regions;
DROP POLICY IF EXISTS "result_regions_owner_update" ON public.result_regions;

-- Remove obsolete table if still exists
drop table if exists public.operation_logs cascade;

-- Tables
create table if not exists public.inspection_tasks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  building_name text not null,
  location_floor int,
  location_section text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  summary text,
  stain_detected boolean,
  stain_type text,
  affected_area_percentage numeric(6, 2),
  error_message text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create table if not exists public.task_images (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.inspection_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_name text,
  original_image_path text not null,
  processed_image_path text,
  mime_type text,
  file_size bigint,
  created_at timestamp not null default current_timestamp
);

create table if not exists public.detection_results (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.inspection_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  summary text,
  metrics jsonb,
  error_message text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp,
  processed_at timestamp
);

create table if not exists public.result_regions (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.inspection_tasks(id) on delete cascade,
  label text not null,
  confidence numeric(5, 4) not null,
  x1 numeric(8, 5) not null,
  y1 numeric(8, 5) not null,
  x2 numeric(8, 5) not null,
  y2 numeric(8, 5) not null,
  created_at timestamp not null default current_timestamp
);

-- Indexes
create index if not exists idx_inspection_tasks_user_created
  on public.inspection_tasks(user_id, created_at desc);

create index if not exists idx_inspection_tasks_user_status_created
  on public.inspection_tasks(user_id, status, created_at desc);

create index if not exists idx_inspection_tasks_status
  on public.inspection_tasks(status);

create index if not exists idx_inspection_tasks_building_name_trgm
  on public.inspection_tasks using gin (building_name gin_trgm_ops);

create index if not exists idx_task_images_task_id on public.task_images(task_id);
create index if not exists idx_task_images_user_id on public.task_images(user_id);

create unique index if not exists uq_detection_results_task_id on public.detection_results(task_id);

create index if not exists idx_result_regions_task_id on public.result_regions(task_id);

-- RLS
alter table public.inspection_tasks enable row level security;
alter table public.task_images enable row level security;
alter table public.detection_results enable row level security;
alter table public.result_regions enable row level security;

-- Policies
create policy "inspection_tasks_owner_select"
  on public.inspection_tasks
  for select
  using (auth.uid() = user_id);

create policy "inspection_tasks_owner_insert"
  on public.inspection_tasks
  for insert
  with check (auth.uid() = user_id);

create policy "inspection_tasks_owner_update"
  on public.inspection_tasks
  for update
  using (auth.uid() = user_id);

create policy "task_images_owner_select"
  on public.task_images
  for select
  using (auth.uid() = user_id);

create policy "task_images_owner_insert"
  on public.task_images
  for insert
  with check (auth.uid() = user_id);

create policy "task_images_owner_update"
  on public.task_images
  for update
  using (auth.uid() = user_id);

create policy "detection_results_owner_select"
  on public.detection_results
  for select
  using (auth.uid() = user_id);

create policy "detection_results_owner_insert"
  on public.detection_results
  for insert
  with check (auth.uid() = user_id);

create policy "detection_results_owner_update"
  on public.detection_results
  for update
  using (auth.uid() = user_id);

create policy "result_regions_owner_select"
  on public.result_regions
  for select
  using (
    exists (
      select 1
      from public.inspection_tasks t
      where t.id = result_regions.task_id
        and t.user_id = auth.uid()
    )
  );

create policy "result_regions_owner_insert"
  on public.result_regions
  for insert
  with check (
    exists (
      select 1
      from public.inspection_tasks t
      where t.id = result_regions.task_id
        and t.user_id = auth.uid()
    )
  );

create policy "result_regions_owner_update"
  on public.result_regions
  for update
  using (
    exists (
      select 1
      from public.inspection_tasks t
      where t.id = result_regions.task_id
        and t.user_id = auth.uid()
    )
  );
