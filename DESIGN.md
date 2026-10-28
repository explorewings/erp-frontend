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

This is the internal console behind Explore Wings, and it is built for a staff member who opens it at the start of a workday to get a job done. The surface is calm and deliberate rather than expressive: a warm stone paper ground with a faint dot grid, a single crimson accent that marks every moment of attention, and one near-black action. It is quiet on purpose, but quiet is not the absence of decisions — a warm tinted ground, a real type scale, and committed focus and error states carry the identity so that no screen reads as a default grey admin panel.

The brand enters through **type, palette, density, and one accent**, never through staging. The marketing site's dark, cinematic, image-led treatment is deliberately left there; the console keeps only the company's name, its crimson, and its warmth. Surface materials are flat white panels on the stone ground, separated by 1px hairlines and a single soft elevation, so the interactive elements always read as the foreground.

**Key Characteristics:**
- Warm stone neutrals (`#f4f3f1` ground, `#1b1a18` ink) rather than pure grey — the brand's warmth, at low volume.
- One crimson accent (`#dc2626`) reserved for the brand mark, focus, links, and errors.
- A near-black ink (`#1b1a18`) primary action, not the accent, so the accent stays scarce.
- Flat white surfaces over a faint dot-grid ground; one soft panel shadow, no second elevation.
- A single system UI face doing every role through size, weight, and tracking.

## Colors

A warm, low-saturation neutral field carries everything; one crimson does all the signalling.

### Primary
- **Ember Orange** (`#c2410c`, deep `#9a3412`): the accent. It appears on focus rings and focus borders on every control, the hover and active states of links, the active navigation state, the navigation icons on hover, and the account role chip. At 5.2:1 on white and 4.7:1 on the stone ground it clears AA as text, so one value serves as icon, ring, and link colour alike. Its scarcity is what makes it read as attention rather than decoration.

- **Brand Orange (Claude)** (`#cc785c`, deep `#b36a4e`): the branded background for primary actions and selected states � the sign-in button, the active sidebar item and its indicator dot, the account avatar, the settings tabs' active surface, permission card icons, table-row hover, and the loader. Used as a fill, not a text colour; text on it is white.

### Danger
- **Crimson** (`#dc2626`, deep `#b91c1c` on `#fef2f1`): red is not decoration, and it is never the everyday accent. It marks the destructive action and it marks errors, and nothing else. It fills the Sign out button (white on it, 4.8:1) and colours every field and form error. Keeping it a separate token from the accent is the whole point: a red Sign out reads as a warning, while an orange one would read as ordinary emphasis.

### Neutral
- **Desk Ink** (`#1b1a18`): primary text and the primary action button. A warm near-black, never pure `#000`.
- **Ink Deep** (`#26241f`): the primary button's hover only — one step deeper than Desk Ink, never a second resting colour.
- **Slate Stone** (`#5f5b55`): secondary and placeholder text. Warm, and legible at 6.8:1 on white and at 5.5:1 on the darkest point of the tinted ground, so it holds AA wherever it lands.
- **Paper Ground** (`#f4f3f1`): the page field — the warm stone workspace behind the panel.
- **Field Line** (`#9d978e`): the 1px border on inputs and the checkbox, dark enough to identify the control at 3.2:1 on white.
- **Rule Line** (`#e7e5e1`): decorative hairlines — panel border, link underlines. Not a control boundary.
- **Crimson Deep** (`#b91c1c`): error text, for the extra contrast error copy needs.
- **Crimson Wash** (`#fef2f1`): the error banner surface.

### Secondary
- **Resolved Green** (`#15803d`, surface `#f0fdf4`, line `#bbf7d0`): a resolved status only — a successful sign-in, or a service that answered. A state colour, not a brand colour; it never appears as decoration.

### Named Rules
**The One Accent Rule.** Orange is the accent: the brand mark, focus, links, the active/selected state of navigation, the navigation icons on hover, and the role chip — and nowhere else. If a new element wants emphasis and is not one of those, it gets ink or muted, not orange.

**The Danger Rule.** Red means destructive or wrong, and nothing else. It is reserved for the Sign out action and for errors. A new destructive control is red; a new error is red; no ordinary emphasis ever is.

**The State-Colour Exception.** Green exists solely for the success state and is never decorative; on this surface a success must not borrow the brand's own accent, nor the danger red.

## Typography

**Display Font:** IBM Plex Sans (self-hosted, variable)
**Body Font:** IBM Plex Sans (same)
**Label/Mono Font:** the same family at label size and weight

**Character:** One workhorse face for a working screen. IBM Plex Sans is a humanist grotesque with open apertures and a warm, faintly engineered voice — precise enough for dense data, warm enough to sit beside the crimson and the stone ground without shouting. Hierarchy is carried by size, weight, and space rather than by a second family: headings tighten and weigh 600, body sits at 400, labels at 500.

