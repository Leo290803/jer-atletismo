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

create table if not exists public.sumula_historico_acoes (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid not null references public.sumulas_digitais(id) on delete cascade,
  token_acesso text,
  acao text not null,
  arbitro_nome text,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sumula_resultados_sumula_id on public.sumula_resultados(sumula_id);
create index if not exists idx_sumula_resultados_classificacao on public.sumula_resultados(classificacao);
create index if not exists idx_sumula_historico_sumula_id on public.sumula_historico_acoes(sumula_id);
create index if not exists idx_sumula_historico_created_at on public.sumula_historico_acoes(created_at desc);

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
alter table public.sumula_historico_acoes enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'role') in ('admin', 'organizador', 'service_role'), false);
$$;

create or replace function public.is_arbitro_claim()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'role') in ('arbitro', 'service_role'), false);
$$;

create or replace function public.preparar_sumula_resultados_por_token(
  p_sumula_id uuid,
  p_token_acesso text,
  p_atleta_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sumula_id uuid;
  v_linhas integer;
begin
  if coalesce(trim(p_token_acesso), '') = '' then
    raise exception 'TOKEN_INVALIDO';
  end if;

  select s.id
    into v_sumula_id
  from public.sumulas_digitais s
  where s.id = p_sumula_id
    and s.token_acesso = p_token_acesso
    and (s.expires_at is null or s.expires_at > now())
    and s.status in ('ABERTA', 'EM_ANDAMENTO');

  if v_sumula_id is null then
    raise exception 'SUMULA_INVALIDA_OU_BLOQUEADA';
  end if;

  insert into public.sumula_resultados (sumula_id, atleta_id, tentativas)
  select v_sumula_id, atleta_id, array['', '', '', '', '', '']::text[]
  from unnest(coalesce(p_atleta_ids, array[]::uuid[])) atleta_id
  on conflict (sumula_id, atleta_id) do nothing;

  get diagnostics v_linhas = row_count;
  return coalesce(v_linhas, 0);
end;
$$;

create or replace function public.gravar_sumula_resultados_por_token(
  p_sumula_id uuid,
  p_token_acesso text,
  p_resultados jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sumula_id uuid;
  v_linhas integer := 0;
  v_item jsonb;
begin
  if coalesce(trim(p_token_acesso), '') = '' then
    raise exception 'TOKEN_INVALIDO';
  end if;

  select s.id
    into v_sumula_id
  from public.sumulas_digitais s
  where s.id = p_sumula_id
    and s.token_acesso = p_token_acesso
    and (s.expires_at is null or s.expires_at > now())
    and s.status in ('ABERTA', 'EM_ANDAMENTO');

  if v_sumula_id is null then
    raise exception 'SUMULA_INVALIDA_OU_BLOQUEADA';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_resultados, '[]'::jsonb))
  loop
    insert into public.sumula_resultados (
      id,
      sumula_id,
      atleta_id,
      resultado,
      tempo,
      marca,
      observacao,
      classificacao,
      tentativas,
      updated_at
    )
    values (
      coalesce(nullif(v_item ->> 'id', '')::uuid, gen_random_uuid()),
      v_sumula_id,
      nullif(v_item ->> 'atleta_id', '')::uuid,
      coalesce(v_item ->> 'resultado', ''),
      coalesce(v_item ->> 'tempo', ''),
      nullif(v_item ->> 'marca', '')::text,
      coalesce(v_item ->> 'observacao', ''),
      nullif(v_item ->> 'classificacao', '')::integer,
      coalesce(
        array(
          select jsonb_array_elements_text(coalesce(v_item -> 'tentativas', '[]'::jsonb))
        ),
        array['', '', '', '', '', '']::text[]
      ),
      now()
    )
    on conflict (sumula_id, atleta_id)
    do update set
      resultado = excluded.resultado,
      tempo = excluded.tempo,
      marca = excluded.marca,
      observacao = excluded.observacao,
      classificacao = excluded.classificacao,
      tentativas = excluded.tentativas,
      updated_at = now();

    v_linhas := v_linhas + 1;
  end loop;

  return v_linhas;
end;
$$;

