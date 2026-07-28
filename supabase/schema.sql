-- CleanWorks Pro platform schema
-- Structured with company_id on every table so this can become multi-tenant
-- later without a rewrite, even though today only one company row exists.

create extension if not exists "uuid-ossp";

-- ---------- CORE ----------

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_email text not null,
  created_at timestamptz not null default now()
);

-- Extends Supabase's built-in auth.users with app-specific fields
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'technician')),
  created_at timestamptz not null default now()
);

-- ---------- PROPERTIES & SCHEDULING ----------

create table properties (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address text,
  ical_url text,
  host_name text,
  host_email text,
  report_frequency text check (report_frequency in ('weekly', 'biweekly', 'monthly')),
  checklist_template_id uuid, -- fk added after checklist_templates exists
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table properties
  add constraint properties_checklist_template_fk
  foreign key (checklist_template_id) references checklist_templates(id);

create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  checkout_date date not null,
  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'needs_attention')),
  checklist_template_id uuid references checklist_templates(id),
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  -- prevents the calendar sync from ever double-booking the same checkout
  unique (property_id, checkout_date)
);

-- ---------- FIELD EXECUTION ----------

create table job_checklist_responses (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (job_id, checklist_item_id)
);

create table job_photos (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ---------- REPORTING ----------

create table report_log (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  sent_at timestamptz not null default now()
);

-- ---------- ROW LEVEL SECURITY ----------
-- Every table is scoped to the caller's company via their profile row.

alter table companies enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_items enable row level security;
alter table jobs enable row level security;
alter table job_checklist_responses enable row level security;
alter table job_photos enable row level security;
alter table report_log enable row level security;

create or replace function auth_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from profiles where id = auth.uid();
$$;

create policy "company members can read/write their own profile"
  on profiles for all using (id = auth.uid());

create policy "company members see their own company"
  on companies for select using (id = auth_company_id());

create policy "company members manage their own properties"
  on properties for all using (company_id = auth_company_id());

create policy "company members manage their own checklist templates"
  on checklist_templates for all using (company_id = auth_company_id());

create policy "company members manage checklist items via template"
  on checklist_items for all using (
    template_id in (select id from checklist_templates where company_id = auth_company_id())
  );

create policy "company members manage their own jobs"
  on jobs for all using (company_id = auth_company_id());

create policy "company members manage checklist responses via job"
  on job_checklist_responses for all using (
    job_id in (select id from jobs where company_id = auth_company_id())
  );

create policy "company members manage photos via job"
  on job_photos for all using (
    job_id in (select id from jobs where company_id = auth_company_id())
  );

create policy "company members read their own report log"
  on report_log for select using (
    property_id in (select id from properties where company_id = auth_company_id())
  );

-- ---------- SEED: your one company ----------
-- Replace the email before running, then create your Supabase Auth user
-- with the same email and link it via a profiles row (see README).

insert into companies (name, owner_email) values ('CleanWorks Pro', 'cleanworksprocleaning@gmail.com');
