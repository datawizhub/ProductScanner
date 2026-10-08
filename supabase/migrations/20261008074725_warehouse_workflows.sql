begin;

-- Close NULL-membership authorization gaps in the original stock functions.
do $patch$
declare signature text; definition text;
begin
  foreach signature in array array[
    'private.receive_stock(uuid,uuid,uuid,bigint,text)',
    'private.move_stock(uuid,uuid,uuid,uuid,bigint,text)',
    'private.adjust_stock(uuid,uuid,uuid,bigint,text)',
    'private.pick_stock(uuid,uuid,uuid,bigint,text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    definition := replace(definition, 'private.member_role(p_store_id) not in',
      'coalesce(private.member_role(p_store_id), '''') not in');
    definition := replace(definition, 'private.member_role(p_store_id) <>',
      'coalesce(private.member_role(p_store_id), '''') <>');
    execute definition;
  end loop;
end $patch$;

create table private.stock_requests (
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload jsonb not null,
  applied boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id, request_id)
);
alter table private.stock_requests enable row level security;
revoke all on private.stock_requests from public, anon, authenticated;

create function private.apply_stock_movement(
  p_store_id uuid, p_item_id uuid, p_action text, p_quantity bigint,
  p_location_id uuid, p_request_id uuid, p_to_location_id uuid default null,
  p_note text default null
) returns void language plpgsql security definer set search_path = '' as $function$
declare v_user uuid := auth.uid(); v_payload jsonb; v_request private.stock_requests;
begin
  if v_user is null or coalesce(private.member_role(p_store_id), '') not in ('staff','manager') then
    raise exception 'Store access denied' using errcode = '42501';
  end if;
  if p_request_id is null or p_item_id is null or p_location_id is null
     or p_action not in ('receive','move','adjust','pick') or p_action is null
     or p_quantity is null or p_quantity < 0 or (p_action <> 'adjust' and p_quantity = 0) then
    raise exception 'Choose an action, location and valid quantity' using errcode = '22023';
  end if;
  if p_action = 'adjust' and (coalesce(private.member_role(p_store_id),'') <> 'manager'
      or length(btrim(coalesce(p_note,''))) = 0) then
    raise exception 'Manager access and an adjustment reason are required' using errcode = '42501';
  end if;
  if length(coalesce(p_note,'')) > 1000 then
    raise exception 'Note must be at most 1000 characters' using errcode = '22023';
  end if;
  v_payload := jsonb_build_object('item',p_item_id,'action',p_action,'quantity',p_quantity,
    'location',p_location_id,'to',p_to_location_id,'note',coalesce(p_note,''));
  insert into private.stock_requests(store_id,user_id,request_id,payload)
    values(p_store_id,v_user,p_request_id,v_payload) on conflict do nothing;
  select * into strict v_request from private.stock_requests
    where store_id=p_store_id and user_id=v_user and request_id=p_request_id for update;
  if v_request.payload <> v_payload then
    raise exception 'This receipt reference was already used for different details' using errcode='22023';
  end if;
  if v_request.applied then return; end if;
  case p_action
    when 'receive' then perform private.receive_stock(p_store_id,p_item_id,p_location_id,p_quantity,p_note);
    when 'move' then perform private.move_stock(p_store_id,p_item_id,p_location_id,p_to_location_id,p_quantity,p_note);
    when 'adjust' then perform private.adjust_stock(p_store_id,p_item_id,p_location_id,p_quantity,p_note);
    when 'pick' then perform private.pick_stock(p_store_id,p_item_id,p_location_id,p_quantity,p_note);
  end case;
  update private.stock_requests set applied=true
    where store_id=p_store_id and user_id=v_user and request_id=p_request_id;
end $function$;
revoke all on function private.apply_stock_movement(uuid,uuid,text,bigint,uuid,uuid,uuid,text) from public;
grant execute on function private.apply_stock_movement(uuid,uuid,text,bigint,uuid,uuid,uuid,text) to authenticated;

create function public.apply_stock_movement(
  p_store_id uuid, p_item_id uuid, p_action text, p_quantity bigint,
  p_location_id uuid, p_request_id uuid, p_to_location_id uuid default null, p_note text default null
) returns void language sql security invoker set search_path = ''
as $function$ select private.apply_stock_movement(p_store_id,p_item_id,p_action,p_quantity,
  p_location_id,p_request_id,p_to_location_id,p_note) $function$;
