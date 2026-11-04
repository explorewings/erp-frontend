---
name: Explore Wings Operations Console
description: The quiet, precise back office behind the Explore Wings travel brand.
colors:
  ink: "#1b1a18"
  ink-deep: "#26241f"
  ink-muted: "#5f5b55"
  brand-orange: "#cc785c"
  brand-orange-deep: "#b36a4e"
  ground: "#f4f3f1"
  surface: "#ffffff"
  line: "#e7e5e1"
  field-line: "#9d978e"
  accent: "#c2410c"
  accent-strong: "#9a3412"
  accent-soft: "#fff7ed"
  danger: "#dc2626"
  danger-strong: "#b91c1c"
  danger-soft: "#fef2f1"
  success-ink: "#15803d"
  success-surface: "#f0fdf4"
  success-line: "#bbf7d0"
typography:
  display:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.022em"
  heading:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  title:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  xs: "6px"
  control: "10px"
  tile: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  field-gap: "20px"
  panel-pad: "24px"
  shell-pad: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-orange-deep}"
  button-signout:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: "40px"
    padding: "0 12px"
  button-signout-hover:
    backgroundColor: "{colors.danger-strong}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 14px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  nav-item:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    padding: "10px 12px"
  nav-box:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xs}"
  nav-item-active:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.surface}"
---

# Design System: Explore Wings Operations Console

## Overview

**Creative North Star: "The Operations Desk"**

This is the internal console behind Explore Wings, and it is built for a staff member who opens it at the start of a workday to get a job done. The surface is calm and deliberate rather than expressive: a warm stone paper ground, a restrained orange brand accent, and clear semantic colors for destructive, error, and success states. It is quiet on purpose, but quiet is not the absence of decisions — a warm tinted ground, a real type scale, and committed focus and error states carry the identity so that no screen reads as a default grey admin panel.

The brand enters through **type, palette, density, and one accent**, never through staging. The marketing site's dark, cinematic, image-led treatment is deliberately left there; the console keeps the company's name, its orange, and its warmth. Surface materials are white panels on the stone ground, usually separated by 1px hairlines; reserve shadows for overlays and drawers rather than adding elevation to every card.

**Key Characteristics:**
- Warm stone neutrals (`#f4f3f1` ground, `#1b1a18` ink) rather than pure grey — the brand's warmth, at low volume.
- Brand orange (`#cc785c`, hover `#b36a4e`) for primary actions and selected states; pale accent tokens provide focus and soft emphasis.
- Near-black ink (`#1b1a18`) for primary content, with danger red and success green reserved for their semantic states.
- White surfaces over a warm stone ground, separated by hairlines; use shadows sparingly for overlays and drawers.
- A single self-hosted IBM Plex Sans family doing every role through size, weight, and spacing.

## Colors

A warm, low-saturation neutral field carries the interface, with orange for brand emphasis and semantic colors for status.

### Primary
- **Accent** (`#d69375`, strong `#b76c4f`, soft `#fff5ef`): focus borders/rings and restrained accent emphasis. Use the darker strong token where text or icons need contrast.

- **Brand Orange** (`#cc785c`, deep `#b36a4e`): the branded fill for primary actions and selected states, including the active navigation item, tabs, and action icons. Use white text/icons on the fill.

### Danger
- **Danger Red** (`#dc2626`, deep `#b91c1c`, soft `#fef2f1`): reserved for destructive actions and errors, never routine emphasis.

### Neutral
- **Desk Ink** (`#1b1a18`): primary text and neutral actions. A warm near-black, never pure `#000`.
- **Ink Deep** (`#26241f`): deeper ink for hover emphasis, never a second resting text colour.
- **Slate Stone** (`#5f5b55`): secondary and placeholder text. Warm, and legible at 6.8:1 on white and at 5.5:1 on the darkest point of the tinted ground, so it holds AA wherever it lands.
- **Paper Ground** (`#f4f3f1`): the page field — the warm stone workspace behind the panel.
- **Field Line** (`#9d978e`): the 1px border on inputs and the checkbox, dark enough to identify the control at 3.2:1 on white.
- **Rule Line** (`#e7e5e1`): decorative hairlines — panel border, link underlines. Not a control boundary.
- **Danger Strong** (`#b91c1c`): error text for the extra contrast error copy needs.
- **Danger Wash** (`#fef2f1`): the error banner surface.

