-- Payments table to track World Wallet (MiniKit) payment initiations and confirmations

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- client-facing reference (uuid without dashes)
  worldcoin_nullifier text not null, -- verified user making the payment
  amount_usd numeric(10,2) not null,
  to_address text not null,
  description text,
  status text not null default 'initiated', -- initiated | submitted | mined | confirmed | failed | cancelled
  transaction_id text,
  token_symbol text, -- WLD | USDC (nullable until known)
  token_amount_wei text, -- on-chain integer amount as string
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_reference_idx on public.payments (reference);
create index if not exists payments_nullifier_idx on public.payments (worldcoin_nullifier);
create index if not exists payments_status_idx on public.payments (status);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

