# Warehouse workflows

Implementation record for branch `codex/warehouse-workflows`, dated 8 October 2026. The app extends the existing native warehouse UI and light/dark theme. See [the design record](../DESIGN.md) for source-extracted tokens and controls.

## Permissions and account provisioning

| Capability | Staff | Manager |
| --- | --- | --- |
| Scan, manual barcode lookup, catalog search, bin contents, movement history | Yes | Yes |
| Receive, move, pick | Yes | Yes |
| Adjust absolute count | No | Yes |
| Add/edit catalog items and manage product barcodes | No | Yes |
| Add/edit/delete eligible locations | No | Yes |
| View own account and complete invitation/password reset | Yes | Yes |
| Create users or assign roles in the app | No | No |

An administrator provisions Auth users through the Supabase Dashboard and assigns `staff` or `manager` through `store_memberships`. Users cannot register themselves with a chosen role. A signed-in account without membership receives a Store access screen with Retry and Sign out. Role gates in the UI are supported by database permissions and RLS store isolation.

## Implemented user workflows

### 1. Receive, move, pick, and adjust stock

Scan or open an item, review its total and per-bin quantities, then choose a stock action. Receive, move, and pick accept positive whole-number quantities. Move requires different source and destination bins. Manager-only Adjust count accepts a nonnegative absolute count and requires a reason; the ledger records the resulting signed difference.

The app sends stock changes through `apply_stock_movement`. The server validates access and stock, then updates stock and its attributed ledger entry atomically. Each attempt has a request ID so retrying the same receipt does not apply stock twice. Clients cannot directly write stock or its ledger.

Before sending a stock action, the app persists the request ID and its original quantity, bins, and note. The pending receipt is scoped to user, store, item, and action. An uncertain network result keeps that receipt; returning to the same form restores it and locks the fields. **Confirm pending action** retries the original request.

**Cancel pending action** reconciles with `cancel_stock_receipt`. If the original action already committed, the app confirms the successful result and shows Stock updated. If it did not commit, the server records its cancellation and the app reports that stock was unchanged. A failed reconciliation preserves the pending receipt for another attempt. A fresh, definitively rejected request can be cleared; rejection of a later retry cannot establish whether an earlier attempt committed.

### 2. Locations and bin QR labels

Locations lists and filters aisle/rack/bin records. Both roles can open bin contents or scan its QR label. Managers can create/edit a location; its code defaults to the joined aisle/rack/bin values if left blank. Deletion asks for confirmation and is restricted to locations without stock or movement history.

The displayed bin label encodes `warehouse-bin:<store-id>:<location-id>`. It keeps the same identity when a manager renames the location code. The app resolves it within the current store and rejects an unknown or foreign-store bin. QR display is implemented; label printing/export remains outside this delivery.

### 3. Catalog editing and barcode linking

Managers can add/edit name, SKU, AUD price, unit, and optional description. New items may include an initial product barcode. Existing items support multiple barcode strings, scanning or manually entering another barcode, and confirmed barcode removal. Barcode and SKU uniqueness are enforced within a store; leading zeroes are preserved.

An unknown product barcode on Scan gives managers **Add a new item** and **Link to an existing item**. Linking opens catalog search, shows the selected item, and requires **Confirm link to this item**. Staff receive guidance to ask a manager.

### 4. Catalog search and manual lookup

Items searches names and SKUs, or an exact product barcode, through `search_catalog`. Search is submitted explicitly and starts at page one. Pages contain up to 50 rows; Previous page and Next page provide navigation. Rows display name, SKU, AUD price, and unit.

Scan also accepts a manually typed barcode for damaged labels or unavailable camera access. A successful lookup opens item details and stock. Barcode camera capture closes after a single label, includes torch and permission/settings recovery, and pauses while the app is inactive.

### 5. Account and password/invitation setup

Account shows email, store, assigned role, role-specific capability copy, Refresh access, Reset password, and Sign out. Login offers **Forgot password or finish invitation?** to open Account setup.

The exact hosted Supabase Auth Site URL and allowed callback, `productscanner://auth-callback`, were explicitly approved and deployed. An installed app with that scheme can receive invitation/recovery callbacks and require password setup before warehouse access. Account setup also verifies the original invitation or reset link copied directly from the email. The parser restricts verification links to this Supabase project and the app callback, and accepts invitation/recovery flows.

Expo Go and browser preview do not install the ProductScanner app scheme. In those environments, copy the **original link address from the email** into **Invitation or reset link**, then choose **Verify email link** and complete **New password** / **Confirm password**. A link already opened, previewed, consumed, or expired may need a fresh email. The form requires at least eight characters and matching passwords.

The app can request a reset through **Send reset email**. No invitations or reset emails were sent by the implementation or verification work. Account provisioning remains an administrator task.

### 6. Attributed movement history

Open **Movement history** from the item screen. Entries show receive/move/pick/adjust quantity, source and destination codes, actor email, local Australian date/time, and optional note. Results are newest first and paginated in 50-row pages. Refresh history reloads the current page; Older movements and Previous page navigate the ledger.

## Verification evidence and limits

