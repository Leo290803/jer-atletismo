-- Sumulas manuais/avulsas
-- Execute no SQL Editor do Supabase quando quiser habilitar a sumula digital manual.
-- Este script nao altera atletas, inscricoes, provas, series ou resultados oficiais.

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
  status text not null default 'ABERTA' check (status in ('ABERTA', 'EM_ANDAMENTO', 'ENVIADA', 'BLOQUEADA')),
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

create or replace function public.trg_set_atualizada_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

drop trigger if exists set_sumulas_manuais_timestamp on public.sumulas_manuais;
create trigger set_sumulas_manuais_timestamp
before update on public.sumulas_manuais
for each row execute function public.trg_set_atualizada_em();

drop trigger if exists set_competicoes_manuais_timestamp on public.competicoes_manuais;
create trigger set_competicoes_manuais_timestamp
before update on public.competicoes_manuais
for each row execute function public.trg_set_atualizada_em();

drop trigger if exists set_provas_manuais_timestamp on public.provas_manuais;
create trigger set_provas_manuais_timestamp
before update on public.provas_manuais
for each row execute function public.trg_set_atualizada_em();

drop trigger if exists set_prova_manual_linhas_timestamp on public.prova_manual_linhas;
create trigger set_prova_manual_linhas_timestamp
before update on public.prova_manual_linhas
for each row execute function public.trg_set_atualizada_em();

drop trigger if exists set_sumula_manual_linhas_timestamp on public.sumula_manual_linhas;
create trigger set_sumula_manual_linhas_timestamp
before update on public.sumula_manual_linhas
for each row execute function public.trg_set_atualizada_em();

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

create or replace function public.gravar_sumula_manual_por_token(
  p_token_acesso text,
  p_linhas jsonb,
  p_status text default 'EM_ANDAMENTO'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sumula_id uuid;
  v_linha jsonb;
  v_status text;
begin
  if coalesce(trim(p_token_acesso), '') = '' then
    raise exception 'TOKEN_INVALIDO';
  end if;

  select id
    into v_sumula_id
  from public.sumulas_manuais
  where token_acesso = p_token_acesso
    and status <> 'BLOQUEADA'
  limit 1;

  if v_sumula_id is null then
    raise exception 'SUMULA_NAO_ENCONTRADA_OU_BLOQUEADA';
  end if;

  for v_linha in select value from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb))
  loop
    update public.sumula_manual_linhas
       set tentativa1 = coalesce(v_linha ->> 'tentativa1', ''),
           tentativa2 = coalesce(v_linha ->> 'tentativa2', ''),
           tentativa3 = coalesce(v_linha ->> 'tentativa3', ''),
           resultado = coalesce(v_linha ->> 'resultado', ''),
           colocacao = nullif(v_linha ->> 'colocacao', '')::integer,
           status = coalesce(nullif(v_linha ->> 'status', ''), 'OK')
     where id = (v_linha ->> 'id')::uuid
       and sumula_id = v_sumula_id;
  end loop;

  v_status := coalesce(nullif(p_status, ''), 'EM_ANDAMENTO');
  if v_status not in ('ABERTA', 'EM_ANDAMENTO', 'ENVIADA') then
    v_status := 'EM_ANDAMENTO';
  end if;

  update public.sumulas_manuais
     set status = v_status,
         enviada_em = case when v_status = 'ENVIADA' then now() else enviada_em end
   where id = v_sumula_id;
end;
$$;

grant execute on function public.gravar_sumula_manual_por_token(text, jsonb, text) to anon, authenticated;