### Secondary
- **Resolved Green** (`#15803d`, surface `#f0fdf4`, line `#bbf7d0`): a resolved status only — a successful sign-in, or a service that answered. A state colour, not a brand colour; it never appears as decoration.

### Named Rules
**The Brand-Then-Semantic Rule.** Orange identifies primary actions and selected states. Red identifies destructive/error states; green identifies success. Do not use status colors as decoration.

**The Danger Rule.** Red means destructive or wrong, and nothing else. A new destructive control or error state is red; ordinary emphasis is orange or ink.

**The State-Colour Rule.** Green exists solely for the success state and is never decorative.

## Typography

**Display Font:** IBM Plex Sans (self-hosted, variable)
**Body Font:** IBM Plex Sans (same)
**Label/Mono Font:** the same family at label size and weight

**Character:** One workhorse face for a working screen. IBM Plex Sans is a humanist grotesque with open apertures and a warm, faintly engineered voice — precise enough for dense data, warm enough to sit beside the orange accent and stone ground without shouting. Hierarchy is carried by size, weight, and space rather than by a second family: headings tighten and weigh 600, body sits at 400, labels at 500.

**Delivery:** self-hosted — two subset files (latin, latin-ext) of the variable font, so one file per subset covers every weight from 100 to 700. `font-display: swap` plus a preload of the latin file keep text visible while it loads; latin-ext carries the rupee sign used in pricing. Nothing is fetched from a third-party CDN at runtime. Licence: SIL Open Font License 1.1.

### Hierarchy
Eight documented steps, named as tokens in `tailwind.config.js`. Prefer these tokens for page text; use smaller utility sizes only for dense metadata or icon-only controls.
- **Display** (600, 1.75rem, lh 1.18, tracking -0.022em): the sign-in page heading. Balanced wrapping.
- **Heading** (600, 1.5rem, lh 1.2, tracking -0.022em): page headings when a page title is needed.
- **Title** (600, 1.125rem, lh 1.4, tracking -0.01em): panel headings and empty-state headings.
- **Body** (400, 1rem, lh 1.6): supporting copy and comfortable reading. `text-wrap: pretty` guards the last line.
- **Body Small** (400, 0.875rem, lh 1.5): list-row names, status rows, menu actions.
- **Label** (500, 0.8125rem, lh 1.4): field labels, row descriptions, the terms line.
- **Meta** (500, 0.75rem, lh 1.4): the user menu's email, notes, section identity.
- **Micro** (600, 0.6875rem, lh 1.3, tracking +0.08em): tiny supporting labels such as the sidebar section label. Uppercase is an explicit treatment for those labels only, not for button, tab, or selector text.

### Named Rules
**The Tight-Not-Small Rule.** Emphasis comes from weight and tracked size, never from gradient text or a second display family. Headings earn weight; they do not earn a new font.

## Layout

The sign-in page uses a single centred column, `max-width: 25.5rem`, vertically and horizontally centred in a full-height field, with `48px` of padding above and below on small screens. Reading top to bottom: the brand lockup, a heading block with a `28px` gap beneath it, a white panel carrying the form and any status banner, then the terms line `28px` below the panel. This sign-in composition is not a template for every console page.

Inside the panel, fields stack with a `20px` gap; each label sits `6px` above its control. Density is comfortable and even — the form is short, so rhythm and alignment carry the composition. Below the `sm` breakpoint the column fills the width, the panel keeps its radius, and the padding tightens rather than the type.

The console shell is a full-height flex row: a sidebar (`256px`, or `72px` when railed) beside a column of a `64px` topbar and a content region. Standard pages scroll within the content region; full-height workspaces such as CRM and Kanban keep their own board scroll areas. Content generally uses a `max-width: 72rem` measure with `24–32px` horizontal padding. Pages own their header and composition. Use responsive grids only when the content benefits from columns; do not force every page into a `2 / 1` layout.