**Delivery:** self-hosted — two subset files (latin, latin-ext) of the variable font, so one file per subset covers every weight from 100 to 700. `font-display: swap` plus a preload of the latin file keep text visible while it loads; latin-ext carries the rupee sign used in pricing. Nothing is fetched from a third-party CDN at runtime. Licence: SIL Open Font License 1.1.

### Hierarchy
Eight documented steps, named as tokens in `tailwind.config.js`. Nothing in the build uses a size outside this ramp.
- **Display** (600, 1.75rem, lh 1.18, tracking -0.022em): the sign-in page heading. Balanced wrapping.
- **Heading** (600, 1.5rem, lh 1.2, tracking -0.022em): every console page heading.
- **Title** (600, 1.125rem, lh 1.4, tracking -0.01em): panel headings and empty-state headings.
- **Body** (400, 1rem, lh 1.6): supporting copy, control values, and button labels — 16px, so it never triggers mobile zoom and always clears the readable floor. `text-wrap: pretty` guards the last line.
- **Body Small** (400, 0.875rem, lh 1.5): list-row names, status rows, menu actions.
- **Label** (500, 0.8125rem, lh 1.4): field labels, row descriptions, the terms line.
- **Meta** (500, 0.75rem, lh 1.4): the user menu's email, notes, section identity.
- **Micro** (600, 0.6875rem, lh 1.3, tracking +0.08em, uppercase): the sidebar's single **Menus** label and the console version note. The only uppercase step.

### Named Rules
**The Tight-Not-Small Rule.** Emphasis comes from weight and tracked size, never from gradient text or a second display family. Headings earn weight; they do not earn a new font.

## Layout

A single centred column, `max-width: 25.5rem`, vertically and horizontally centred in a full-height field, with `48px` of padding above and below on small screens. Reading top to bottom: the brand lockup, a heading block with a `28px` gap beneath it, a white panel carrying the form and any status banner, then the terms line `28px` below the panel.

Inside the panel, fields stack with a `20px` gap; each label sits `6px` above its control. Density is comfortable and even — the form is short, so rhythm and alignment carry the composition. Below the `sm` breakpoint the column fills the width, the panel keeps its radius, and the padding tightens rather than the type.

The console shell is a full-height flex row: a sidebar (`256px`, or `72px` when railed) beside a column of a `64px` topbar and a scrolling content region. Content sits in a `max-width: 72rem` container with `24–32px` padding, so every page shares one measure and the shell supplies the frame rather than the page composition. On desktop the page grid splits into thirds (`2 / 1`) for a primary list and a side column; below `lg` it stacks.

## Elevation & Depth

Flat by default, with one soft panel lift. Surfaces are flat at rest; the only sustained shadow is the panel's, which reads as a slight lift above the stone ground rather than a glow. Inputs carry a hairline inset to sit just under the surface. Depth is conveyed by the ground-versus-surface contrast first, and by shadow second.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 2px rgba(27,26,24,0.04), 0 14px 34px -14px rgba(27,26,24,0.20)`): the form panel's resting lift. Offset with a soft, wide blur, never a zero-offset halo.
- **Field** (`box-shadow: inset 0 1px 1px rgba(27,26,24,0.03)`): the faint inset on inputs and the logo tile.
- **Action** (`box-shadow: 0 1px 2px rgba(27,26,24,0.24)`): the primary button's contact shadow.

### Named Rules
**The One-Elevation Rule.** Only the panel is lifted. Anything inside it — fields, buttons, banners — sits flat on the surface, distinguished by border and colour, not by stacked shadows.

## Shapes

A soft, restrained corner language in five documented steps, with `6px` (`xs`) as the house standard: the menu box, the brand logo tiles, the sidebar's footer buttons, and the checkbox. `10px` (`control`) is for fields and menu actions. `12px` (`tile`) is the user-menu dropdown. `16px` (`panel`) is the form and content panels. `999px` (`pill`) is avatars, status dots, chips, and notes. Borders are always a single 1px hairline — never a 2px+ accent stripe or a coloured side border. The only non-rectangular geometry is the round focus ring, which hugs each control's radius.

## Components

### Buttons
- **Shape:** soft rectangle (`10px` radius), full width in the form.
- **Primary:** Brand Orange (`#cc785c`) fill, white text, `44px` tall, `0 16px` padding, `semibold`. The one action on the surface (updated from Desk Ink to match the brand orange selected for action backgrounds). Hover deepens to `#b36a4e`; focus draws the crimson wash ring.
- **Hover / Focus:** hover deepens to `#26241f`; focus draws a 4px crimson wash ring (`rgba(220,38,38,0.25)`); active translates 1px down. Disabled drops to 60% opacity and keeps its resting position.
- **Loading:** an inline spinner replaces the label with "Signing in..."; the control is disabled and `aria-busy` sits on the form.

