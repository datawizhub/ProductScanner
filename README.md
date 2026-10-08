# ProductScanner

Expo SDK 57 / React Native warehouse prototype for staff and managers at an Australian store. Product barcodes identify items; app QR labels identify bins. Stock mutations use Supabase RPCs and an attributed movement ledger.

## Run on a phone

1. Install Node.js **22.13.0 or newer**, then run `npm ci` in the project root.
2. Copy `.env.example` to **`.env.local` beside `package.json`**. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the project's publishable key. Secret and service-role/admin keys belong outside the app. Restart Expo after environment changes.
3. Run `npx expo start --lan` and open the app with Expo Go on the phone. The computer and phone must be able to reach each other. Use an installed development build for the app's native `productscanner://` callback scheme.
4. Sign in with an administrator-provisioned Prototype Store account. The administrator creates/invites users in Supabase Auth and assigns `staff` or `manager` through `store_memberships`; the app has no self-role registration.

For invitation or password recovery in Expo Go/browser preview, open **Forgot password or finish invitation?** on Login. Copy the **original link address directly from the email without opening it** into **Invitation or reset link**, choose **Verify email link**, and set a password. Link previews can consume a one-use token. Automatic callbacks require an installed app that registers the scheme. The exact approved Auth Site URL and callback are `productscanner://auth-callback`. No emails were sent by the implementation/verification work.

## Features

- **Stock actions:** staff and managers receive, move, and pick; managers adjust absolute counts with a required reason. Idempotent receipts support persisted pending actions, safe retry, and server-reconciled cancellation.
- **Locations:** filter bins and view their contents/QR labels. Managers add/edit and delete eligible unused locations. Labels encode store and location IDs so renaming a code preserves identity.
- **Catalog management:** managers add/edit items, manage multiple product barcodes, and link an unknown barcode to an existing item after explicit confirmation.
- **Search and lookup:** search names, SKUs, or exact barcodes in 50-row pages; use manual barcode lookup when camera scanning is unavailable.
- **Account setup:** view assigned store/role, refresh access, sign out, and complete invitation/password recovery.
- **Movement history:** view newest-first pages with actor, quantity, source/destination, time, and note.

## Existing grocery test labels

Show an SVG on another screen or print it for a phone scan. The recorded starting stock was 10 of each in `A-01-01`; check the current count before live testing.

| Barcode | Label |
| --- | --- |
| `2990000000019` | [EAN-13 label](test-assets/ean13-2990000000019.svg) |
| `2990000000026` | [EAN-13 label](test-assets/ean13-2990000000026.svg) |
| `2990000000033` | [EAN-13 label](test-assets/ean13-2990000000033.svg) |
| `2990000000040` | [EAN-13 label](test-assets/ean13-2990000000040.svg) |

The [workflow record and phone checklist](docs/warehouse-workflows.md) describe expected behavior and outstanding native checks. **Performing the phone checklist changes live stock and records.** The [SQL integration test](supabase/tests/warehouse_workflows.sql) uses a transaction and rolls its test changes back.

## Checks

```bash
npm test
npx tsc --noEmit
npm run lint
npx expo export --platform all
npx expo-doctor
```

Run lint and typecheck before declaring changes complete. For new Expo dependencies, use `npx expo install <package>` to resolve an SDK-compatible version. Native camera/QR behavior, gestures, keyboard handling, and Auth callbacks still require phone testing; successful bundles do not establish that evidence.

## Project records

- [Warehouse workflows, verification status, and phone acceptance](docs/warehouse-workflows.md)
- [Database contracts, provisioning, and migrations](supabase/README.md)
- [Product scope](PRODUCT.md) and [existing design system](DESIGN.md)

Routes live in `src/app/`; shared components, hooks, and data helpers live outside that directory. The prototype has no offline stock workflow, expiry/batch tracking, reports, or multiple warehouses.