## Elevation & Depth

Flat by default. Surfaces are flat at rest; cards use a hairline border and ground-versus-surface contrast before any shadow. Drawers and temporary overlays may use the panel shadow to read above page content. Inputs do not need a decorative inset shadow.

### Shadow Vocabulary
- **Panel** (`shadow-panel`): reserve for drawers and floating panels that must separate from the page.
- **Field** (`shadow-field`): optional and subtle; borders and focus states are sufficient for most controls.
- **Action**: buttons are flat; communicate priority with color, not a persistent shadow.

### Named Rules
**The Surface-First Rule.** Prefer contrast and a hairline border. Avoid stacked or decorative shadows.

## Shapes

A soft, restrained corner language in five documented steps, with `6px` (`xs`) as the standard for compact controls, `10px` (`control`) for fields and dialogs, `12px` (`tile`) for cards, `16px` (`panel`) for larger panels, and `999px` (`pill`) for avatars and chips. Borders are normally a single 1px hairline. Avoid thick accent stripes and colored side borders.

## Components

### Buttons
- **Shape:** compact rounded rectangle; use the shared control radius and size with its page context.
- **Primary:** Brand Orange (`#cc785c`) fill, white text. Hover deepens to `#b36a4e`; focus uses the orange accent ring.
- **Hover / Focus:** hover darkens the current fill; focus draws a visible 4px accent wash ring. Disabled controls lower opacity and keep their resting position.
- **Loading:** an inline spinner replaces the label with "Signing in..."; the control is disabled and `aria-busy` sits on the form.

### Cards / Containers
- **Corner Style:** use the documented tile/panel radius according to card density.
- **Background:** Surface (`#ffffff`) on Paper Ground.
- **Shadow Strategy:** flat by default; reserve `shadow-panel` for overlays and drawers.
- **Border:** 1px Rule Line (`#e7e5e1`).
- **Internal Padding:** generally `16–20px` for settings/summary cards; larger panels may use `24px`.

### Inputs / Fields
- **Style:** typically `40–44px` tall, white fill, 1px Field Line (`#9d978e`) border, compact rounded corners, and `12–14px` horizontal padding.
- **Focus:** border and 4px focus ring use the accent color/tint.
- **Error:** border shifts to danger red; the message uses the danger-strong color with a drawn alert icon, wired to the field by `aria-describedby`.
- **Disabled / Busy:** the form carries `aria-busy` while submitting; the button shows the loading state.

### Icons
- Use icons from `react-icons`; shared navigation/module icons are declared in `src/components/icons.jsx`, while feature-specific controls may import their icon directly. Nothing draws its own glyph.
- **Two treatments.** Stroke-based sets (Lucide, Tabler) render on a 24 grid at `size 18` with a **1.75 stroke** — the sets' default 2, tuned down to match the system's lighter line — round caps and joins, and empty fill. Solid sets (Ionicons, Font Awesome, Codicons) ink the whole silhouette, so they take `fill: currentColor` with **no stroke** and sit a step smaller (`15–16`) to land at the same optical weight.
- Every icon is `currentColor`, so it takes the colour of its context and never carries its own, and is decorative by default (`aria-hidden`); a control that needs a name gets one on the button, not on the glyph.
- The module icons are pinned by name rather than drawn from one set: `IoCalendarSharp` (Calendar), `TbBeach` (Packages), `FaHotel` (Resorts), `FaChartBar` (CRM), `VscSettingsCompact` (Settings). That places outline and solid weights in the same nav, which the rest of the system avoids — a chosen exception, not the default.

### Password Toggle
- A Lucide eye icon in a `32px` hit area, absolutely positioned inside the password field's right edge. It is a real `<button>` with `aria-pressed` and a state-dependent `aria-label`, tinted muted at rest and ink on hover.

