-- KSL Build Lab future database schema.
-- Designed for Supabase/Postgres when the static MVP graduates from local demo mode.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_projects (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid,
  project_name text not null check (char_length(project_name) >= 3),
  description text not null,
  niche text,
  target_audience text not null,
  business_model text not null,
  website_url text,
  repository_url text,
  build_method text not null default 'no-code',
  current_stage text not null default 'discover',
  traffic_target integer not null default 0 check (traffic_target >= 0),
  lead_target integer not null default 0 check (lead_target >= 0),
  revenue_target numeric(12,2) not null default 0 check (revenue_target >= 0),
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists curriculum_stages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  stage_order integer not null unique,
  title text not null,
  goal text not null,
  deliverable text not null,
  summary text not null,
  free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references curriculum_stages(id) on delete cascade,
  title text not null,
  body text not null,
  access_tier text not null default 'free',
  lesson_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stage_id, lesson_order)
);

create table if not exists stage_tasks (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references curriculum_stages(id) on delete cascade,
  task_order integer not null,
  title text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stage_id, task_order)
);

create table if not exists project_task_progress (
  project_id uuid not null references learning_projects(id) on delete cascade,
  task_id uuid not null references stage_tasks(id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(project_id, task_id)
);

create table if not exists project_stage_progress (
  project_id uuid not null references learning_projects(id) on delete cascade,
  stage_id uuid not null references curriculum_stages(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(project_id, stage_id)
);

create table if not exists worksheet_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references learning_projects(id) on delete cascade,
  stage_id uuid not null references curriculum_stages(id) on delete cascade,
  field_key text not null,
  response text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, stage_id, field_key)
);

create table if not exists resource_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references curriculum_stages(id) on delete set null,
  category_id uuid references resource_categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null,
  resource_type text not null,
  difficulty text not null,
  access_tier text not null default 'free',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references learning_projects(id) on delete cascade,
  stage_id uuid references curriculum_stages(id) on delete set null,
  label text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learner_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references learning_projects(id) on delete cascade,
  traffic integer not null default 0 check (traffic >= 0),
  leads integer not null default 0 check (leads >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  captured_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, captured_on)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','learning_projects','curriculum_stages','lessons','stage_tasks','project_task_progress','project_stage_progress','worksheet_responses','resource_categories','resources','milestones','subscriptions','learner_metrics']
  loop
    execute format('drop trigger if exists set_%I_updated_at on %I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end $$;

create index if not exists learning_projects_owner_idx on learning_projects(owner_profile_id);
create index if not exists resources_stage_idx on resources(stage_id);
create index if not exists task_progress_project_idx on project_task_progress(project_id);
create index if not exists worksheet_project_stage_idx on worksheet_responses(project_id, stage_id);
create index if not exists learner_metrics_project_date_idx on learner_metrics(project_id, captured_on desc);

alter table profiles enable row level security;
alter table learning_projects enable row level security;
alter table project_task_progress enable row level security;
alter table project_stage_progress enable row level security;
alter table worksheet_responses enable row level security;
alter table milestones enable row level security;
alter table subscriptions enable row level security;
alter table learner_metrics enable row level security;

-- Public curriculum/resource tables can be readable; private learner data is owner-scoped.
alter table curriculum_stages enable row level security;
alter table lessons enable row level security;
alter table stage_tasks enable row level security;
alter table resource_categories enable row level security;
alter table resources enable row level security;

create policy "Public curriculum stages are readable" on curriculum_stages for select using (true);
create policy "Public lessons are readable" on lessons for select using (true);
create policy "Public stage tasks are readable" on stage_tasks for select using (true);
create policy "Public resource categories are readable" on resource_categories for select using (true);
create policy "Public resources are readable" on resources for select using (true);

-- Replace auth.uid() relationship wiring when Supabase auth is connected.
create policy "Learners read own profile" on profiles for select using (auth.uid() = auth_user_id);
create policy "Learners update own profile" on profiles for update using (auth.uid() = auth_user_id);
create policy "Learners manage own projects" on learning_projects for all using (owner_profile_id in (select id from profiles where auth_user_id = auth.uid())) with check (owner_profile_id in (select id from profiles where auth_user_id = auth.uid()));
create policy "Learners manage own task progress" on project_task_progress for all using (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid()))) with check (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid())));
create policy "Learners manage own stage progress" on project_stage_progress for all using (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid()))) with check (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid())));
create policy "Learners manage own worksheet responses" on worksheet_responses for all using (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid()))) with check (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid())));
create policy "Learners manage own milestones" on milestones for all using (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid()))) with check (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid())));
create policy "Learners read own subscriptions" on subscriptions for select using (profile_id in (select id from profiles where auth_user_id = auth.uid()));
create policy "Learners manage own metrics" on learner_metrics for all using (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid()))) with check (project_id in (select id from learning_projects where owner_profile_id in (select id from profiles where auth_user_id = auth.uid())));
