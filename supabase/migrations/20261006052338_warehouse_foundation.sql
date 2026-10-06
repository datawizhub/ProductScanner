-- Warehouse prototype foundation. Apply to a new Supabase project.
create schema if not exists private;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.store_memberships (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('staff', 'manager')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_memberships_user_idx on public.store_memberships(user_id, store_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  sku text not null check (length(btrim(sku)) > 0),
  name text not null check (length(btrim(name)) > 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  description text,
  unit text not null default 'each' check (length(btrim(unit)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, sku)
);
create index items_store_name_idx on public.items(store_id, name);

create table public.item_barcodes (
  store_id uuid not null references public.stores(id),
  barcode text not null check (length(btrim(barcode)) > 0 and barcode = btrim(barcode)),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (store_id, barcode),
  foreign key (store_id, item_id) references public.items(store_id, id) on delete cascade
);
create index item_barcodes_item_idx on public.item_barcodes(store_id, item_id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  code text not null check (length(btrim(code)) > 0),
  aisle text not null check (length(btrim(aisle)) > 0),
  rack text not null check (length(btrim(rack)) > 0),
  bin text not null check (length(btrim(bin)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, id),
  unique (store_id, code)
);

create table public.stock (
  store_id uuid not null references public.stores(id),
  item_id uuid not null,
  location_id uuid not null,
  quantity bigint not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (store_id, item_id, location_id),
  foreign key (store_id, item_id) references public.items(store_id, id),
  foreign key (store_id, location_id) references public.locations(store_id, id)
);
create index stock_location_idx on public.stock(store_id, location_id);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id),
  item_id uuid not null,
  from_location_id uuid,
  to_location_id uuid,
  quantity bigint not null check (quantity <> 0),
  type text not null check (type in ('receive', 'move', 'pick', 'adjust')),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  note text check (note is null or length(note) <= 1000),
  foreign key (store_id, item_id) references public.items(store_id, id),
  foreign key (store_id, from_location_id) references public.locations(store_id, id),
  foreign key (store_id, to_location_id) references public.locations(store_id, id),
  constraint stock_movement_shape check (
    (type = 'receive' and quantity > 0 and from_location_id is null and to_location_id is not null)
    or (type = 'move' and quantity > 0 and from_location_id is not null and to_location_id is not null and from_location_id <> to_location_id)
    or (type = 'pick' and quantity > 0 and from_location_id is not null and to_location_id is null)
    or (type = 'adjust' and from_location_id is null and to_location_id is not null)
  )
);
create index stock_movements_item_time_idx on public.stock_movements(store_id, item_id, created_at desc);
create index stock_movements_from_idx on public.stock_movements(store_id, from_location_id, created_at desc);
create index stock_movements_to_idx on public.stock_movements(store_id, to_location_id, created_at desc);

create function private.member_role(p_store_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.role from public.store_memberships m
  where m.store_id = p_store_id and m.user_id = (select auth.uid())
$$;
revoke all on function private.member_role(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.member_role(uuid) to authenticated;

alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.items enable row level security;
alter table public.item_barcodes enable row level security;
alter table public.locations enable row level security;
alter table public.stock enable row level security;
alter table public.stock_movements enable row level security;

create policy stores_read on public.stores for select to authenticated
  using (private.member_role(id) is not null);
create policy memberships_read on public.store_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy items_read on public.items for select to authenticated
  using (private.member_role(store_id) is not null);
create policy items_insert on public.items for insert to authenticated
  with check (private.member_role(store_id) = 'manager');
create policy items_update on public.items for update to authenticated
  using (private.member_role(store_id) = 'manager')
  with check (private.member_role(store_id) = 'manager');
create policy items_delete on public.items for delete to authenticated
  using (private.member_role(store_id) = 'manager');

create policy barcodes_read on public.item_barcodes for select to authenticated
  using (private.member_role(store_id) is not null);
create policy barcodes_insert on public.item_barcodes for insert to authenticated
  with check (private.member_role(store_id) = 'manager');
create policy barcodes_update on public.item_barcodes for update to authenticated
  using (private.member_role(store_id) = 'manager')
  with check (private.member_role(store_id) = 'manager');
create policy barcodes_delete on public.item_barcodes for delete to authenticated
  using (private.member_role(store_id) = 'manager');

create policy locations_read on public.locations for select to authenticated
  using (private.member_role(store_id) is not null);
create policy locations_insert on public.locations for insert to authenticated
  with check (private.member_role(store_id) = 'manager');
create policy locations_update on public.locations for update to authenticated
  using (private.member_role(store_id) = 'manager')
  with check (private.member_role(store_id) = 'manager');
create policy locations_delete on public.locations for delete to authenticated
  using (private.member_role(store_id) = 'manager');

create policy stock_read on public.stock for select to authenticated
  using (private.member_role(store_id) is not null);
create policy movements_read on public.stock_movements for select to authenticated
  using (private.member_role(store_id) is not null);

revoke all on public.stores, public.store_memberships, public.items,
  public.item_barcodes, public.locations, public.stock, public.stock_movements
  from anon, authenticated;
grant select on public.stores, public.store_memberships, public.items,
  public.item_barcodes, public.locations, public.stock, public.stock_movements
  to authenticated;
grant insert, update, delete on public.items, public.item_barcodes, public.locations
  to authenticated;

-- Privileged stock functions live outside the exposed public API schema.
create function private.receive_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_quantity bigint, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.member_role(p_store_id) not in ('staff', 'manager') then
    raise exception 'Store access denied' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;
  insert into public.stock(store_id, item_id, location_id, quantity)
    values (p_store_id, p_item_id, p_location_id, 0)
    on conflict do nothing;
  perform 1 from public.stock
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id
    for update;
  update public.stock set quantity = quantity + p_quantity, updated_at = now()
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id;
  insert into public.stock_movements(store_id, item_id, to_location_id, quantity, type, user_id, note)
    values (p_store_id, p_item_id, p_location_id, p_quantity, 'receive', auth.uid(), p_note);
end;
$$;

create function private.move_stock(p_store_id uuid, p_item_id uuid, p_from_location_id uuid,
  p_to_location_id uuid, p_quantity bigint, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_source_quantity bigint;
begin
  if (select auth.uid()) is null or private.member_role(p_store_id) not in ('staff', 'manager') then
    raise exception 'Store access denied' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_from_location_id is null
     or p_to_location_id is null or p_from_location_id = p_to_location_id then
    raise exception 'Move requires distinct locations and a positive quantity' using errcode = '22023';
  end if;
  insert into public.stock(store_id, item_id, location_id, quantity)
    select p_store_id, p_item_id, u.location_id, 0
    from unnest(array[p_from_location_id, p_to_location_id]) as u(location_id)
    order by u.location_id
    on conflict do nothing;
  perform 1 from public.stock
    where store_id = p_store_id and item_id = p_item_id
      and location_id in (p_from_location_id, p_to_location_id)
    order by location_id for update;
  select quantity into v_source_quantity from public.stock
    where store_id = p_store_id and item_id = p_item_id and location_id = p_from_location_id;
  if v_source_quantity < p_quantity then
    raise exception 'Insufficient stock' using errcode = '23514';
  end if;
  update public.stock set quantity = quantity - p_quantity, updated_at = now()
    where store_id = p_store_id and item_id = p_item_id and location_id = p_from_location_id;
  update public.stock set quantity = quantity + p_quantity, updated_at = now()
    where store_id = p_store_id and item_id = p_item_id and location_id = p_to_location_id;
  insert into public.stock_movements(store_id, item_id, from_location_id, to_location_id,
    quantity, type, user_id, note)
    values (p_store_id, p_item_id, p_from_location_id, p_to_location_id,
      p_quantity, 'move', auth.uid(), p_note);
end;
$$;

create function private.adjust_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_new_quantity bigint, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_before bigint; v_delta bigint;
begin
  if (select auth.uid()) is null or private.member_role(p_store_id) <> 'manager' then
    raise exception 'Manager access required' using errcode = '42501';
  end if;
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'New quantity must be nonnegative' using errcode = '22023';
  end if;
  insert into public.stock(store_id, item_id, location_id, quantity)
    values (p_store_id, p_item_id, p_location_id, 0)
    on conflict do nothing;
  select quantity into v_before from public.stock
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id
    for update;
  v_delta := p_new_quantity - v_before;
  if v_delta = 0 then
    raise exception 'Count is unchanged' using errcode = '22023';
  end if;
  update public.stock set quantity = p_new_quantity, updated_at = now()
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id;
  insert into public.stock_movements(store_id, item_id, to_location_id, quantity, type, user_id, note)
    values (p_store_id, p_item_id, p_location_id, v_delta, 'adjust', auth.uid(), p_note);
end;
$$;

create function private.pick_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_quantity bigint, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_before bigint;
begin
  if (select auth.uid()) is null or private.member_role(p_store_id) not in ('staff', 'manager') then
    raise exception 'Store access denied' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;
  insert into public.stock(store_id, item_id, location_id, quantity)
    values (p_store_id, p_item_id, p_location_id, 0)
    on conflict do nothing;
  select quantity into v_before from public.stock
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id
    for update;
  if v_before < p_quantity then
    raise exception 'Insufficient stock' using errcode = '23514';
  end if;
  update public.stock set quantity = quantity - p_quantity, updated_at = now()
    where store_id = p_store_id and item_id = p_item_id and location_id = p_location_id;
  insert into public.stock_movements(store_id, item_id, from_location_id, quantity, type, user_id, note)
    values (p_store_id, p_item_id, p_location_id, p_quantity, 'pick', auth.uid(), p_note);
end;
$$;

revoke all on function private.receive_stock(uuid,uuid,uuid,bigint,text),
  private.move_stock(uuid,uuid,uuid,uuid,bigint,text),
  private.adjust_stock(uuid,uuid,uuid,bigint,text),
  private.pick_stock(uuid,uuid,uuid,bigint,text) from public;
grant execute on function private.receive_stock(uuid,uuid,uuid,bigint,text),
  private.move_stock(uuid,uuid,uuid,uuid,bigint,text),
  private.adjust_stock(uuid,uuid,uuid,bigint,text),
  private.pick_stock(uuid,uuid,uuid,bigint,text) to authenticated;

create function public.receive_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_quantity bigint, p_note text default null)
returns void language sql security invoker set search_path = ''
as $$ select private.receive_stock(p_store_id, p_item_id, p_location_id, p_quantity, p_note) $$;
create function public.move_stock(p_store_id uuid, p_item_id uuid, p_from_location_id uuid,
  p_to_location_id uuid, p_quantity bigint, p_note text default null)
returns void language sql security invoker set search_path = ''
as $$ select private.move_stock(p_store_id, p_item_id, p_from_location_id, p_to_location_id, p_quantity, p_note) $$;
create function public.adjust_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_new_quantity bigint, p_note text default null)
returns void language sql security invoker set search_path = ''
as $$ select private.adjust_stock(p_store_id, p_item_id, p_location_id, p_new_quantity, p_note) $$;
create function public.pick_stock(p_store_id uuid, p_item_id uuid, p_location_id uuid,
  p_quantity bigint, p_note text default null)
returns void language sql security invoker set search_path = ''
as $$ select private.pick_stock(p_store_id, p_item_id, p_location_id, p_quantity, p_note) $$;

revoke all on function public.receive_stock(uuid,uuid,uuid,bigint,text),
  public.move_stock(uuid,uuid,uuid,uuid,bigint,text),
  public.adjust_stock(uuid,uuid,uuid,bigint,text),
  public.pick_stock(uuid,uuid,uuid,bigint,text) from public;
grant execute on function public.receive_stock(uuid,uuid,uuid,bigint,text),
  public.move_stock(uuid,uuid,uuid,uuid,bigint,text),
  public.adjust_stock(uuid,uuid,uuid,bigint,text),
  public.pick_stock(uuid,uuid,uuid,bigint,text) to authenticated;

insert into public.stores(code, name) values ('prototype-store', 'Prototype Store');

-- Only item-level stock changes are published; clients should subscribe with item filters.
alter publication supabase_realtime add table public.stock;
