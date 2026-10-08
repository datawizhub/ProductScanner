begin;
alter table private.stock_requests add column cancelled boolean not null default false;
alter table private.stock_requests add constraint stock_requests_one_outcome check (not (applied and cancelled));
do $patch$
declare definition text;
begin
  definition := pg_get_functiondef('private.apply_stock_movement(uuid,uuid,text,bigint,uuid,uuid,uuid,text)'::regprocedure);
  if position('if v_request.applied then return; end if;' in definition)=0 then
    raise exception 'Expected stock receipt implementation was not found';
  end if;
  definition := replace(definition, 'if v_request.applied then return; end if;',
    'if v_request.applied then return; end if;
     if v_request.cancelled then
       raise exception ''This receipt was cancelled. Start a new stock action.'' using errcode=''22023'';
     end if;');
  execute definition;
end $patch$;

-- A unique-key lock reconciles a possibly in-flight request. If receipt creation
-- loses this race, the cancellation tombstone prevents its late application.
create function private.cancel_stock_receipt(
  p_store_id uuid, p_item_id uuid, p_action text, p_quantity bigint,
  p_location_id uuid, p_request_id uuid, p_to_location_id uuid default null, p_note text default null
) returns text language plpgsql security definer set search_path = '' as $function$
declare v_user uuid := auth.uid(); v_payload jsonb; v_request private.stock_requests;
begin
  if v_user is null or coalesce(private.member_role(p_store_id),'') not in ('staff','manager') then
    raise exception 'Store access denied' using errcode='42501';
  end if;
  if p_request_id is null or p_item_id is null or p_location_id is null or p_quantity is null
     or p_quantity < 0 or p_action is null or p_action not in ('receive','move','pick','adjust') then
    raise exception 'Receipt details are required' using errcode='22023';
  end if;
  v_payload := jsonb_build_object('item',p_item_id,'action',p_action,'quantity',p_quantity,
    'location',p_location_id,'to',p_to_location_id,'note',coalesce(p_note,''));
  insert into private.stock_requests(store_id,user_id,request_id,payload,cancelled)
    values(p_store_id,v_user,p_request_id,v_payload,true) on conflict do nothing;
  select * into strict v_request from private.stock_requests
    where store_id=p_store_id and user_id=v_user and request_id=p_request_id for update;
  if v_request.payload <> v_payload then
    raise exception 'Receipt details do not match the original request' using errcode='22023';
  end if;
  if v_request.applied then return 'applied'; end if;
  update private.stock_requests set cancelled=true
    where store_id=p_store_id and user_id=v_user and request_id=p_request_id;
  return 'cancelled';
end $function$;
revoke all on function private.cancel_stock_receipt(uuid,uuid,text,bigint,uuid,uuid,uuid,text) from public;
grant execute on function private.cancel_stock_receipt(uuid,uuid,text,bigint,uuid,uuid,uuid,text) to authenticated;
create function public.cancel_stock_receipt(
  p_store_id uuid, p_item_id uuid, p_action text, p_quantity bigint,
  p_location_id uuid, p_request_id uuid, p_to_location_id uuid default null, p_note text default null
) returns text language sql security invoker set search_path = '' as $function$
  select private.cancel_stock_receipt(p_store_id,p_item_id,p_action,p_quantity,
    p_location_id,p_request_id,p_to_location_id,p_note)
$function$;
revoke all on function public.cancel_stock_receipt(uuid,uuid,text,bigint,uuid,uuid,uuid,text) from public;
grant execute on function public.cancel_stock_receipt(uuid,uuid,text,bigint,uuid,uuid,uuid,text) to authenticated;
commit;
