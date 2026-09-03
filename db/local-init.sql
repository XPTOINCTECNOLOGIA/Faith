-- ============================================================================
-- Portal de Oportunidades — bootstrap LOCAL (docker-compose apenas)
-- ============================================================================
-- Recria o mínimo da base corporativa compartilhada (identidade + RBAC +
-- helpers + stubs de auth/storage) para que a migration oficial
-- supabase/migrations/0073_portal_oportunidades.sql aplique num Postgres vazio.
-- NUNCA aplicar em homologação/produção — lá a base compartilhada já existe.
-- ============================================================================

begin;

-- Stubs dos schemas gerenciados pelo Supabase -------------------------------

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);

-- Identidade e RBAC compartilhados (subset do 0001 do ecossistema) ----------

create table if not exists public.profiles (
  id          bigint generated always as identity primary key,
  name        varchar(100) not null unique,
  description text,
  level       integer not null default 0,
  active      boolean not null default true,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id          bigint generated always as identity primary key,
  code        varchar(100) not null unique,
  name        varchar(255) not null,
  description text,
  module      varchar(100) not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.profile_permissions (
  id            bigint generated always as identity primary key,
  profile_id    bigint not null references public.profiles(id) on delete cascade,
  permission_id bigint not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (profile_id, permission_id)
);

create table if not exists public.users (
  id           bigint generated always as identity primary key,
  auth_user_id uuid unique,
  email        varchar(255) not null unique,
  full_name    varchar(255) not null,
  display_name varchar(255),
  profile_id   bigint not null references public.profiles(id),
  active       boolean not null default true,
  blocked      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Helpers usados pelas políticas RLS (mesma assinatura do ecossistema) ------

create or replace function public.current_app_user_id()
returns bigint
language sql stable security definer
as $$
  select u.id from public.users u where u.auth_user_id = auth.uid();
$$;

create or replace function public.has_permission(perm_code varchar)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1
      from public.users u
      join public.profile_permissions pp on pp.profile_id = u.profile_id
      join public.permissions pe on pe.id = pp.permission_id
     where u.auth_user_id = auth.uid()
       and u.active and not u.blocked
       and pe.code = perm_code and pe.active
  );
$$;

-- Seeds mínimos de desenvolvimento ------------------------------------------

insert into public.profiles (name, level, is_system)
select v.name, v.level, true
from (values
  ('SUPER ADMIN', 100),
  ('BOARD', 90),
  ('CEO', 80),
  ('GESTOR', 40),
  ('COLABORADOR', 20)
) as v(name, level)
where not exists (select 1 from public.profiles p where p.name = v.name);

insert into public.users (auth_user_id, email, full_name, profile_id)
select '00000000-0000-0000-0000-000000000001'::uuid,
       'dev@xptoinc.com.br', 'Usuário de Desenvolvimento',
       (select id from public.profiles where name = 'SUPER ADMIN')
where not exists (select 1 from public.users where email = 'dev@xptoinc.com.br');

commit;
