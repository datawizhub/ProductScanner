# ProductScanner

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Staff and managers at an Australian store use phone cameras in a warehouse.

## Product Purpose

Scan a product, locate its stock, and receive, move, pick or adjust quantities with an auditable ledger.

## Operating Context

Locations use aisle/rack/bin codes. Manufacturer barcodes identify products; our QR labels identify bins.
The prototype tests functionality on phones. There is no existing ERP or customer label system.

## Capabilities and Constraints

Expo SDK 57, React Native and TypeScript; hosted Supabase PostgreSQL in Sydney.
Postgres RPCs alone mutate stock. RLS isolates stores. Barcodes are strings and an item may have many.
Staff read and receive/move/pick; managers additionally edit catalog/locations and adjust counts.
Account provisioning is an administrator task; users do not choose their own role.
Offline mode, expiry/batch tracking, reports and multi-warehouse are outside the current scope.
Item/user counts and label printing remain undecided. Web and integrations come later.

## Brand Commitments

Extend the existing light/dark mobile theme, blue primary action, system type, and familiar native controls.

## Product Principles

Make stock actions explicit, attributed and safe to retry.
Show item, quantity and location together.
Keep manager permissions enforced in the database.
Use short forms and readable touch targets for warehouse work.
