# Git.Top Site Entry Repair Plan - 2026-06-29

## Context

Manual browser review of `https://git.top/` found that the product story is strong, especially on project detail, recommendation, trends, docs, and focused graph pages. The weak points are concentrated in the public entry experience: the homepage is dense, mobile navigation overflows, the homepage search lacks feedback, and the default `/graph` page can look unfinished while data loads.

## Goals

1. Make the homepage first decision clearer for new visitors.
2. Remove horizontal overflow on mobile and narrow desktop widths.
3. Make homepage search visibly update the project results area.
4. Make `/graph` useful before and during API loading.
5. Preserve the agent/API positioning and existing route structure.

## Repair Checklist

### P0 - Responsive Entry Fixes - Complete

- Collapse the broad homepage navigation into a smaller primary nav on mobile.
- Prevent long code snippets, links, cards, and graph rows from expanding the page width.
- Keep desktop navigation from clipping at 1280px.

Acceptance:

- At 390px viewport, `document.documentElement.scrollWidth <= window.innerWidth + 2`.
- At 1280px viewport, the homepage hero preview and nav do not visually clip.

Implementation notes:

- Homepage and graph templates now clamp page width, wrap long code/link/card content, and prevent body-level horizontal overflow.
- Mobile homepage navigation uses a compact two-column button grid.
- Focused project graph pages now wrap long headings, actions, and relationship labels.

### P0 - Homepage CTA Focus - Complete

- Reduce the hero action set to the main product paths:
  - Discover Projects
  - Get Recommendations
  - Explore Graph
  - Docs
- Move secondary paths into existing lower sections instead of the hero.

Acceptance:

- The first viewport has a clear primary path and does not feel like a full sitemap.

Implementation notes:

- Homepage hero actions are limited to Discover Projects, Get Recommendations, Explore Graph, and Docs.
- Secondary routes remain available in lower intent, docs, MCP, trust, and ecosystem sections.

### P1 - Search Feedback - Complete

- Add a live search status line near the project grid.
- On explicit search submit, scroll or focus the visitor toward the results.
- Show query and result count after loading.

Acceptance:

- Submitting the homepage search visibly updates the result state even when the URL does not change.

Implementation notes:

- Homepage project results now include an `aria-live` status line.
- Explicit search submit scrolls the user to the updated result section.
- Status text reports loading, result count, no-result, and failure states.

### P1 - Default Graph Page - Complete

- Replace the initial `Loading` and `-/100` impression with stable fallback copy.
- Use the canonical `cloudflare/agents` project id for API calls.
- If API loading fails, show a helpful fallback state instead of leaving blank or stale loading text.

Acceptance:

- `/graph` is useful with JavaScript pending, successful, or failed.
- `/graph/cloudflare/agents` remains the richer focused graph destination.

Implementation notes:

- `/graph` now renders a useful fallback graph, score, and comparison matrix before API enhancement.
- Client-side graph loading uses the canonical `cloudflare/agents` project id.
- API failure keeps the fallback content and replaces stale loading text with a useful message.

### P2 - Trust Explanation - Complete

- Keep trust, freshness, score methodology, and confidence links visible from the homepage.
- Defer deeper scoring UI changes to project and score pages unless another review requests them.

Acceptance:

- Homepage keeps a visible path to Docs, Quality, Coverage, Status, and score methodology.

Implementation notes:

- The Trust Model panel links directly to Trust Gate, score methodology, data freshness, Quality, Coverage, Status, Review queue, and security contact.

## Verification Plan

1. Run `pnpm check`.
2. Run the focused validation command most relevant to route rendering if needed.
3. Start the local Worker.
4. Browser-check:
   - `/`
   - `/graph`
   - `/graph/cloudflare/agents`
   - 1280x720 viewport
   - 390x844 viewport

## Verification Results

- `pnpm check` passed.
- `pnpm api:validate` passed.
- Local Worker GET checks returned `200` for `/` and `/graph`.
- Local Worker GET check returned `200` for `/graph/cloudflare/agents`.
- Browser metrics confirmed:
  - `/` at 1280px: no horizontal overflow; hero actions reduced to four primary CTAs.
  - `/` at 390px: no horizontal overflow; mobile navigation text fits.
  - `/graph`: live graph state loads without `Loading` or `-/100`; no horizontal overflow after fresh load.
  - `/graph/cloudflare/agents`: desktop and 390px mobile layouts have no horizontal overflow.

## Notes

- Do not alter API behavior for this repair.
- Keep changes scoped to public entry HTML/CSS/JS unless validation reveals a routing issue.

## Closure

This repair plan is complete. All P0, P1, and P2 checklist items have been implemented and verified. Any further work should be opened as a new plan, such as deeper score-evidence UI on project pages, broader visual redesign, or production deployment validation.
