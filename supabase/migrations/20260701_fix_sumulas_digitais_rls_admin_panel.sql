-- Libera o painel administrativo autenticado para criar e gerenciar sumulas digitais.
-- O acesso publico do arbitro continua via token/RPC; anonimo nao ganha escrita direta aqui.

alter table public.sumulas_digitais enable row level security;
alter table public.sumula_resultados enable row level security;
alter table public.sumula_historico_acoes enable row level security;

drop policy if exists "sumulas_digitais_insert" on public.sumulas_digitais;
create policy "sumulas_digitais_insert"
on public.sumulas_digitais
for insert
to authenticated
with check (true);

drop policy if exists "sumulas_digitais_update" on public.sumulas_digitais;
create policy "sumulas_digitais_update"
on public.sumulas_digitais
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sumulas_digitais_delete" on public.sumulas_digitais;
create policy "sumulas_digitais_delete"
on public.sumulas_digitais
for delete
to authenticated
using (true);

drop policy if exists "sumula_resultados_insert" on public.sumula_resultados;
create policy "sumula_resultados_insert"
on public.sumula_resultados
for insert
to authenticated
with check (true);

drop policy if exists "sumula_resultados_update" on public.sumula_resultados;
create policy "sumula_resultados_update"
on public.sumula_resultados
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sumula_resultados_delete" on public.sumula_resultados;
create policy "sumula_resultados_delete"
on public.sumula_resultados
for delete
to authenticated
using (true);

drop policy if exists "sumula_historico_insert" on public.sumula_historico_acoes;
create policy "sumula_historico_insert"
on public.sumula_historico_acoes
for insert
to authenticated
with check (true);