create or replace function public.vincular_arbitro_sumula_por_token(
  p_sumula_id uuid,
  p_token_acesso text,
  p_arbitro_nome text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sumulas_digitais s
    set arbitro_nome = p_arbitro_nome
  where s.id = p_sumula_id
    and s.token_acesso = p_token_acesso
    and (s.expires_at is null or s.expires_at > now())
    and s.status in ('ABERTA', 'EM_ANDAMENTO')
    and (s.arbitro_nome is null or btrim(s.arbitro_nome) = '' or lower(btrim(s.arbitro_nome)) = lower(btrim(coalesce(p_arbitro_nome, ''))));

  return found;
end;
$$;

create or replace function public.atualizar_status_sumula_por_token(
  p_sumula_id uuid,
  p_token_acesso text,
  p_status text,
  p_enviada_em timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('ABERTA', 'EM_ANDAMENTO', 'ENVIADA', 'BLOQUEADA') then
    raise exception 'STATUS_INVALIDO';
  end if;

  update public.sumulas_digitais s
    set
      status = p_status,
      enviada_em = case when p_status = 'ENVIADA' then coalesce(p_enviada_em, now()) else s.enviada_em end
  where s.id = p_sumula_id
    and s.token_acesso = p_token_acesso
    and (s.expires_at is null or s.expires_at > now())
    and (
      (p_status = 'EM_ANDAMENTO' and s.status in ('ABERTA', 'EM_ANDAMENTO'))
      or (p_status = 'ENVIADA' and s.status in ('ABERTA', 'EM_ANDAMENTO'))
      or (p_status = s.status)
    );

  return found;
end;
$$;

create or replace function public.registrar_historico_sumula_por_token(
  p_sumula_id uuid,
  p_token_acesso text,
  p_acao text,
  p_arbitro_nome text default null,
  p_detalhes jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_acao), '') = '' then
    raise exception 'ACAO_INVALIDA';
  end if;

  insert into public.sumula_historico_acoes (
    sumula_id,
    token_acesso,
    acao,
    arbitro_nome,
    detalhes
  )
  select
    s.id,
    p_token_acesso,
    p_acao,
    p_arbitro_nome,
    coalesce(p_detalhes, '{}'::jsonb)
  from public.sumulas_digitais s
  where s.id = p_sumula_id
    and s.token_acesso = p_token_acesso
    and (s.expires_at is null or s.expires_at > now());

  return found;
end;
$$;

grant execute on function public.preparar_sumula_resultados_por_token(uuid, text, uuid[]) to anon, authenticated;
grant execute on function public.gravar_sumula_resultados_por_token(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.vincular_arbitro_sumula_por_token(uuid, text, text) to anon, authenticated;
grant execute on function public.atualizar_status_sumula_por_token(uuid, text, text, timestamptz) to anon, authenticated;
grant execute on function public.registrar_historico_sumula_por_token(uuid, text, text, text, jsonb) to anon, authenticated;

-- Politicas recomendadas:
-- 1) leitura livre para manter paineis publicos/admin funcionando no cliente anon
-- 2) escrita restrita a admin, service_role e arbitro autenticado por claim
-- 3) para arbitro por token de URL, recomenda-se emitir JWT com role=arbitro
--    e claim 'sumula_token' antes de gravar, ou salvar via Edge Function autenticada

drop policy if exists "sumulas_digitais_select" on public.sumulas_digitais;
create policy "sumulas_digitais_select"
on public.sumulas_digitais
for select
using (true);

drop policy if exists "sumulas_digitais_insert" on public.sumulas_digitais;
create policy "sumulas_digitais_insert"
on public.sumulas_digitais
for insert
with check (public.is_admin());

drop policy if exists "sumulas_digitais_update" on public.sumulas_digitais;
create policy "sumulas_digitais_update"
on public.sumulas_digitais
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sumulas_digitais_delete" on public.sumulas_digitais;
create policy "sumulas_digitais_delete"
on public.sumulas_digitais
for delete
using (public.is_admin());

drop policy if exists "sumula_resultados_select" on public.sumula_resultados;
create policy "sumula_resultados_select"
on public.sumula_resultados
for select
using (true);

drop policy if exists "sumula_resultados_insert" on public.sumula_resultados;
create policy "sumula_resultados_insert"
on public.sumula_resultados
for insert
with check (
  public.is_admin()
  or (
    public.is_arbitro_claim()
    and exists (
      select 1
      from public.sumulas_digitais s
      where s.id = sumula_id
        and (s.status = 'ABERTA' or s.status = 'EM_ANDAMENTO')
        and coalesce(auth.jwt() ->> 'sumula_token', '') <> ''
        and s.token_acesso = auth.jwt() ->> 'sumula_token'
    )
  )
);

drop policy if exists "sumula_resultados_update" on public.sumula_resultados;
create policy "sumula_resultados_update"
on public.sumula_resultados
for update
using (
  public.is_admin()
  or (
    public.is_arbitro_claim()
    and exists (
      select 1
      from public.sumulas_digitais s
      where s.id = sumula_id
        and (s.status = 'ABERTA' or s.status = 'EM_ANDAMENTO')
        and coalesce(auth.jwt() ->> 'sumula_token', '') <> ''
        and s.token_acesso = auth.jwt() ->> 'sumula_token'
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_arbitro_claim()
    and exists (
      select 1
      from public.sumulas_digitais s
      where s.id = sumula_id
        and (s.status = 'ABERTA' or s.status = 'EM_ANDAMENTO')
        and coalesce(auth.jwt() ->> 'sumula_token', '') <> ''
        and s.token_acesso = auth.jwt() ->> 'sumula_token'
    )
  )
);

drop policy if exists "sumula_resultados_delete" on public.sumula_resultados;
create policy "sumula_resultados_delete"
on public.sumula_resultados
for delete
using (public.is_admin());

drop policy if exists "sumula_historico_select" on public.sumula_historico_acoes;
create policy "sumula_historico_select"
on public.sumula_historico_acoes
for select
using (true);

drop policy if exists "sumula_historico_insert" on public.sumula_historico_acoes;
create policy "sumula_historico_insert"
on public.sumula_historico_acoes
for insert
with check (public.is_admin());
