-- PARTE 1 - Tabelas manuais da sumula
-- Rode este arquivo primeiro no SQL Editor do Supabase.
-- Nao altera atletas, inscricoes, provas, series ou resultados oficiais.

create extension if not exists pgcrypto;

create table if not exists public.competicoes_manuais (
  id uuid primary key default gen_random_uuid(),
  nome_evento text,
  local_evento text,
  data_inicio date,
  data_fim date,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table if not exists public.provas_manuais (
  id uuid primary key default gen_random_uuid(),
  competicao_id uuid not null references public.competicoes_manuais(id) on delete cascade,
  prova text,
  categoria text,
  naipe text,
  fase text,
  tipo text not null default 'corrida',
  data_prova date,
  total_series integer not null default 1,
  raias_por_serie integer not null default 8,
  ordem integer not null default 1,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table if not exists public.prova_manual_linhas (
  id uuid primary key default gen_random_uuid(),
  prova_manual_id uuid not null references public.provas_manuais(id) on delete cascade,
  serie integer not null default 1,
  raia integer,
  numero text,
  atleta_nome text,
  escola_nome text,
  nascimento text,
  tentativa1 text,
  tentativa2 text,
  tentativa3 text,
  resultado text,
  colocacao integer,
  status text not null default 'OK',
  ordem integer not null default 1,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table if not exists public.sumulas_manuais (
  id uuid primary key default gen_random_uuid(),
  token_acesso text not null unique,
  status text not null default 'ABERTA',
  competicao_manual_id text,
  prova_manual_id text,
  nome_evento text,
  local_evento text,
  data_inicio date,
  data_fim date,
  prova text,
  categoria text,
  naipe text,
  fase text,
  tipo text not null default 'corrida',
  data_prova date,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  enviada_em timestamptz,
  bloqueada_em timestamptz
);

alter table public.sumulas_manuais
  add column if not exists competicao_manual_id text,
  add column if not exists prova_manual_id text,
  add column if not exists local_evento text,
  add column if not exists data_inicio date,
  add column if not exists data_fim date;

create table if not exists public.sumula_manual_linhas (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid not null references public.sumulas_manuais(id) on delete cascade,
  serie integer not null default 1,
  raia integer,
  numero text,
  atleta_nome text,
  escola_nome text,
  nascimento text,
  tentativa1 text,
  tentativa2 text,
  tentativa3 text,
  resultado text,
  colocacao integer,
  status text not null default 'OK',
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create index if not exists idx_provas_manuais_competicao_id on public.provas_manuais(competicao_id);
create index if not exists idx_prova_manual_linhas_prova_id on public.prova_manual_linhas(prova_manual_id);
create index if not exists idx_sumulas_manuais_token on public.sumulas_manuais(token_acesso);
create index if not exists idx_sumulas_manuais_status on public.sumulas_manuais(status);
create index if not exists idx_sumula_manual_linhas_sumula_id on public.sumula_manual_linhas(sumula_id);

alter table public.competicoes_manuais disable row level security;
alter table public.provas_manuais disable row level security;
alter table public.prova_manual_linhas disable row level security;
alter table public.sumulas_manuais disable row level security;
alter table public.sumula_manual_linhas disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.competicoes_manuais to anon, authenticated;
grant select, insert, update, delete on table public.provas_manuais to anon, authenticated;
grant select, insert, update, delete on table public.prova_manual_linhas to anon, authenticated;
grant select, insert, update, delete on table public.sumulas_manuais to anon, authenticated;
grant select, insert, update, delete on table public.sumula_manual_linhas to anon, authenticated;
