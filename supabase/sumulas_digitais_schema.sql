-- JER Atletismo - Schema da Sumula Digital do Arbitro
-- Execute este script no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.sumulas_digitais (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references public.provas(id) on delete cascade,
  token_acesso text not null unique,
  status text not null default 'ABERTA' check (status in ('ABERTA', 'EM_ANDAMENTO', 'ENVIADA', 'BLOQUEADA')),
  arbitro_nome text,
  serie text,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  enviada_em timestamptz,
  bloqueada_em timestamptz,
  expires_at timestamptz
);

create index if not exists idx_sumulas_digitais_prova_id on public.sumulas_digitais(prova_id);
create index if not exists idx_sumulas_digitais_status on public.sumulas_digitais(status);
create index if not exists idx_sumulas_digitais_criada_em on public.sumulas_digitais(criada_em desc);

create table if not exists public.sumula_resultados (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid not null references public.sumulas_digitais(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  resultado text,
  tempo text,
  marca text,
  observacao text,
  classificacao integer,
  tentativas text[] not null default array['', '', '', '', '', ''],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sumula_id, atleta_id)
);

create index if not exists idx_sumula_resultados_sumula_id on public.sumula_resultados(sumula_id);
create index if not exists idx_sumula_resultados_classificacao on public.sumula_resultados(classificacao);

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trg_set_atualizada_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

drop trigger if exists set_sumulas_digitais_timestamp on public.sumulas_digitais;
create trigger set_sumulas_digitais_timestamp
before update on public.sumulas_digitais
for each row execute function public.trg_set_atualizada_em();

drop trigger if exists set_sumula_resultados_timestamp on public.sumula_resultados;
create trigger set_sumula_resultados_timestamp
before update on public.sumula_resultados
for each row execute function public.trg_set_updated_at();

alter table public.sumulas_digitais enable row level security;
alter table public.sumula_resultados enable row level security;

-- Ajuste estas politicas se voce tiver autenticacao por perfil.
drop policy if exists "sumulas_digitais_select" on public.sumulas_digitais;
create policy "sumulas_digitais_select"
on public.sumulas_digitais
for select
using (true);

drop policy if exists "sumulas_digitais_insert" on public.sumulas_digitais;
create policy "sumulas_digitais_insert"
on public.sumulas_digitais
for insert
with check (true);

drop policy if exists "sumulas_digitais_update" on public.sumulas_digitais;
create policy "sumulas_digitais_update"
on public.sumulas_digitais
for update
using (true)
with check (true);

drop policy if exists "sumula_resultados_select" on public.sumula_resultados;
create policy "sumula_resultados_select"
on public.sumula_resultados
for select
using (true);

drop policy if exists "sumula_resultados_insert" on public.sumula_resultados;
create policy "sumula_resultados_insert"
on public.sumula_resultados
for insert
with check (true);

drop policy if exists "sumula_resultados_update" on public.sumula_resultados;
create policy "sumula_resultados_update"
on public.sumula_resultados
for update
using (true)
with check (true);
