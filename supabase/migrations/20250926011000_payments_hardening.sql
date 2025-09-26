-- Strengthen payments table with constraints and indexes

alter table public.payments
  add constraint payments_status_check
  check (status in ('initiated','submitted','mined','confirmed','failed','cancelled'));

-- Ensure payment is linked to a known profile (by unique nullifier)
alter table public.payments
  add constraint payments_nullifier_fk
  foreign key (worldcoin_nullifier)
  references public.profiles(worldcoin_nullifier)
  on delete restrict;

-- Helpful indexes
create index if not exists payments_txid_idx on public.payments (transaction_id);
create index if not exists payments_to_address_idx on public.payments (to_address);