| Check | Recorded result |
| --- | --- |
| Domain tests | Seven tests passed: quantity/barcode/bin validation, account-link parsing, and safe receipt handling. |
| Database workflow tests | Rollback SQL checks passed for manager/staff/nonmember access, retries, cancellation, ledger attribution, and atomicity. Temporary test changes were rolled back. |
| TypeScript and lint | Final typecheck and Expo lint passed with no errors or warnings. |
| Expo Doctor | Final check passed all 21 checks. |
| Android, iOS, web bundles | Final export passed after the follow-up fixes using bundled Node 24.19.0. Bundling does not verify phone behavior. |
| Source review | Final scoped ship verdict cleared three findings: retry receipt IDs, dark-mode scanner, and pick quantity sign. Native recapture remains pending. |
| Supplemental web check | Account setup validation capture exists at `C:/Users/danis/.codex/visualizations/2026/10/06/01a10f90-a533-70a1-8fc7-f52b963328ee/warehouse-checks/account-setup-web.png`. |
| Physical phone checks | Camera/barcode/QR reading, native gestures, keyboard behavior, invitation/recovery callbacks, and an actual signed-in phone flow have not yet been tested. |
| Dependency advisories | npm reports 29 existing Expo/React Native/transitive advisories after compatible SDK patch updates: 11 moderate and 18 high. No forced upgrade was applied. |

The project requires Node 22.13.0 or newer. Final checks used bundled Node 24.19.0; the user's default shell remains on Node 20.20 and was not upgraded. The two workflow migrations are deployed and their tracked migration history was reconciled. Rollback SQL tests left no temporary test data.

There is no approved visual comp or native screenshot evidence for this extension. The browser capture verifies a supplemental unauthenticated web state only; it does not establish signed-in device behavior. Offline stock actions, expiry/batch tracking, reports, and multiple warehouses are outside the current scope.

## Phone acceptance checklist

**These steps change live stock and catalog/location records when performed. They are not the rollback SQL test.** Record initial counts before starting; restore counts through attributed stock actions when finished if needed. Use administrator-provisioned manager and staff accounts, and avoid repeating an action as a fresh receipt while a previous one is pending.

Existing grocery test barcodes are `2990000000019`, `2990000000026`, `2990000000033`, and `2990000000040`. The recorded starting stock is 10 for each in `A-01-01`; verify the current state first because later live actions may have changed it.

1. **Phone controls:** in light and dark mode, navigate Scan, Items, Locations, and Account; open details and return using the native back control/gesture. Check that keyboard-open fields and confirmation actions remain reachable, including multiline notes and passwords.
2. **Role gates:** as staff, confirm receive/move/pick are available and Adjust count, catalog edit/add/link, and location edit/add/delete are absent. Opening a manager route directly must show Manager access. As manager, confirm the permitted controls appear. Account must show the administrator-assigned role without a role selector.
3. **Camera and fallback:** scan each grocery barcode, deny camera permission and try manual lookup, then enable permission and check torch/Close scanner. Background and reopen the app during scanning. One scan should open one item screen with stock and bin context.
4. **Search:** find a grocery item by name, SKU, and exact barcode. Check empty search results and refresh. If more than 50 catalog rows exist, check next/previous pages and that a new search resets pagination.
5. **Receive:** for a grocery currently at 10 in `A-01-01`, receive 5 with a recognizable acceptance-test note. Confirm bin stock and total change from **10 to 15**, with one attributed `+5` movement.
6. **Safe retry/cancel:** during a controlled network interruption, if a stock action becomes pending, leave and reopen its form and check the original fields are locked. Restore connection and choose Confirm pending action; verify exactly one movement and one stock change. For a separate unresolved receipt, choose Cancel pending action: it must either confirm an already-applied result once or report cancellation with unchanged stock. A connection failure during cancellation must keep the receipt available for reconciliation.
7. **Move/pick/adjust:** use a manager-created second bin to move a small quantity; confirm equal source decrease/destination increase and an unchanged item total. Pick a small quantity and confirm the decrease. Attempt more than available stock and confirm rejection without a partial ledger/stock change. As manager, set an absolute count with a required reason and check the signed difference in history; staff must be denied adjustment.
8. **Unknown barcode:** use a spare product barcode confirmed absent from the store. Staff should see manager guidance. As manager, link it to an existing grocery through search and explicit confirmation; look it up again and verify it resolves to that item. Check existing barcode strings remain linked. Remove the spare link through the confirmation flow when finished if appropriate.
9. **Bin identity:** display and scan the `A-01-01` QR using a second screen or label. As manager, temporarily rename the location code, scan the original QR again, and confirm the same bin and contents resolve under the new name. Restore its code if needed. Confirm a location with stock/history cannot be deleted; test eligible deletion using a separate unused bin.
10. **Invitation/recovery:** when the user or administrator intentionally requests an email, finish invitation/password reset in an installed build and verify the callback leads to password setup. Confirm mismatched/short passwords show validation and a completed password permits login with the assigned role. In Expo Go/browser preview, verify the original email-link copy/paste flow. Check invalid/expired links remain recoverable, and verify setup cancellation signs out.

For each live stock test, inspect Movement history for actor, time, quantity, source/destination, and note. Record phone model, OS, app/build type, light/dark mode, and screenshots when completing native verification.
