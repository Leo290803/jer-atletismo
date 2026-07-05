-- Politicas de acesso da programacao.
-- Libera o painel autenticado para ler, inserir, editar e excluir somente a agenda.
-- Nao altera atletas, inscricoes, provas, series, sumulas ou resultados oficiais.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.programacao_atletismo to authenticated;

alter table public.programacao_atletismo enable row level security;

drop policy if exists "programacao_atletismo_select" on public.programacao_atletismo;
create policy "programacao_atletismo_select"
on public.programacao_atletismo
for select
to authenticated
using (true);

drop policy if exists "programacao_atletismo_insert" on public.programacao_atletismo;
create policy "programacao_atletismo_insert"
on public.programacao_atletismo
for insert
to authenticated
with check (true);

drop policy if exists "programacao_atletismo_update" on public.programacao_atletismo;
create policy "programacao_atletismo_update"
on public.programacao_atletismo
for update
to authenticated
using (true)
with check (true);

drop policy if exists "programacao_atletismo_delete" on public.programacao_atletismo;
create policy "programacao_atletismo_delete"
on public.programacao_atletismo
for delete
to authenticated
using (true);