### Cards / Containers
- **Corner Style:** `16px` radius.
- **Background:** Surface (`#ffffff`) on Paper Ground.
- **Shadow Strategy:** the single Panel elevation; nothing nested is lifted.
- **Border:** 1px Rule Line (`#e7e5e1`).
- **Internal Padding:** `24px`, rising to `28px` at `sm`.

### Inputs / Fields
- **Style:** `44px` tall, white fill, 1px Field Line (`#9d978e`) border, `10px` radius, faint inset shadow, `14px` horizontal padding.
- **Focus:** border turns crimson and a 4px crimson wash ring (`rgba(220,38,38,0.15)`) appears — the focus treatment is the accent's main job.
- **Error:** border shifts to crimson at 60%; the message below is Crimson Deep with a drawn alert icon, wired to the field by `aria-describedby`.
- **Disabled / Busy:** the form carries `aria-busy` while submitting; the button shows the loading state.

### Icons
- Every icon comes from `react-icons` and is declared in one module, `src/components/icons.jsx`. Nothing draws its own glyph.
- **Two treatments.** Stroke-based sets (Lucide, Tabler) render on a 24 grid at `size 18` with a **1.75 stroke** — the sets' default 2, tuned down to match the system's lighter line — round caps and joins, and empty fill. Solid sets (Ionicons, Font Awesome, Codicons) ink the whole silhouette, so they take `fill: currentColor` with **no stroke** and sit a step smaller (`15–16`) to land at the same optical weight.
- Every icon is `currentColor`, so it takes the colour of its context and never carries its own, and is decorative by default (`aria-hidden`); a control that needs a name gets one on the button, not on the glyph.
- The module icons are pinned by name rather than drawn from one set: `IoCalendarSharp` (Calendar), `TbBeach` (Packages), `FaHotel` (Resorts), `FaChartBar` (CRM), `VscSettingsCompact` (Settings). That places outline and solid weights in the same nav, which the rest of the system avoids — a chosen exception, not the default.

### Password Toggle
- A Lucide eye icon in a `32px` hit area, absolutely positioned inside the password field's right edge. It is a real `<button>` with `aria-pressed` and a state-dependent `aria-label`, tinted muted at rest and ink on hover.

### Status Banner
- Inline below the form, `10px` radius, 1px border. Success is Resolved Green on its own wash with a drawn check; error is Crimson Deep on Crimson Wash with the alert icon. Both carry `role="status"`.

### Navigation
- The console shell carries one navigation model: a white sidebar on the left, a `64px` sticky topbar across the content, and a scrolling content outlet between them. Below `lg` the sidebar becomes an off-canvas drawer over an ink scrim, closed by its scrim or by any navigation.
- **Sidebar:** the brand lockup at the top, then a single **Menus** label over the menu box — no groups, no other section labels. The label is in the Micro step at full Slate Stone (never a tinted grey, which would fall under AA) and holds `12px` of air between itself and the box. The active item takes the **brand orange** fill (`#cc785c`), white text, a white icon, and a small white dot at its right edge; a hovered item's icon turns orange too. Every item is a real route, so nothing is a dead control.
- **Menu box:** the six destinations sit in one bordered container — `12px` radius, a 1px Rule Line, white on the white sidebar — with a 1px divider between every row, so the nav reads as one object rather than six floating pills. Rows are square inside it and the container clips their fills to its corners; because that clip would also eat an outset ring, focus is drawn **inset** here.
- **Landing:** the first item in the list is the console's home. Signing in and visiting `/erp` both resolve to it, so the list order is the product's priority order rather than decoration.
- **One left rail:** every left edge — the brand tile, the Menus label, each nav icon, and the footer's Sign out row — sits at `24px` (boxed rows land at `25px`, one border further in), and every glyph is centred in an `18px` slot. That slot is what keeps the labels aligned across a mixed icon set (outline glyphs at 18, solid ones at 15–16); without it the text staggers a few pixels per row.
- **Row metrics:** `40px` tall — a fixed `h-10`, so the bordered footer buttons land on the same height — in both the expanded list and the `72px` rail, with rows adjacent and separated by one hairline, so the two states read as one component rather than two.
- **Sidebar footer:** Sign out holds the left rail and the panel toggle — icon-only, no label — sits at the right edge. Both are bordered buttons at a fixed `40px`, squared off to the `xs` (`6px`) radius so the footer pair reads as standalone controls rather than as rows of the menu box. Sign out is the one **red-filled** control in the console — the danger token, never the accent — with a Crimson Deep border, white text and icon, deepening to Crimson Deep on hover (white sits at 4.8:1 on it, so it holds AA). The toggle is white with a **Field Line** border (`#9d978e`, 3.2:1 — Rule Line would sit at 1.26:1, under the 3:1 a control boundary needs) and muted ink that darkens on hover.
- **Footer focus:** Sign out draws an **ink** focus ring, not a crimson one — a crimson ring on a crimson fill is invisible. The toggle keeps the standard crimson wash.
- **Railed footer:** in the `72px` rail the two stack, toggle first and Sign out beneath it, each spanning the rail. Both carry an `aria-label` and a `title`, because neither is named by text once the rail hides its label.
- **Railed state:** on `lg` the sidebar collapses to a `72px` icon rail with the labels hidden, `title` tooltips on each icon, and the active dot moved to the rail's edge. The preference persists in `localStorage`. The rail never applies below `lg`, where the drawer is always full-width.
- **Topbar:** the current section name on the left (derived from the route), and the user menu on the right; the mobile menu button appears below `lg`.

