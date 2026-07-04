-- PARTE 2 - Funcao da sumula digital manual
-- Rode somente depois da PARTE 1 ter executado com sucesso.
-- Nao altera tabelas oficiais.

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
