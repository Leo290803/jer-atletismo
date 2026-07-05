-- Programacao oficial do atletismo.
-- Guarda somente a agenda/etapas. Nao altera atletas, inscricoes, provas, series ou resultados oficiais.

create extension if not exists pgcrypto;

create table if not exists public.programacao_atletismo (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  etapa_numero integer not null,
  data date not null,
  turno text not null,
  horario text not null,
  prova_texto text not null,
  categoria text,
  naipe text,
  quantidade text,
  fase_programada text,
  observacao text,
  prova_id uuid references public.provas(id) on delete set null,
  ordem integer not null default 1,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create index if not exists idx_programacao_atletismo_data on public.programacao_atletismo(data);
create index if not exists idx_programacao_atletismo_etapa on public.programacao_atletismo(etapa_numero);
create index if not exists idx_programacao_atletismo_prova_id on public.programacao_atletismo(prova_id);

alter table public.programacao_atletismo disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.programacao_atletismo to anon, authenticated;