### App Shell
- The logged-in frame is a full-height flex row: a sidebar beside a column of topbar plus content. Pages render their own header and composition inside the shared measure; the shell never supplies page structure.
- A route change replays one authored entrance on the content (`ew-rise`, 0.62s, ease-out) — a single moment, not a per-section effect — and the file honours `prefers-reduced-motion`.

### Page Header
- Every console page opens with one heading (`1.5rem`, 600, tracking `-0.022em`) and an optional lead line beneath it (`0.9375rem`, muted, max `62ch`), optionally with trailing actions. No kicker or eyebrow precedes it.

### Link Rows
- A list of destinations sits in one surface, each row separated by a 1px Rule Line. A row is an icon tile (`36px`, ground fill, hairline), a name, a muted description, and a trailing chevron; hover moves the row to a `60%` Paper Ground tint and the chevron from line to muted ink. Divided rows, never a grid of equal cards.

### Empty State
- An unbuilt section renders an honest empty state: an icon tile, a heading, one sentence naming what will go there, and a `Not connected …` note in a hairline pill. It states the real status rather than showing placeholder data.

### Status List
- A vertical list of `label → dot + word` rows for service state. The dot is decoration and the word carries the meaning: Resolved Green for ready, the danger red for unreachable, muted for not connected or still checking. The live row is announced with `aria-live="polite"`.

### User Menu
- A real menu button (initials avatar in ink, name and email on `sm`+, a rotating chevron) opening a `256px` panel: the account block with a Crimson Wash role chip, a hairline, and Sign out. It closes on outside pointer-down and on `Escape`, and carries `aria-haspopup` / `aria-expanded`.

### Modal
- A centered card over the (blurred) page: `max-width: 28rem`, `rounded-control` (10px), 1px Rule Line border, white surface, `shadow-2xl`, and a 1px ring. No scrim by default — the background surface is blurred (`blur-sm`, pointer events off) while it is open, and the panel reads against it through shadow and ring.
- Title (`text-title`, ink) on the left of the header; the close control is implicit — use a Cancel button (and Escape) rather than a separate chrome X.
- Fields stack with `16px` gaps. Each field is a `100%`-wide control: `rounded-xs` (`6px`) corners, Field Line (`#9d978e`) 1px border, `14px` horizontal padding, `10px` tall, with the accent focus ring (`rgba(220,38,38,0.15)`).
- Error state: a `rounded-xs` banner in the accent wash with a Crimson Deep message.
- Footer actions right-aligned: Cancel is a bordered, white-surface control with ink text; the primary (Create) is brand orange (`#cc785c`) with white text, `rounded-xs`, deepening to `#b36a4e` on hover and 60% opacity while disabled.
- An inline loader can replace the submit label while pending.
- For a choice between **two or three** options, prefer a segmented tab control (brand orange fill, white text) over a select dropdown.

## Do's and Don'ts

### Do:
- **Do** keep orange to the brand mark, focus, links, the active navigation state, and icon hover — the One Accent Rule. Red stays for Sign out and errors.
- **Do** give every control a visible crimson focus state; keyboard operation is the primary interaction on this surface.
- **Do** separate surfaces with the ground-versus-white contrast and one hairline before reaching for a shadow.
- **Do** keep input borders at Field Line (`#9d978e`) or darker so every field stays identifiable. The checkbox keeps its native control, themed through `accent-color`.

### Don't:
- **Don't** use pure grey (`#f5f5f5` / `#808080`) — the field is warm stone, tinted from the brand.
- **Don't** fill large areas with a colour: Sign out is the only control that goes edge to edge, it is small, and it takes the danger red rather than the accent.
- **Don't** import the marketing site's dark, cinematic, image-led staging into the console.
- **Don't** stack shadows inside the panel; there is exactly one elevation.
- **Don't** add a kicker or eyebrow label above the heading, and don't hand-roll a glyph — icons come from `src/components/icons.jsx`, one per role.
