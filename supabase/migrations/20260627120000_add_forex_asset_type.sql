-- Allow forex asset type and remove legacy silver (SI/XAG) rows.
alter table public.market_performances
  drop constraint market_performances_asset_type_check;

alter table public.market_performances
  add constraint market_performances_asset_type_check
  check (asset_type in ('commodity', 'crypto', 'stock', 'forex'));

comment on column public.market_performances.asset_type is 'Asset class: commodity, crypto, stock, or forex.';

delete from public.market_performances
where asset_symbol in ('SI', 'XAG');
