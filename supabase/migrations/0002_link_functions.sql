-- ============================================================
-- Atomic counter increment + credit deduction
-- ============================================================

-- Increment link click counters atomically
create or replace function public.increment_link_clicks(
  p_link_id uuid,
  p_is_unique boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.links
     set total_clicks = total_clicks + 1,
         unique_clicks = unique_clicks + case when p_is_unique then 1 else 0 end
   where id = p_link_id;
end;
$$;

-- Deduct credits from a user atomically. Returns the new balance or NULL if insufficient.
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount numeric,
  p_description text,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if p_amount <= 0 then
    select credits_balance into v_balance from public.profiles where id = p_user_id;
    return v_balance;
  end if;

  update public.profiles
     set credits_balance = credits_balance - p_amount
   where id = p_user_id
     and credits_balance >= p_amount
   returning credits_balance into v_balance;

  if v_balance is null then
    return null; -- insufficient funds
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description, reference, metadata)
  values
    (p_user_id, 'usage', -p_amount, v_balance, p_description, p_reference, p_metadata);

  return v_balance;
end;
$$;

-- Add credits (topup / bonus / refund / admin adjust)
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if p_type not in ('topup', 'refund', 'admin_adjust', 'bonus') then
    raise exception 'invalid credit type: %', p_type;
  end if;

  update public.profiles
     set credits_balance = credits_balance + p_amount
   where id = p_user_id
   returning credits_balance into v_balance;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_after, description, reference, metadata)
  values
    (p_user_id, p_type, p_amount, v_balance, p_description, p_reference, p_metadata);

  return v_balance;
end;
$$;
