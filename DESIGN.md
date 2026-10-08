---
name: ProductScanner
description: Native warehouse stock workflows using the existing light and dark theme.
colors:
  light-primary: "#1e6ef2"
  dark-primary: "#4d8dff"
  light-primary-text: "#ffffff"
  dark-primary-text: "#ffffff"
  light-text: "#000000"
  dark-text: "#ffffff"
  light-background: "#ffffff"
  dark-background: "#000000"
  light-background-element: "#F0F0F3"
  dark-background-element: "#212225"
  light-background-selected: "#E0E1E6"
  dark-background-selected: "#2E3135"
  light-text-secondary: "#60646C"
  dark-text-secondary: "#B0B4BA"
  light-danger: "#b91c1c"
  dark-danger: "#f87171"
typography:
  headline:
    fontSize: "28px"
    fontWeight: 700
  title:
    fontSize: "21px"
    fontWeight: 700
    lineHeight: "28px"
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "23px"
  label:
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "12px"
  panel: "14px"
spacing:
  half: "2px"
  one: "4px"
  two: "8px"
  three: "16px"
  four: "24px"
  five: "32px"
  six: "64px"
components:
  button-primary-light:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-primary-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-primary-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-secondary-light:
    backgroundColor: "{colors.light-background-element}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-secondary-dark:
    backgroundColor: "{colors.dark-background-element}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
---

# Design System: ProductScanner

## Overview

This document records the incumbent implementation in `src/constants/theme.tsx`, `src/components/warehouse-ui.tsx`, and the native screens. Extend its blue primary actions, system typography, light/dark surfaces, and familiar native controls. Keep the app consistent with the partner UI.

The warehouse extension has no approved visual comp or native screenshot evidence. These source observations preserve the existing system; they do not establish a redesign or a new visual authority. The supplemental browser capture of Account setup is not evidence of native appearance.

## Colors

The frontmatter preserves both theme palettes exactly. The system chooses light or dark from the device color scheme.

- **Primary:** blue actions and selected native tab labels use the matching `primary` token. Filled actions use `primaryText` for text and activity indicators.
- **Neutral:** `background` is the screen canvas; `backgroundElement` fills panels, fields, secondary actions, and catalog rows; `backgroundSelected` supplies input borders and selection support.
- **Text:** `text` carries labels, names, quantities, and headings; `textSecondary` carries supporting explanations, metadata, placeholders, and non-error notices.
- **Danger:** error notices and destructive confirmation buttons use the matching `danger` token.

Bin QR labels retain a white backing and black modules in either theme so the label remains readable by cameras. The scanner uses a black preview with a white frame. The legacy `ThemedText` link-primary style has a separate literal accent (`#3c87f7`); shared warehouse actions use the theme's primary token.

## Typography

Warehouse controls inherit the platform's system font rather than loading a custom face. The frontmatter records the shared `Screen`, `Copy`, and `Field` hierarchy; `px` expresses the source's React Native logical layout units.

The exact `Fonts` mappings in the incumbent theme are:

| Platform | sans | serif | rounded | mono |
| --- | --- | --- | --- | --- |
| iOS | `system-ui` | `ui-serif` | `ui-rounded` | `ui-monospace` |
| Android/default | `normal` | `serif` | `normal` | `monospace` |
| Web | `var(--font-display)` | `var(--font-serif)` | `var(--font-rounded)` | `var(--font-mono)` |

The web variables in `src/global.css` resolve to:

- Display: `Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji`.
- Serif: `Georgia, 'Times New Roman', serif`.
- Rounded: `'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif`.
- Mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`.

Shared button text uses size (16), weight (600); notices use size (15), line height (22). The existing `ThemedText` component retains its own hierarchy: default (16/24, weight 500), small (14/20, weight 500), small bold (14/20, weight 700), title (48/52, weight 600), subtitle (32/44, weight 600), link (14/30), and code (12, mono, weight 700 on Android and 500 elsewhere). Use the warehouse primitives for warehouse forms and lists to preserve their observed hierarchy.

## Layout

The shared spacing scale is captured exactly in the frontmatter. Screen layouts use a single vertical flow with top/left/right safe areas, scrollable content, and keyboard tap handling. Forms use keyboard avoidance with padding on iOS. The shared `Screen` has outer padding (24), content gap (20), bottom padding (48), and a centered maximum width (720). The theme additionally defines `MaxContentWidth` (800) and `BottomTabInset` (50 on iOS, 80 on Android, 0 elsewhere); these constants are distinct from the shared screen's actual width and padding.

Rows wrap actions with a gap (12); shared stacks use a gap (16). Catalog pages use a virtualized native `FlatList` with padding (24), bottom padding (48), row gap (12), and 50 rows per page. Catalog header spacing uses a gap (16). Location choices and smaller supporting forms use local gaps rather than a new global spacing scale.

The scanner is a full-screen native modal. Its header uses padding (16), footer uses padding (24), and the preview fills available space. The scan frame occupies 78% width, up to (360), with height (180). Close and torch actions sit outside the camera view.

## Elevation & Depth

Shared warehouse panels and controls use flat tonal surfaces without custom shadows or elevation values. Background color, spacing, headings, and borders distinguish groups. Native navigation and modal presentation provide the platform structure.

## Shapes

Controls and catalog rows use the softly rounded control radius; panels use the slightly larger panel radius in the frontmatter. Inputs have a border width (1), horizontal padding (14), vertical padding (13), and minimum height (48). Shared buttons also have minimum height (48); catalog rows have minimum height (72) and internal padding (18). Panels use padding (18) and gap (12).

The QR area is an undecorated white label with padding (24). QR rendering uses size (220) and quiet zone (16). Its identity comes from the encoded store and location IDs, while the readable location code appears in the screen's surrounding copy.

## Components

- **Navigation:** Expo Router routes live in `src/app/`. Native tabs expose Scan, Items, Locations, and Account with barcode, cube, grid, and person outline icons. Detail and edit screens use stack routes and an explicit Back control. Web uses a separate tab implementation.
- **Button:** primary, secondary, and danger variants use the matching theme tokens. Press opacity is (0.75); disabled/busy opacity is (0.5). Busy actions show an activity indicator and cannot be pressed again. Buttons expose role and disabled/busy accessibility state.
- **Field:** a visible label precedes a native text input. Placeholders use secondary text, autocorrection is off, and noneditable fields use opacity (0.6). Quantity, price, email, and password fields select the relevant keyboard/input behavior.
- **Copy, Notice, Panel:** copy establishes the shared title/body hierarchy; notices show status or errors using live-region semantics; tonal panels group item identity, bin contents, account identity, confirmations, and ledger entries.
- **Scanner:** camera permission, settings recovery, close, torch, and single-label capture appear in the full-screen modal. Camera activity follows app foreground state. Manual barcode lookup remains available from Scan.
- **Catalog browser:** search has an explicit Search action and keyboard submission; rows show item name, SKU, AUD price, and unit. Empty, loading, retry, refresh, and page controls are visible states.
- **Location picker:** filterable bin choices show the selected bin in the primary style and allow scanning a bin QR label. Source/destination choices are separate for moves.
- **Stock form:** item identity and total precede location, quantity, note, and confirmation controls. Adjust uses an absolute count and required reason. A pending receipt locks its original fields and exposes confirmation or reconciled cancellation; success opens the updated item.
- **Manager forms:** item details and barcode management use labeled fields and explicit save/link/removal confirmation. Location forms collect aisle, rack, bin, and optional code. Staff see role-appropriate screens and explanatory access gates.
- **Account setup:** email/reset request, invitation/reset link verification, and password/confirmation are separate states in the same native form. Account identity shows email, store, and assigned role.
- **Movement history:** panels show action and quantity, source/destination, actor email, local date/time, and optional note, with refresh and pagination.

## Do's and Don'ts

- **Do** use the matching light/dark theme tokens and shared controls for new warehouse screens.
- **Do** keep item identity, quantity, and bin context readable together before stock actions.
- **Do** preserve native navigation, safe areas, scroll/keyboard behavior, clear pending states, and readable touch controls.
- **Do** describe errors and recovery with the existing notice and action patterns.
- **Don't** replace the incumbent blue theme or system fonts through a feature extension.
- **Don't** treat browser captures or successful bundles as native visual verification.
- **Don't** encode a mutable location code as the identity of a bin QR label.
