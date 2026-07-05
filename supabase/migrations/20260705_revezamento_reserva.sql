-- Revezamento: marcacao manual de atleta reserva na sumula.
-- Aditivo e seguro: apenas adiciona a coluna reserva na tabela de resultados,
-- com default false, sem alterar dados existentes.

alter table public.resultados
  add column if not exists reserva boolean not null default false;
