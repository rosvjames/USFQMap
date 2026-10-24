# MiCampus USFQ Implementation Plan

> **For agentic workers:** Use the already authorized parallel split: mascot kit subagent, UI and integration by the parent agent. Track completion here. Do not ask for another execution approval.

**Goal:** Ship the approved solid-color Gastón kit and a professional MiCampus USFQ interface aligned with the current USFQ website.

**Architecture:** Keep existing React components, navigation state and Vite stack. Replace visual tokens and UI markup without changing scene geometry, routing or data. Produce the mascot in a versioned independent directory and consume only required resources.

**Tech Stack:** React, TypeScript, native CSS, local WOFF2 fonts, transparent PNG/WebP, built-in image generation.

**Spec:** User-approved design and parallel execution in this chat; visual reference `output/imagegen/gaston-mock-kit-colores-solidos-v2.png`.

## Global Constraints

- Product name: MiCampus USFQ.
- Red #E11B22; charcoal #231F20; white/neutral UI surfaces.
- Zalando Sans Expanded for short headings and Lato for text and controls.
- Gastón: pig in dragon costume, asymmetric eye patch, solid fills, ink contour, no crayon/3D.
- Preserve active map-agent changes. No edits to scene, terrain, routing or animal models.
- Current codex branch is shared intentionally; isolate by file ownership. No reset, stash, branch switch or broad staging.
- No new dependencies. Keep user-facing flow and map interactions intact.
- Images are decorative where adjacent text already carries meaning; reduced motion uses a static pose.

## Review Focus

- Narrow mobile layouts and software keyboard must leave search and destination actions usable.
- Long destination names and route instructions must wrap without mascot overlap.
- Changing the direction of an asymmetric mascot must not mirror the eye patch.
- Search, route origin, step navigation, first-person controls and sources dialog must still work.
- New assets must load without broken URLs, clipped silhouettes or oversized initial downloads.

## Tasks

- [x] **Kit production (subagent):** own `public/mascota/gaston-v2/` and `output/gaston-v2/`; produce master, 17 semantic PNGs, appropriate animation variants, manifest, gallery, QC and ZIP. Validate alpha, frames, resolution and actual visual identity. Do not touch app files.
- [x] **UI design (parent):** own `src/styles.css`, `src/App.tsx`, UI-only components, `src/main.tsx`, `index.html`, local fonts and the README interface description. Replace toy-like volume and equal pastel tiles with clear action hierarchy, dividers and compact geometric controls. Preserve component callbacks and state.
- [x] **Integration (parent):** use versioned semantic mascot paths; prioritize splash/home/navigation/search states; ensure initial loading requests only needed files. Use the product name in title, visible identity, splash and documentation.
- [x] **Verification and handoff:** run build and full tests; inspect actual browser at desktop and mobile widths, search and no-results, destination, navigation and sources. Check reduced motion, loaded assets and console errors. Independently review UI changes and kit contract, fix actionable failures, leave localhost open and provide ZIP.

## Decisions and Results

- 2026-10-23: User approved execution. Keep work in current shared checkout with explicit ownership so map changes remain visible in the running app.
- 2026-10-23: UI work is primarily visual; use build, existing behavioral suite and browser verification rather than implementation-mirroring unit tests.

- 2026-10-23: Completed kit: 17 transparent 1254px PNGs, 17 optimized static WebPs, 12 once-per-event animated previews, construction views, icon, portable gallery and ZIP. Parent independently checked manifest references, alpha/frame checker, ZIP CRC, contact sheet, gallery pause and simulated reduced motion.
- 2026-10-23: Completed UI and integration. Browser checks at 320×740, 390×844 and 1280×900 covered search/no-results, historical classroom provenance, destination, all navigation steps, sources dialog, first-person entry/exit, and grabber click/Enter/drag. No final-load browser errors or horizontal document overflow.
- 2026-10-23: Fixed pre-existing grabber click interception by capturing pointer on the grabber itself while allowing gesture events to bubble. Focused independent review approved this fix and UI changes.
- 2026-10-23: Final build passed, 144 tests passed in 35 files. Existing large Vite bundle advisory remains. Motion previews animate whole illustrations, not independent articulated limbs. Native device GPS and an actual phone keyboard were not exercised.