### Status Banner
- Inline below the form, `10px` radius, 1px border. Success uses the success palette with a check; error uses danger-strong text on the danger wash with an alert icon. Announce status and error feedback with the appropriate live region.

### Navigation
- The console shell carries one navigation model: a white sidebar on the left, a `64px` sticky topbar across the content, and a scrolling content outlet between them. Below `lg` the sidebar becomes an off-canvas drawer over an ink scrim, closed by its scrim or by any navigation.
- **Sidebar:** the brand lockup at the top, then a single **Menus** label over the menu box — no groups, no other section labels. The label is in the Micro step at full Slate Stone (never a tinted grey, which would fall under AA) and holds `12px` of air between itself and the box. The active item takes the **brand orange** fill (`#cc785c`), white text, a white icon, and a small white dot at its right edge; a hovered item's icon turns orange too. Every item is a real route, so nothing is a dead control.
- **Menu box:** the six destinations sit in one bordered container — `12px` radius, a 1px Rule Line, white on the white sidebar — with a 1px divider between every row, so the nav reads as one object rather than six floating pills. Rows are square inside it and the container clips their fills to its corners; because that clip would also eat an outset ring, focus is drawn **inset** here.
- **Landing:** the first item in the list is the console's home. Signing in and visiting `/erp` both resolve to it, so the list order is the product's priority order rather than decoration.
- **One left rail:** every left edge — the brand tile, the Menus label, each nav icon, and the footer's Sign out row — sits at `24px` (boxed rows land at `25px`, one border further in), and every glyph is centred in an `18px` slot. That slot is what keeps the labels aligned across a mixed icon set (outline glyphs at 18, solid ones at 15–16); without it the text staggers a few pixels per row.
- **Row metrics:** `40px` tall — a fixed `h-10`, so the bordered footer buttons land on the same height — in both the expanded list and the `72px` rail, with rows adjacent and separated by one hairline, so the two states read as one component rather than two.
- **Sidebar footer:** Sign out holds the left rail and the panel toggle — icon-only, no label — sits at the right edge. Both are bordered buttons at a fixed `40px`, squared off to the `xs` (`6px`) radius so the footer pair reads as standalone controls rather than as rows of the menu box. Sign out is the one **red-filled** control in the console — the danger token, never the accent — with a danger-strong border and white text/icon. The toggle is white with a **Field Line** border (`#9d978e`) and muted ink that darkens on hover.
- **Footer focus:** Sign out draws an **ink** focus ring, not an orange one — an orange ring on a red fill can be hard to distinguish. The toggle keeps the standard accent wash.
- **Railed footer:** in the `72px` rail the two stack, toggle first and Sign out beneath it, each spanning the rail. Both carry an `aria-label` and a `title`, because neither is named by text once the rail hides its label.
- **Railed state:** on `lg` the sidebar collapses to a `72px` icon rail with the labels hidden, `title` tooltips on each icon, and the active dot moved to the rail's edge. The preference persists in `localStorage`. The rail never applies below `lg`, where the drawer is always full-width.
- **Topbar:** the current section name on the left (derived from the route), and the user menu on the right; the mobile menu button appears below `lg`.

### App Shell
- The logged-in frame is a full-height flex row: a sidebar beside a column of topbar plus content. Pages render their own header and composition inside the shared measure; the shell never supplies page structure.
- A route change replays one authored entrance on the content (`ew-rise`, 0.62s, ease-out) — a single moment, not a per-section effect — and the file honours `prefers-reduced-motion`.

### Page Header
- Pages that need a title use one heading (`1.5rem`, 600, tracking `-0.022em`) and an optional lead line beneath it (`0.9375rem`, muted, max `62ch`), optionally with trailing actions. Data workspaces may lead with their tabs and controls when those are the page's primary navigation. Avoid redundant title/subtitle blocks that push the working content down. No kicker or eyebrow precedes a heading.

### Link Rows
- Use divided link rows for navigational lists when scanning a single list is clearer than cards. Use a responsive card grid for independent settings or action categories; each card uses a small orange icon tile, a clear title, and a concise muted description. Keep cards flat with a hairline border and consistent padding.

