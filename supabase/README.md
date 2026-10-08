# Warehouse database

The hosted Sydney project is [accounts@orawiz.com.au's Project](https://supabase.com/dashboard/project/lgwpmnzwpmzkcwniuicf). Every warehouse table carries `store_id`; RLS isolates stores. The app resolves the initial `prototype-store` and its authenticated user's `store_memberships` row.

## Access and provisioning

Staff read catalog, bins, stock, and attributed movement history, and receive/move/pick stock. Managers additionally maintain catalog/barcodes and locations, and adjust counts. Clients cannot write `stock` or `stock_movements` directly; stock RPCs update quantities and append the ledger in one transaction. Barcodes remain text, including leading zeroes, with uniqueness scoped to a store.

An administrator creates/invites the Auth user in the Supabase Dashboard, then provisions membership. The mobile app cannot create users or choose its own role. Replace the placeholder email below and select the intended role:

```sql
insert into public.store_memberships (store_id, user_id, role)
select s.id, u.id, 'staff'
from public.stores s
join auth.users u on u.email = '<staff-email>'
where s.code = 'prototype-store'
on conflict (store_id, user_id) do update set role = excluded.role;
```

Use `manager` for a manager account. Confirm that one row was affected; zero means the user/store was not found. An Auth session alone does not grant warehouse membership. Use only a publishable key in the app; secret, service-role, and administrator keys stay outside the client.

## Stock receipt contracts

The app calls **`apply_stock_movement`** with:

| Argument | Meaning |
| --- | --- |
| `p_store_id`, `p_item_id` | Current store and item UUIDs |
| `p_action` | `receive`, `move`, `pick`, or `adjust` |
| `p_quantity` | Positive whole number for receive/move/pick; nonnegative absolute count for adjust |
| `p_location_id` | Bin, or source bin for a move |
| `p_request_id` | Idempotent receipt UUID, reused for every retry of the same action |
| `p_to_location_id` | Destination bin for move; optional otherwise |
| `p_note` | Optional note; required nonblank reason for adjust, at most 1,000 characters |

The private request table is keyed by `(store_id, user_id, request_id)` and stores the original payload. A row lock serializes competing attempts. A previously applied identical receipt returns without changing stock again; the same UUID with different details is rejected. Adjustment requires manager access, and the ledger quantity records the signed difference from the previous count. Insufficient stock, invalid bins, and authorization errors roll back the action.

The client persists the complete receipt before sending. Uncertain outcomes retain it for **Confirm pending action**. Changing quantity, bins, or note requires resolving the original receipt first; a new receipt UUID represents a new action.

**`cancel_stock_receipt`** takes the same receipt arguments and returns `applied` or `cancelled`. It acquires the same receipt lock: an already committed action returns `applied`; an uncommitted action records a cancellation tombstone. A late apply using that UUID is then rejected. This reconciles uncertainty without undoing committed stock. Payload mismatch is rejected, and a failed cancellation leaves the client receipt pending for another attempt. The table constraint prevents a receipt from being both applied and cancelled.

The original `receive_stock`, `move_stock`, `pick_stock`, and `adjust_stock` RPCs remain defined. Their membership checks were corrected to use `coalesce(private.member_role(p_store_id), '')` so a missing role cannot pass a SQL NULL comparison. The app uses the receipt wrapper for its retry/cancellation behavior; direct calls to the original functions do not carry its idempotency contract.

## Catalog, search, locations, and history

- **`save_catalog_item`:** manager-only atomic create/update of item fields with an optional barcode. It returns the item UUID. A barcode conflict rolls the whole call back, preventing a partial new item.
- **`search_catalog`:** `p_store_id`, literal `p_search`, and nonnegative `p_offset`; returns at most 50 items ordered by name and ID. Name/SKU matching is case-insensitive substring matching with `position`, so `%` and `_` are literal characters rather than wildcards. Barcode matching is exact. RLS applies to the invoker.
- **Barcodes:** manager-authorized writes to `item_barcodes` attach/remove barcode strings. One item can have many. Unknown barcode linking confirms the chosen existing item.
- **Locations:** RLS-controlled manager CRUD stores aisle/rack/bin and readable code. Foreign keys prevent deleting locations used by stock or movement history. Bin QR payloads use `warehouse-bin:<store-id>:<location-id>`; renaming a code does not change the QR identity.
- **`item_movement_history`:** checks authenticated staff/manager membership in the requested store before its private function resolves actor emails. Returns ID, type, quantity, timestamp, note, source/destination codes, and actor email (or `Former user`), ordered by timestamp and ID descending, limited to 50 with an offset. Its public wrapper does not expose unrestricted access to `auth.users`.

Generated database types are in [`src/types/database.types.ts`](../src/types/database.types.ts).

## Invitation and recovery callbacks

The exact approved and deployed Supabase Auth Site URL and allowed redirect are **`productscanner://auth-callback`**, with no wildcard redirect allowed. The installed app registers the `productscanner` scheme. Invitation/recovery verification establishes the setup session and requires a password before entering warehouse screens. Roles still come from administrator-provisioned memberships.

Expo Go and browser preview do not install this custom scheme. Use Account setup to paste the **original link address directly from the email without opening it**, then Verify email link. Link previews can consume the token; consumed/expired links require a fresh email. Automatic native callback verification remains a phone acceptance task. No emails were sent by implementation or verification work.

## Tracked migrations

Apply migrations in order:

1. [Warehouse foundation](migrations/20261006052338_warehouse_foundation.sql): store isolation, memberships, catalog/stock/locations, and original stock RPCs.
2. [Warehouse workflows](migrations/20261008074725_warehouse_workflows.sql): corrected NULL-role checks, receipt idempotency, atomic catalog save, literal paginated search, and attributed history.
3. [Stock receipt resolution](migrations/20261008083241_stock_receipt_resolution.sql): cancellation tombstones and safe reconciliation of pending receipts.

The checkout is linked to project `lgwpmnzwpmzkcwniuicf`. Both workflow migrations above are deployed and marked applied in tracked history through migration repair. Discover CLI commands/flags through `--help` before use. Create future files with `supabase migration new <name>`, review the SQL, deploy with `supabase db push`, and check `supabase migration list --linked`. Regenerate types after schema changes with `supabase gen types typescript --linked --schema public` and commit migrations/types together. Changes applied manually must also be reconciled with tracked migration history; do not treat an untracked Dashboard change as the schema source.

`seed.sql` is optional local fake catalog/location data; it does not create Auth users or stock.

## Verification

The [rollback integration test](tests/warehouse_workflows.sql) requires an existing manager membership and administrator SQL access. It temporarily exercises manager/staff/nonmember roles, identical retries, payload mismatch, applied/cancelled receipts and late apply rejection, ledger counts, catalog atomicity, stock constraints, and direct stock-write denial. Its final `rollback` restores the temporary role/data changes. Run the full transaction together and retain the final rollback.

Those SQL checks and seven domain tests passed. See [the workflow record](../docs/warehouse-workflows.md) for the current bundle status and remaining phone acceptance work. **The phone checklist changes live stock and records; it does not roll back automatically.**
