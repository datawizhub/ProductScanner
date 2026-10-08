-- Integration test against the linked prototype, always rolled back.
-- Requires an existing manager membership; creates no lasting users, items or stock.
begin;
do $setup$
declare actor uuid; store uuid;
begin
  select s.id,m.user_id into strict store,actor from public.stores s
    join public.store_memberships m on m.store_id=s.id
    where s.code='prototype-store' and m.role='manager' order by m.created_at limit 1;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform set_config('warehouse.test_store',store::text,true);
  perform set_config('warehouse.test_actor',actor::text,true);
end $setup$;
set local role authenticated;
do $manager$
declare
  store uuid := current_setting('warehouse.test_store')::uuid;
  item uuid; source uuid := gen_random_uuid(); destination uuid := gen_random_uuid();
  receipt uuid := gen_random_uuid(); cancelled_receipt uuid := gen_random_uuid(); marker text := gen_random_uuid()::text;
begin
  item := public.save_catalog_item(store,'Workflow verification','VERIFY-'||marker,1.25,'each',null,null,'BAR-'||marker);
  insert into public.locations(id,store_id,code,aisle,rack,bin) values
    (source,store,'VERIFY-S-'||marker,'VERIFY','S','1'),
    (destination,store,'VERIFY-D-'||marker,'VERIFY','D','1');
  perform set_config('warehouse.test_item',item::text,true);
  perform set_config('warehouse.test_source',source::text,true);
  perform set_config('warehouse.test_destination',destination::text,true);
  perform public.apply_stock_movement(store,item,'receive',5,source,receipt,null,'Verification receipt');
  perform public.apply_stock_movement(store,item,'receive',5,source,receipt,null,'Verification receipt');
  if (select quantity from public.stock where item_id=item and location_id=source) <> 5 then
    raise exception 'Duplicate receipt changed quantity'; end if;
  if (select count(*) from public.stock_movements where item_id=item) <> 1 then
    raise exception 'Duplicate receipt wrote a second movement'; end if;
  if public.cancel_stock_receipt(store,item,'receive',5,source,receipt,null,'Verification receipt') <> 'applied' then
    raise exception 'Committed receipt was not reconciled as applied'; end if;
  if public.cancel_stock_receipt(store,item,'receive',4,source,cancelled_receipt,null,'Cancelled receipt') <> 'cancelled' then
    raise exception 'Pending receipt was not cancelled'; end if;
  begin
    perform public.apply_stock_movement(store,item,'receive',4,source,cancelled_receipt,null,'Cancelled receipt');
    raise exception 'Late request applied after cancellation';
  exception when invalid_parameter_value then null;
  end;
  if (select quantity from public.stock where item_id=item and location_id=source) <> 5 then
    raise exception 'Cancelling a receipt changed stock'; end if;
  begin
    perform public.apply_stock_movement(store,item,'receive',6,source,receipt,null,'Verification receipt');
    raise exception 'Different payload reused the same receipt';
  exception when invalid_parameter_value then null;
  end;
  perform public.apply_stock_movement(store,item,'move',2,source,gen_random_uuid(),destination,'Verification move');
  perform public.apply_stock_movement(store,item,'pick',1,source,gen_random_uuid(),null,'Verification pick');
  begin
    perform public.apply_stock_movement(store,item,'pick',999,source,gen_random_uuid(),null,'Insufficient stock');
    raise exception 'Negative stock was permitted';
  exception when check_violation then null;
  end;
  begin
    perform public.apply_stock_movement(store,item,'adjust',8,destination,gen_random_uuid(),null,'');
    raise exception 'Adjustment without reason was permitted';
  exception when insufficient_privilege then null;
  end;
  perform public.apply_stock_movement(store,item,'adjust',8,destination,gen_random_uuid(),null,'Count verification');
  if (select quantity from public.stock where item_id=item and location_id=source) <> 2 or
     (select quantity from public.stock where item_id=item and location_id=destination) <> 8 then
    raise exception 'Incorrect post-movement quantities'; end if;
  if (select count(*) from public.item_movement_history(store,item)) <> 4 then
    raise exception 'History did not return four attributed movements'; end if;
  if not exists (select 1 from public.search_catalog(store,'BAR-'||marker) where id=item) then
    raise exception 'Barcode search missed the item'; end if;
  begin
    perform public.save_catalog_item(store,'Duplicate verification','DUP-'||marker,0,'each',null,null,'BAR-'||marker);
    raise exception 'Duplicate barcode was permitted';
  exception when unique_violation then null;
  end;
  if exists(select 1 from public.items where sku='DUP-'||marker) then
    raise exception 'Failed catalog save left a partial item'; end if;
  begin
    update public.stock set quantity=100 where item_id=item;
    raise exception 'Direct stock writes were permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.locations where id=source;
    raise exception 'Location with stock/history was deleted';
  exception when foreign_key_violation then null;
  end;
end $manager$;
reset role;
update public.store_memberships set role='staff'
  where store_id=current_setting('warehouse.test_store')::uuid and user_id=current_setting('warehouse.test_actor')::uuid;
set local role authenticated;
do $staff$
declare store uuid := current_setting('warehouse.test_store')::uuid;
  item uuid := current_setting('warehouse.test_item')::uuid;
  source uuid := current_setting('warehouse.test_source')::uuid;
begin
  perform public.apply_stock_movement(store,item,'receive',1,source,gen_random_uuid(),null,'Staff receipt');
  if (select quantity from public.stock where item_id=item and location_id=source) <> 3 then
    raise exception 'Staff receipt failed'; end if;
  begin
    perform public.apply_stock_movement(store,item,'adjust',100,source,gen_random_uuid(),null,'Staff denied');
    raise exception 'Staff adjustment was permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_catalog_item(store,'Denied','DENIED',0,'each');
    raise exception 'Staff catalog save was permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.locations(store_id,code,aisle,rack,bin) values(store,'DENIED','D','1','1');
    raise exception 'Staff location edit was permitted';
  exception when insufficient_privilege then null;
  end;
end $staff$;
reset role;
delete from public.store_memberships
  where store_id=current_setting('warehouse.test_store')::uuid and user_id=current_setting('warehouse.test_actor')::uuid;
set local role authenticated;
do $nonmember$
declare store uuid := current_setting('warehouse.test_store')::uuid;
  item uuid := current_setting('warehouse.test_item')::uuid;
  source uuid := current_setting('warehouse.test_source')::uuid;
begin
  begin
    perform public.receive_stock(store,item,source,1,'Nonmember denied');
    raise exception 'Original receive RPC allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.move_stock(store,item,source,current_setting('warehouse.test_destination')::uuid,1,'Nonmember denied');
    raise exception 'Original move RPC allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.pick_stock(store,item,source,1,'Nonmember denied');
    raise exception 'Original pick RPC allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.adjust_stock(store,item,source,1,'Nonmember denied');
    raise exception 'Original adjust RPC allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cancel_stock_receipt(store,item,'receive',1,source,gen_random_uuid(),null,'Nonmember denied');
    raise exception 'Receipt resolution allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.apply_stock_movement(store,item,'receive',1,source,gen_random_uuid(),null,'Nonmember denied');
    raise exception 'New receipt RPC allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.item_movement_history(store,item);
    raise exception 'History allowed a nonmember';
  exception when insufficient_privilege then null;
  end;
  if exists(select 1 from public.search_catalog(store,'')) then
    raise exception 'RLS exposed catalog to a nonmember'; end if;
end $nonmember$;
reset role;
select 'PASS: manager, staff, nonmember, retry, ledger, catalog atomicity and stock constraints' as result;
rollback;