### Empty State
- An empty state names what is missing and what will appear when it is available. If there is a relevant next action, show a clear action control above or beside the message; wire it only when the workflow exists. Never fabricate example records or imply a feature is connected when it is not.

### Status List
- A vertical list of `label → dot + word` rows for service state. The dot is decoration and the word carries the meaning: Resolved Green for ready, the danger red for unreachable, muted for not connected or still checking. The live row is announced with `aria-live="polite"`.

### User Menu
- A real menu button (initials avatar in ink, name and email on `sm`+, a rotating chevron) opening a `256px` panel: the account block with a subtle semantic role chip, a hairline, and Sign out. It closes on outside pointer-down and on `Escape`, and carries `aria-haspopup` / `aria-expanded`.

### Dialogs, Modals, and Drawers
- Choose the surface by task: use a compact modal for confirmations, search, or a short focused form; use a right-side drawer for entity details and longer create/edit workflows.
- Position overlays relative to the application content area (the page below the topbar), not the browser viewport. When rendering through a portal, measure/anchor to `<main>` so a dialog stays visually associated with the active page and its tabs, including when the sidebar is collapsed. Do not center every dialog on the full viewport.
- Use a dim scrim for blocking dialogs. Do not blur and disable the whole page as the default modal treatment. Keep backdrop dismissal and Escape behavior consistent with whether the operation is safe to cancel.
- Keep simple dialogs compact (`max-width` around `24–32rem`). A complex multi-step or data-import workflow may use up to about `40rem` when its content needs it; avoid oversized dialogs for a small form or single action. Constrain height to the available content viewport and scroll the dialog body rather than forcing a large fixed height.
- Drawers align below the topbar, fill the available content height, and use a moderate width (typically `26–32rem` on desktop); use full width on small screens. Keep drawer headers and footers fixed while the body scrolls when the workflow requires it.
- Use a clear title and an explicit close/cancel control. Provide an accessible dialog name, keyboard dismissal where safe, and restore focus to the invoking control on close.
- Fields stack with consistent spacing and use the shared input tokens. Errors use the semantic danger colors; primary actions use brand orange. Keep labels and control values in normal case—avoid all-caps transforms for buttons, tabs, and selectors.
- For a choice between **two or three** options, prefer a compact segmented tab control over a select dropdown when the options are peer views.

### Page Tabs and Action Rows
- Place page tabs at the leading edge of the page's content measure and page actions on the same row at the trailing edge, matching Clients and Settings.
- Use a compact segmented control: `rounded-lg` border with `p-1`; tabs use `px-4 py-1.5`, `text-sm`, and `font-medium`. The selected tab uses brand orange with white text; inactive tabs use muted text.
- Align action controls with the tab row. Keep icon-only controls consistently sized and label controls in normal case. Use the same height within a control group; do not let buttons become taller than their adjacent selector or navigation controls.

## Do's and Don'ts

### Do:
- **Do** use orange for primary actions and selected states, and reserve danger red for destructive/error states.
- **Do** give every control a visible accent focus state; keyboard operation is a primary interaction.
- **Do** separate surfaces with the ground-versus-white contrast and one hairline before reaching for a shadow.
- **Do** keep input borders at Field Line (`#9d978e`) or darker so every field stays identifiable. The checkbox keeps its native control, themed through `accent-color`.

### Don't:
- **Don't** use pure grey (`#f5f5f5` / `#808080`) — the field is warm stone, tinted from the brand.
- **Don't** fill large content surfaces with a status color; keep color emphasis to controls, selected states, and small icon tiles.
- **Don't** import the marketing site's dark, cinematic, image-led staging into the console.
- **Don't** stack shadows or use large modal dimensions for simple forms.
- **Don't** center modals against the whole browser viewport when the console content area is narrower or offset by the sidebar.
- **Don't** add a kicker or eyebrow label above the heading, and don't hand-roll a glyph — icons come from `src/components/icons.jsx`, one per role.
