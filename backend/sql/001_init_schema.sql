-- Enable extension
create extension if not exists pgcrypto;

-- Core task table
create table if not exists public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  building_name text not null,
  location_floor int,
  location_section text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  summary text,
  stain_detected boolean,
  stain_type text,
  severity_level int,
  affected_area_percentage numeric(6, 2),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inspection_tasks_user_created
  on public.inspection_tasks(user_id, created_at desc);

create index if not exists idx_inspection_tasks_status
  on public.inspection_tasks(status);

create table if not exists public.task_images (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.inspection_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_image_path text not null,
  processed_image_path text,
  thumbnail_path text,
  mime_type text,
  file_size bigint,
  image_width int,
  image_height int,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_images_task_id on public.task_images(task_id);
create index if not exists idx_task_images_user_id on public.task_images(user_id);

create table if not exists public.detection_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.inspection_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_name text not null,
  model_version text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  summary text,
  metrics jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists uq_detection_results_task_id on public.detection_results(task_id);

create table if not exists public.result_regions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.inspection_tasks(id) on delete cascade,
  label text not null,
  confidence numeric(5, 4) not null,
  severity text not null,
  x1 numeric(8, 5) not null,
  y1 numeric(8, 5) not null,
  x2 numeric(8, 5) not null,
  y2 numeric(8, 5) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_result_regions_task_id on public.result_regions(task_id);

create table if not exists public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.inspection_tasks(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.inspection_tasks enable row level security;
alter table public.task_images enable row level security;
alter table public.detection_results enable row level security;
alter table public.result_regions enable row level security;
alter table public.operation_logs enable row level security;

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

create policy "operation_logs_owner_select"
  on public.operation_logs
  for select
  using (auth.uid() = user_id);

create policy "operation_logs_owner_insert"
  on public.operation_logs
  for insert
  with check (auth.uid() = user_id);

-- Storage bucket and policies
insert into storage.buckets (id, name, public)
values ('stain-images', 'stain-images', false)
on conflict (id) do nothing;

create policy "storage_owner_select"
  on storage.objects
  for select
  using (
    bucket_id = 'stain-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "storage_owner_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'stain-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "storage_owner_update"
  on storage.objects
  for update
  using (
    bucket_id = 'stain-images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
