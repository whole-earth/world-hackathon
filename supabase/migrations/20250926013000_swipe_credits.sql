-- Swipe credits: balance and ledger, with safe add/spend functions

create table if not exists public.user_credits (
  worldcoin_nullifier text primary key,
  balance integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  worldcoin_nullifier text not null,
  delta integer not null,
  reason text,
  theme_slug text,
  created_at timestamptz not null default now()
);

create index if not exists credits_ledger_nullifier_idx on public.credits_ledger (worldcoin_nullifier);

-- Ensure row exists helper
create or replace function public.ensure_user_credits(p_nullifier text)
returns void as $$
begin
  insert into public.user_credits (worldcoin_nullifier)
  values (p_nullifier)
  on conflict (worldcoin_nullifier) do nothing;
end;
$$ language plpgsql;

-- Add credits safely and log in ledger
create or replace function public.add_credits(p_nullifier text, p_amount integer, p_reason text default null)
returns integer as $$
declare new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid credit amount';
  end if;
  perform public.ensure_user_credits(p_nullifier);
  update public.user_credits
    set balance = balance + p_amount, updated_at = now()
    where worldcoin_nullifier = p_nullifier
    returning balance into new_balance;
  insert into public.credits_ledger (worldcoin_nullifier, delta, reason)
    values (p_nullifier, p_amount, coalesce(p_reason, 'add'));
  return new_balance;
end;
$$ language plpgsql;

-- Spend credits atomically if sufficient, log in ledger
create or replace function public.spend_credits(p_nullifier text, p_amount integer, p_reason text default null, p_theme text default null)
returns table (ok boolean, balance integer) as $$
declare new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    return query select false, (select balance from public.user_credits where worldcoin_nullifier = p_nullifier);
  end if;
  perform public.ensure_user_credits(p_nullifier);
  update public.user_credits
    set balance = balance - p_amount, updated_at = now()
    where worldcoin_nullifier = p_nullifier and balance >= p_amount
    returning balance into new_balance;
  if not found then
    return query select false, (select balance from public.user_credits where worldcoin_nullifier = p_nullifier);
  end if;
  insert into public.credits_ledger (worldcoin_nullifier, delta, reason, theme_slug)
    values (p_nullifier, -p_amount, coalesce(p_reason, 'spend'), p_theme);
  return query select true, new_balance;
end;
$$ language plpgsql;

