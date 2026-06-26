-- Monthly asset performance benchmarks for budget investment recommendations.
create table public.market_performances (
  id uuid primary key default gen_random_uuid(),
  asset_name text not null,
  asset_symbol text not null,
  asset_type text not null check (asset_type in ('commodity', 'crypto', 'stock')),
  change_pct double precision not null,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  updated_at timestamptz not null default now(),
  constraint market_performances_asset_symbol_period_key unique (asset_symbol, period)
);

comment on table public.market_performances is 'Monthly percentage change for investment assets used in budget recommendations.';
comment on column public.market_performances.asset_name is 'Human-readable asset label, e.g. Altın, Bitcoin.';
comment on column public.market_performances.asset_symbol is 'Asset ticker or code, e.g. GOLD, BTC, XAG.';
comment on column public.market_performances.asset_type is 'Asset class: commodity, crypto, or stock.';
comment on column public.market_performances.change_pct is 'Monthly percentage change for the given period.';
comment on column public.market_performances.period is 'Month key in YYYY-MM format.';

create index market_performances_period_idx on public.market_performances (period desc);
create index market_performances_period_change_pct_idx on public.market_performances (period, change_pct desc);

alter table public.market_performances enable row level security;

create policy "market_performances_select_all"
  on public.market_performances
  for select
  to anon, authenticated
  using (true);

create policy "market_performances_insert_admin"
  on public.market_performances
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

create policy "market_performances_update_admin"
  on public.market_performances
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

create policy "market_performances_delete_admin"
  on public.market_performances
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

create or replace function public.set_market_performances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger market_performances_updated_at
  before update on public.market_performances
  for each row
  execute function public.set_market_performances_updated_at();
