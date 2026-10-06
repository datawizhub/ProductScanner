-- Optional local prototype data. Run only in a disposable development database.
insert into public.items (store_id, sku, name, price, description, unit)
select id, 'DEMO-COFFEE', 'Demo Coffee Beans', 18.50, 'Prototype item', 'bag'
from public.stores where code = 'prototype-store'
on conflict (store_id, sku) do nothing;

insert into public.items (store_id, sku, name, price, description, unit)
select id, 'DEMO-CUPS', 'Demo Paper Cups', 7.25, 'Prototype item', 'pack'
from public.stores where code = 'prototype-store'
on conflict (store_id, sku) do nothing;

insert into public.item_barcodes (store_id, barcode, item_id)
select i.store_id, 'DEMO-COFFEE-128', i.id
from public.items i join public.stores s on s.id = i.store_id
where s.code = 'prototype-store' and i.sku = 'DEMO-COFFEE'
on conflict (store_id, barcode) do nothing;

insert into public.item_barcodes (store_id, barcode, item_id)
select i.store_id, 'DEMO-CUPS-128', i.id
from public.items i join public.stores s on s.id = i.store_id
where s.code = 'prototype-store' and i.sku = 'DEMO-CUPS'
on conflict (store_id, barcode) do nothing;

insert into public.locations (store_id, code, aisle, rack, bin)
select id, 'A-03-02', 'A', '03', '02' from public.stores where code = 'prototype-store'
on conflict (store_id, code) do nothing;

insert into public.locations (store_id, code, aisle, rack, bin)
select id, 'B-01-01', 'B', '01', '01' from public.stores where code = 'prototype-store'
on conflict (store_id, code) do nothing;
