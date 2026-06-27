-- Daily market performance refresh via Edge Function + pg_cron/pg_net.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_token text;
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'pocketwallet_service_role_key'
  ) then
    select (regexp_match(command, '"Authorization": "Bearer ([^"]+)"'))[1]
    into existing_token
    from cron.job
    where jobname = 'update-market-data-daily';

    if existing_token is not null then
      perform vault.create_secret(
        existing_token,
        'pocketwallet_service_role_key',
        'Service role bearer token for update-market-performances cron'
      );
    end if;
  end if;
end;
$$;

create or replace function public.invoke_update_market_performances()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  service_role_key text;
  request_id bigint;
begin
  select decrypted_secret
  into service_role_key
  from vault.decrypted_secrets
  where name = 'pocketwallet_service_role_key'
  limit 1;

  if service_role_key is null or length(trim(service_role_key)) = 0 then
    raise exception 'Missing vault secret: pocketwallet_service_role_key';
  end if;

  select net.http_post(
    url := 'https://mitrxxvwccjzsvcdptdi.supabase.co/functions/v1/update-market-performances',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_update_market_performances() from public;
grant execute on function public.invoke_update_market_performances() to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'update-market-data-daily';

select cron.schedule(
  'update-market-data-daily',
  '0 2 * * *',
  $$select public.invoke_update_market_performances();$$
);