revoke all on function public.apply_stock_movement(uuid,uuid,text,bigint,uuid,uuid,uuid,text) from public;
grant execute on function public.apply_stock_movement(uuid,uuid,text,bigint,uuid,uuid,uuid,text) to authenticated;

create function public.save_catalog_item(
  p_store_id uuid, p_name text, p_sku text, p_price numeric, p_unit text,
  p_description text default null, p_item_id uuid default null, p_barcode text default null
) returns uuid language plpgsql security invoker set search_path = '' as $function$
declare v_id uuid;
begin
  if auth.uid() is null or coalesce(private.member_role(p_store_id),'') <> 'manager' then
    raise exception 'Manager access required' using errcode='42501';
  end if;
  if p_name is null or length(btrim(p_name))=0 or p_sku is null or length(btrim(p_sku))=0
    or p_unit is null or length(btrim(p_unit))=0 or p_price is null or p_price < 0 then
    raise exception 'Name, SKU, unit and nonnegative price are required' using errcode='22023';
  end if;
  if p_item_id is null then
    insert into public.items(store_id,name,sku,price,unit,description)
      values(p_store_id,btrim(p_name),btrim(p_sku),p_price,btrim(p_unit),nullif(btrim(p_description),''))
      returning id into v_id;
  else
    update public.items set name=btrim(p_name),sku=btrim(p_sku),price=p_price,unit=btrim(p_unit),
      description=nullif(btrim(p_description),''),updated_at=now()
      where store_id=p_store_id and id=p_item_id returning id into v_id;
    if v_id is null then raise exception 'Item not found' using errcode='22023'; end if;
  end if;
  if nullif(btrim(p_barcode),'') is not null then
    insert into public.item_barcodes(store_id,item_id,barcode) values(p_store_id,v_id,btrim(p_barcode));
  end if;
  return v_id;
end $function$;
revoke all on function public.save_catalog_item(uuid,text,text,numeric,text,text,uuid,text) from public;
grant execute on function public.save_catalog_item(uuid,text,text,numeric,text,text,uuid,text) to authenticated;

create function public.search_catalog(p_store_id uuid,p_search text default '',p_offset integer default 0)
returns setof public.items language sql stable security invoker set search_path = '' as $function$
  select i.* from public.items i
  where i.store_id=p_store_id and
    (position(lower(coalesce(p_search,'')) in lower(i.name))>0
    or position(lower(coalesce(p_search,'')) in lower(i.sku))>0
    or exists(select 1 from public.item_barcodes b where b.store_id=i.store_id and b.item_id=i.id
      and b.barcode=coalesce(p_search,'')))
  order by i.name,i.id limit 50 offset greatest(coalesce(p_offset,0),0)
$function$;
revoke all on function public.search_catalog(uuid,text,integer) from public;
grant execute on function public.search_catalog(uuid,text,integer) to authenticated;

create function private.item_movement_history(p_store_id uuid,p_item_id uuid,p_offset integer default 0)
returns table(id bigint,type text,quantity bigint,created_at timestamptz,note text,
  from_code text,to_code text,actor_email text)
language plpgsql stable security definer set search_path = '' as $function$
begin
  if auth.uid() is null or coalesce(private.member_role(p_store_id),'') not in ('staff','manager') then
    raise exception 'Store access denied' using errcode='42501';
  end if;
  return query select m.id,m.type,m.quantity,m.created_at,m.note,
    f.code,t.code,coalesce(u.email,'Former user')::text
  from public.stock_movements m
  left join public.locations f on f.store_id=m.store_id and f.id=m.from_location_id
  left join public.locations t on t.store_id=m.store_id and t.id=m.to_location_id
  left join auth.users u on u.id=m.user_id
  where m.store_id=p_store_id and m.item_id=p_item_id
  order by m.created_at desc,m.id desc limit 50 offset greatest(coalesce(p_offset,0),0);
end $function$;
revoke all on function private.item_movement_history(uuid,uuid,integer) from public;
grant execute on function private.item_movement_history(uuid,uuid,integer) to authenticated;
create function public.item_movement_history(p_store_id uuid,p_item_id uuid,p_offset integer default 0)
returns table(id bigint,type text,quantity bigint,created_at timestamptz,note text,
  from_code text,to_code text,actor_email text)
language sql stable security invoker set search_path = '' as $function$
  select * from private.item_movement_history(p_store_id,p_item_id,p_offset)
$function$;
revoke all on function public.item_movement_history(uuid,uuid,integer) from public;
grant execute on function public.item_movement_history(uuid,uuid,integer) to authenticated;

commit;
