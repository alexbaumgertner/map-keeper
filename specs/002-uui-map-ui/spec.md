# Feature Specification: Map UI from Figma (UUI)

**Feature Branch**: `002-uui-map-ui`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Take Figma mockups (via MCP) for Start Screen and Add a Business (empty + located) and update the app. Use EPAM UUI (Loveship) Next.js library."

**Design sources** (authoritative layouts for this feature):

- [Start Screen](https://www.figma.com/design/G30bAAgRmamDTVwGXUepay/Map-Watcher?node-id=15-2375) — left home panel + map with search and zoom/locate controls
- [Add a Business — location pending](https://www.figma.com/design/G30bAAgRmamDTVwGXUepay/Map-Watcher?node-id=3-2) — form with Housing/Food tabs; map click required; Next disabled
- [Add a Business — located](https://www.figma.com/design/G30bAAgRmamDTVwGXUepay/Map-Watcher?node-id=13-215) — filled form, coordinates shown, map pin, Next enabled

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on the start screen and orient (Priority: P1)

A visitor opens the product and sees a two-pane layout matching the Start Screen mockup: a fixed left home panel and a full-height map on the right. The panel shows the product title, a primary “Add Business” action with short supporting copy about reaching Maps.me, Mapy.com, OsmAnd, Organic Maps and similar apps, and bottom “Sign Up” / “Login” actions. The map shows geographic search and zoom / locate controls in the positions shown in the design.

**Why this priority**: This is the first impression and the entry to every other flow; without it the redesign has no home.

**Independent Test**: Open the start route unauthenticated and confirm layout, copy, actions, and map chrome match the Start Screen design intent (sidebar + map, not the previous marketing-only landing).

**Acceptance Scenarios**:

1. **Given** a visitor opens the start screen, **When** the page loads, **Then** they see a left home panel (~400px intent) with the product title, “Add Business”, helper text about multi-map reach, and Sign Up / Login at the bottom, beside a map that fills the remaining width.
2. **Given** the start screen, **When** the visitor looks at the map, **Then** they see a search field (placeholder about country, region, city, coordinates) at the map’s top-left and zoom-in, zoom-out, and locate controls at the map’s top-right.
3. **Given** the start screen, **When** they activate Sign Up or Login, **Then** they begin OpenStreetMap sign-in (no separate password account is created).
4. **Given** the start screen, **When** they activate Add Business while signed out, **Then** they are guided to sign in first (or the add flow remains unreachable until signed in)—they never start an unauthenticated draft publish path.

---

### User Story 2 - Start adding a business (location not yet set) (Priority: P1)

A signed-in owner opens Add Business and sees the left form panel from the “location pending” mockup: title “Add a Business” with a close control, Housing / Food category switch, fields for full name, pure proper name, and business type, a Location area instructing them to click the map, an optional “already have a page…” link field, and a disabled Next action until required inputs including a map location are present. The map retains search and navigation chrome; no pin is shown until they place a location.

**Why this priority**: This is the core onboarding creation path after claim/monitor foundations; it replaces the sparse draft form.

**Independent Test**: As a signed-in user, open Add Business with empty fields and no pin; confirm Next is unavailable and Location still prompts a map click.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they open Add Business, **Then** they see Housing and Food as the category switch (Housing selected by default matches the mockups) and fields for full name, pure proper name, and business type with the helper copy from the design.
2. **Given** Add Business with no map point yet, **When** they view Location, **Then** they see guidance to click the map to set location, and Next remains unavailable.
3. **Given** Add Business open, **When** they use close, **Then** they leave the add flow and return to the start/home context without writing to OpenStreetMap.
4. **Given** Add Business open, **When** they switch between Housing and Food, **Then** the category context updates and business-type choices remain appropriate to that category (housing/accommodation vs food).

---

### User Story 3 - Place the business on the map and continue (Priority: P1)

The owner clicks the map to set a point. The UI matches the “located” mockup: Location shows coordinates, a clear map pin marks the point, and Next becomes available once required name fields and location are present. Choosing Next advances to the next step of the existing draft/editor journey without publishing to OpenStreetMap.

**Why this priority**: Location is mandatory for a point draft; enabling Next is the gate out of this screen.

**Independent Test**: Fill required fields, click the map once, confirm pin + coordinates + enabled Next; activate Next and land in the subsequent local draft/editor step with nothing written to OpenStreetMap yet.

**Acceptance Scenarios**:

1. **Given** Add Business open, **When** the owner clicks the map, **Then** a pin appears at that point and Location shows readable coordinates.
2. **Given** required name fields and a map location are set, **When** the form is otherwise valid, **Then** Next is available and uses the accent (green) treatment from the design.
3. **Given** a pin already placed, **When** the owner clicks elsewhere on the map, **Then** the pin and coordinates update to the new point.
4. **Given** a valid form, **When** they choose Next, **Then** Mapkeeper saves a local draft (or equivalent next step) and does **not** open an OpenStreetMap changeset until a later explicit publish with diff preview (existing product rule).

---

### User Story 4 - Search and navigate the map while adding (Priority: P2)

While on start or Add Business, the owner uses map search and zoom/locate controls to find the right area before or after placing a pin, without leaving the two-pane layout.

**Why this priority**: Owners need to find their venue geographically; controls are in every mockup but are secondary to the form itself.

**Independent Test**: From Add Business, search or zoom/locate, then place or adjust a pin; layout stays sidebar + map.

**Acceptance Scenarios**:

1. **Given** the map is visible, **When** the user enters a place/region query in the map search field and selects a result, **Then** the map view moves to that area.
2. **Given** the map is visible, **When** they use zoom in/out or locate, **Then** the map viewport updates accordingly.
3. **Given** search fails or locate is denied, **When** the error occurs, **Then** the user sees a clear non-blocking message and can continue manually.

---

### Edge Cases

- Required fields empty or only whitespace: Next stays unavailable; fields show clear validation when the user tries to proceed.
- Map click before category/name filled: pin and coordinates may update; Next still waits for required text fields.
- Close mid-entry: discard or confirm discard of unsaved draft input; no OSM write.
- Signed-out user deep-links to Add Business: redirected or prompted to OSM sign-in.
- Narrow viewports: layout remains usable (stack or scroll) without hiding Add Business or map placement; pixel-perfect desktop mockup is the primary target.
- Map imagery: only allowlisted non-prohibited basemaps (no Google/Apple/Yandex/etc. tiles).
- Optional external page URL field: may be shown for the owner’s own page; the product MUST NOT scrape Booking, Airbnb, or other aggregator pages to auto-fill attributes (constitution: prohibited sources / aggregator scraping).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The start experience MUST present the Figma Start Screen structure: left home panel + map, with product title, Add Business (accent), multi-map helper copy, and Sign Up / Login actions.
- **FR-002**: Sign Up and Login MUST both start OpenStreetMap authentication only; Mapkeeper MUST NOT create a separate username/password account store.
- **FR-003**: Add Business MUST present the Figma form structure: title, close, Housing/Food switch, full name, pure proper name, business type, Location (prompt or coordinates), optional external page URL field, and Next.
- **FR-004**: Next MUST stay unavailable until required fields and a map location are present; when available it MUST be visually primary (accent) as in the located mockup.
- **FR-005**: Clicking the map MUST set or move a single point location, show a pin, and display coordinates in Location.
- **FR-006**: Completing Next on this screen MUST create or update a local draft only; it MUST NOT write to OpenStreetMap.
- **FR-007**: Housing and Food MUST map to the product’s accommodation and food-and-drink verticals for subsequent editing depth (deep presets for those verticals elsewhere remain unchanged by this feature’s scope).
- **FR-008**: Map chrome (search, zoom in/out, locate) MUST appear on start and Add Business screens in the positions indicated by the mockups.
- **FR-009**: Visual UI for these screens MUST match the approved Figma frames’ control styling, density, and theme (the mockups’ design system), not the previous marketing-style landing or ad-hoc form chrome.
- **FR-010**: UI labels and spacing SHOULD match the provided Figma frames; minor copy tweaks for legal accuracy (e.g. clarifying OpenStreetMap) are allowed if they do not change layout intent.
- **FR-011**: Any optional “paste a page link” control MUST NOT ingest data from prohibited or aggregator sources; auto-fill from Booking/Airbnb-style pages is out of scope for this feature.
- **FR-012**: Basemap and search MUST continue to honour Mapkeeper allowlisted/non-prohibited geography sources (no Google imagery or Nominatim public instance as product search).

### Key Entities

- **Start screen**: Unauthenticated or lightly authenticated home composition (panel + map).
- **Add Business draft**: In-progress local place with category (Housing/Food), display name, proper name, business type, point geometry, optional owner page URL—not yet an OSM element.
- **Map session**: Viewport, search query, pin presence, and locate permission state for the current screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a desktop walkthrough, reviewers rate start and Add Business screens as matching the three Figma frames for layout and primary controls at ≥90% agreement (sidebar/map split, CTAs, form fields, pin states).
- **SC-002**: A signed-in owner can open Add Business, set category and names, place a pin, and reach the next local step in under 2 minutes on a typical connection.
- **SC-003**: 100% of Next completions from this flow leave OpenStreetMap unchanged until a later explicit publish (verified by no changeset created in the test environment).
- **SC-004**: 100% of Sign Up / Login attempts from the start screen initiate OSM sign-in only (no alternate password registration path offered).
- **SC-005**: On a standard laptop viewport, primary actions (Add Business, Next when valid, Sign Up/Login) remain visible without horizontal page scroll of the whole app shell.

## Assumptions

- Product display name on these screens follows the Figma title **Map Watcher**; internal/repo name Mapkeeper may remain unchanged unless branding is unified later.
- Sign Up and Login are two labels for the same OSM OAuth entry (first-time vs returning), not separate account systems.
- “Add Business” in these mockups is the **new point draft** path; claiming an existing map object via discover/search remains the separate claim flow from the prior MVP and is not redesigned by these three frames.
- Housing ↔ accommodation vertical; Food ↔ food & drink vertical; business-type options are a curated subset suitable for MVP (e.g. guest house) rather than the full tagging schema on this step.
- Full name ≈ display name with type; pure proper name ≈ name without type—both stored for later tagging mapping in the existing editor.
- Next advances into the existing local editor / draft continuation; redesign of diff preview, conflict merge, and publish is out of scope.
- EPAM UUI with Loveship theme ([UUI docs](https://uui.epam.com/documents?category=components&id=accordion&mode=doc&theme=loveship)) is required for implementing these screens’ controls and theme tokens.
- Booking/Airbnb “grab info” is design chrome only for this release: no scraper; optional URL may be stored for the owner’s own allowlisted website flow later or left inert.
- Desktop mockups (≈1280×832) are the primary acceptance target; mobile is best-effort stacking, not pixel parity.
- Existing MapLibre (or equivalent allowlisted) basemap continues; Google and other prohibited tile sources remain forbidden.
