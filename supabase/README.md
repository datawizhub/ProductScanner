# Warehouse database

The Sydney Supabase project is [accounts@orawiz.com.au's Project](https://supabase.com/dashboard/project/lgwpmnzwpmzkcwniuicf). The schema source is [the foundation migration](migrations/20261006052338_warehouse_foundation.sql).

## Data and access

- `stores` contains the initial `prototype-store` row. Every warehouse table carries `store_id`.
- `store_memberships` binds an Auth user to a store as `staff` or `manager`. Only the database administrator provisions memberships in v1.
- Staff can read catalog, locations, stock and movements, and call `receive_stock`, `move_stock` and `pick_stock`.
- Managers can also create/edit catalog entries and locations, and call `adjust_stock`.
- Clients cannot write `stock` or `stock_movements` directly. RPCs update stock and append its ledger movement in one transaction. `adjust_stock` takes an absolute count; movement `quantity` records the signed difference.
- All product barcodes are text. Barcode uniqueness is scoped to a store so another store can later carry the same manufacturer barcode.

The public RPCs take `p_store_id` plus item/location IDs. A successful RPC returns no value; refresh stock for the item afterward. The generated database types are in [`src/types/database.types.ts`](../src/types/database.types.ts).

| Action | RPC | Required arguments beyond `p_store_id` | Allowed role |
| --- | --- | --- | --- |
| Receive | `receive_stock` | `p_item_id`, `p_location_id`, positive `p_quantity` | Staff or manager |
| Move | `move_stock` | `p_item_id`, `p_from_location_id`, `p_to_location_id`, positive `p_quantity` | Staff or manager |
| Set count | `adjust_stock` | `p_item_id`, `p_location_id`, nonnegative `p_new_quantity` | Manager |
| Pick | `pick_stock` | `p_item_id`, `p_location_id`, positive `p_quantity` | Staff or manager |

Every RPC also accepts optional `p_note`. For a scan, query `item_barcodes` by `store_id` and the exact barcode string, join its `items` row, then query `stock` with `locations`. Realtime publishes `stock`; subscribe with an item filter. Treat barcodes as strings throughout, including UPC codes with leading zeroes.

## First app user

The first app manager has been invited, confirmed, and assigned to `prototype-store`. For each later user, an administrator can provision membership in the SQL Editor by replacing the placeholder email:

```sql
insert into public.store_memberships (store_id, user_id, role)
select s.id, u.id, 'manager'
from public.stores s
join auth.users u on u.email = '<manager-email>'
where s.code = 'prototype-store'
on conflict (store_id, user_id) do update set role = excluded.role;
```

Use the same statement with `staff` for staff users. Check that it affects one row; a zero-row result means the Auth user or store was not found. Do not put a service-role or secret API key in the mobile app.

## Migration workflow

The initial migration was applied in the dashboard SQL Editor, then marked applied in the remote CLI migration history with `supabase migration repair`. The checkout is linked to project `lgwpmnzwpmzkcwniuicf`; `supabase migration list --linked` shows local and remote version `20261006052338` matching. Future schema changes should be created with `supabase migration new`, deployed with `supabase db push`, and committed to git. After a schema change, regenerate [`src/types/database.types.ts`](../src/types/database.types.ts) with `supabase gen types typescript --linked --schema public`.

A rollback-only database smoke check passed the manager and staff stock RPC flows, the movement ledger counts, insufficient-stock rejection, staff adjustment denial, and direct stock-update denial. A follow-up query confirmed that the manager role remained in place and no temporary test rows persisted. The mobile Login tab uses Supabase Auth and routes successful sign-ins to the scanner.

`seed.sql` contains optional fake catalog and location rows for local development. It does not create stock or Auth users.
