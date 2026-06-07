# Stellar Vision — Portfolio Enhancement Notes

Living document. Status markers:
- `[ ]` planned
- `[~]` in progress
- `[x]` done
- `[hold]` waiting on approval / decision
- `[skip]` decided against

---

## Current focus

**B — Edits to existing UI/UX.** A (new sections) is on hold pending approval. C (creative) and D (strategic) are notes for later.

---

## A. ADD — new sections / features  `[hold pending approval]`

Captured for context. Nothing here gets touched until you approve specific items.

- [hold] **A1. Case studies (per-project deep dives)** — `/work/<slug>` route, with client / industry / problem / strategy / metrics / before-after visuals / pull quote. Requires extending the `Project` interface in `src/constants/index.ts` and adding lazy-loaded case study route. *Highest-impact add.*
- [hold] **A2. Numbers / trust strip** — "50+ Shopify stores · $XM in client revenue · MENA-wide · Since YYYY". Animated counters on scroll.
- [hold] **A3. "How we work" process section** — visualize text3D philosophy as a 5–6 stage timeline (Discovery → Strategy → Design → Build → Launch → Optimize).
- [hold] **A4. Services menu** — dedicated grid for the 5 service categories (Brand Identity, Motion, Websites, Products, UI/UX), with deliverables.
- [hold] **A5. Founder / team section** — Abdelrahman + bio + LinkedIn. Personal trust matters in MENA buyer behavior.
- [hold] **A6. Arabic version (i18n)** — `react-i18next` + RTL layout. Doubles addressable market in MENA.
- [hold] **A7. Lead magnet / instant audit tool** — URL-input audit, ROI calculator, or gated PDF. Captures the 95% who don't book.
- [hold] **A8. Proper footer** — services links, location, social, contact, secondary CTA.

---

## B. EDIT — improve what already exists  `[in progress]`

Ranked roughly by impact ÷ effort. Each one is a self-contained change to live components.

### B1. Hero copy rewrite  `[ ]`  · *Highest leverage edit on the site*
Current hero shouts "THE BEST WEB DESIGN STUDIO IN MENA REGION" — a claim everyone makes. Your *real* differentiator (already in `src/constants/index.ts:23-25`) is **"We're marketers first — designers second."**

**Proposed:**
- H1: "Marketers first. / Designers second."
- Sub: keep `heroSectionParagraph` (already strong)
- CTA: "Book a strategy call →"

**Files:** `src/pages/home/HeroSection.tsx`, possibly `src/constants/index.ts`

---

### B2. Project tiles → click-through to case study, not external site  `[ ]`
`ProjectsSectionDesktop.tsx` and `ProjectsSectionMobile.tsx` link the entire card to `project.href` (the live external site). You lose the visitor before you've made your case.

**Proposed (interim, before A1 is built):**
- Card click stays on Stellar (placeholder modal with description + metrics)
- Add a small "Visit site" button that opens external `href` in a new tab
- Add a "Results" badge on each card if `project.metrics` is set

**Files:** `src/components/ProjectsSectionDesktop.tsx`, `src/components/ProjectsSectionMobile.tsx`, `src/constants/index.ts` (extend Project interface)

---

### B3. Testimonials: written quote + name + role overlay  `[ ]`
`TestimonialsSection.tsx` is video-only. Most visitors won't unmute. Layer a name + role + short pull-quote on each video so it's scannable.

**Proposed:**
- Extend `TestimonialVideo` interface with `name`, `role`, `company`, `quote`
- Render an overlay (bottom-left) over the video with this metadata
- Auto-show first quote, swap on navigation

**Files:** `src/components/TestimonialsSection.tsx`, `src/components/TestimonialsSection.css`, `src/constants/index.ts`

---

### B4. CTAs distributed throughout the page  `[ ]`
Right now the only conversion path is the Calendar drawer that auto-opens on scroll. Add explicit "Book a call" buttons in strategic spots:
- Hero (primary)
- After projects ("Like what you see? Let's build yours")
- After testimonials ("Want results like these?")
- Footer (when B8 lands)

Pair each with a secondary "View work" link.

**Files:** `src/pages/home/HeroSection.tsx`, `src/components/ProjectsSection*.tsx`, `src/components/TestimonialsSection.tsx`

---

### B5. Mobile projects: replace heavy Three.js with swipe carousel  `[ ]`  · *Big perceived-perf win on mid-range Android*
`ProjectsSectionMobile.tsx` runs 24,000 particles (1,600 × 15 cards) on phones. Even gated by IntersectionObserver (done in PR-4) it's heavy on first paint when the section comes into view.

**Proposed:**
- Keep desktop's 3D perspective scene
- On mobile, render a clean swipe/snap carousel with the same project tiles, no Three.js
- Removes ~100 KB of three.js scene code from mobile critical path

**Files:** `src/components/ProjectsSectionMobile.tsx` (substantial rewrite)

---

### B6. Preloader: real progress, skip on revisit  `[ ]`
`src/global/Preloader.tsx` plays a fixed-duration timeline regardless of asset load state. Two issues:
- On fast connections users wait through theater they didn't need
- On slow connections, preloader may finish before the 3D model loads

**Proposed:**
- Tie progress to actual asset loading using `useProgress` from `@react-three/drei` + the existing `model3DReady` event
- Cache `localStorage.hasSeenIntro` and play a shorter version on revisit

**Files:** `src/global/Preloader.tsx`, `src/utils/revealAnimation.ts`

---

### B7. Accessibility: focus styles + skip link + ARIA  `[ ]`
You force `cursor: none` on desktop (PR-1 scoped to ≥1024px). But there's no `:focus-visible` ring anywhere — keyboard users see *nothing* when they Tab through. There's also no skip-to-main link.

**Proposed:**
- Add a global `:focus-visible` ring in `index.css`
- Skip-to-content link in `App.tsx`
- ARIA labels on the custom cursor, 3D canvases, decorative SVGs
- Test full keyboard nav

**Files:** `src/index.css`, `src/App.tsx`, `src/global/CustomCursor.tsx`

---

### B8. Real footer  `[ ]`
No footer component in the repo today. Even minimal: services links, location, social, contact email, secondary "Book a call" CTA.

**Files:** new `src/global/Footer.tsx`, mount in `src/App.tsx` or per page

---

### B9. Defer 3rd-party tracking scripts  `[ ]`
`index.html` loads Google Tag, Microsoft Clarity, Meta Pixel inline in `<head>` (lines 9-97). Even with `async`, the inline initializers run synchronously and add ~100-200 KB to TTI.

**Proposed:**
- Move all three to a single `loadTrackers()` function
- Trigger on first user interaction: `scroll`, `mousemove`, `touchstart` (whichever fires first), with `{ once: true, passive: true }`
- Tracking data is unaffected for any user who actually engages with the page

**Files:** `index.html`

---

### B10. Hero copy: "weather" line is funny but breaks on revisit  `[ ]`  · *Low priority*
The "weather: our websites are so hot that your device is overheating right now!" line is creative, but the temperature animates 0 → 74 °C on every page load. On revisit the joke gets stale. Maybe randomize the temperature endpoint, or add a different metric (page load count, "visitors today", etc.) on subsequent visits.

**Files:** `src/utils/revealAnimation.ts:325-356`

---

## C. CREATIVE — Awwwards-tier additions  `[in progress]`

### ✅ Shipped — HomeSticky chrome (live)

Round of theme-aligned micro-interactions on the persistent sticky frame:

- [x] **Globe (bottom-left, bordered box)** — slow rotation (80s/turn) + a tall white **radar-sweep arc** rotates around it every 3.4s. `inset: -16px` so the arc extends well past the box. Files: `src/index.css` (`.globe-img`, `.globe-radar::after`), `src/pages/home/HomeSticky.tsx` (added `globe-radar` + `globe-img` classes).
- [x] **Marquee (auto-rotate text box, bottom-left)** — text fill is now a **flowing holographic gold/white gradient** via `background-clip: text` + animated `background-position`. Cycles every 4.5s with a soft gold drop-shadow halo. Files: `src/index.css` (`.marquee-shine .scroll-text-animation > div`, `@keyframes marquee-hologram`), `src/pages/home/HomeSticky.tsx` (added `marquee-shine` class).
- [x] **ScrollProgress (bottom-right)** —
  - Filled leaves have a faint gold drop-shadow
  - The **active edge leaf** plays a one-shot pulse animation (`0.7s ease-out`) when it becomes the edge — scales up + bright flash, then settles
  - The 3 filled leaves behind the edge form a **comet trail** with decreasing glow
  - Percentage number rendered in gold, tabular-nums (no width jump as digits change)
  - *Tried & reverted*: number scramble — visually misleading, random 0-98 read as the real percentage.
  - Files: `src/components/ScrollProgress.tsx`, `src/index.css` (`.leaf-filled`, `.leaf-edge`, `.leaf-trail-1/2/3`, `.scroll-percent-display`).

### ✅ Shipped — Global (live)

- [x] **CustomCursor variants** — `data-cursor="link|cta|image|video"` on any element switches cursor visual. `mix-blend-mode: difference` auto-inverts against the background. Ref-based RAF position writes — zero React re-renders on mousemove. Files: `src/global/CustomCursor.tsx`, `src/index.css`.
- [x] **CinematicVignette** — persistent radial dark vignette + grain flash on section transitions via IntersectionObserver. Files: `src/global/CinematicVignette.tsx`, `src/index.css`.
- [x] **StarryBackground velocity coupling** — scroll velocity ref boosts particle rotation. File: `src/components/StarryBackground.tsx`.
- [x] **Brutalist frame refactor** — replaced 4-piece border + 4 SVG corners with single `.brutalist-frame::before` using `border-radius` + `outline` + `box-shadow: 0 0 0 100vmax bg`. Logo tab welded with sharp top + rounded bottom. Files: `src/pages/home/HomeSticky.tsx`, `src/index.css`.

### Tried & rejected (don't re-suggest)

- ~~Frame comet trail orbiting the perimeter~~ — logo tab interrupts the path
- ~~RGB-split / chromatic aberration glitch on the frame~~ — disliked
- ~~Liquid-metal shimmer sweep on the frame outline~~ — mask trick brittle, nothing visible
- ~~Subtle frame breathing (scale pulse)~~ — too aggressive a move
- ~~Scroll-velocity gold tint on noise overlays + border glow on the noise boxes~~ — user disliked once visible
- ~~Interactive cosmic dust particles inside the frame (cursor-attracted constellations)~~ — disliked
- ~~Cockpit HUD corner readouts (Cairo coords + T+ MM:SS)~~ — too text-heavy
- ~~ScrollProgress number scramble on change~~ — randomized 0-98 read as the real %

### Next up

**HeroSection** (`src/pages/home/HeroSection.tsx`) — see below for proposed moves.

---

## C. CREATIVE — Awwwards-tier additions  `[future]`

Original capture list. Items still open for later:

- [ ] **C1. Magnetic CTAs** — buttons tilt toward cursor within ~80px. ~20 lines of GSAP.
- [ ] **C2. Cursor reacts to context** — grow + "View site" text over project tiles, dot over text, play-icon over videos, drag-icon over hero star.
- [ ] **C3. Interactive hero star** — drag to rotate freely; each facet reveals a value prop; scroll transforms it into other shapes.
- [ ] **C4. Color/tone evolution as you scroll** — subtle CSS-variable shifts mapped to each section. Cool → warm → cool rhythm.
- [ ] **C5. Scroll-driven case study reveals** — horizontal-pin scroll with iPhone mockup gliding through 4-5 screens, metrics ticking up beside.
- [ ] **C6. "Live counter" social proof toast** — "3 brands exploring right now", "47 calls booked this month."
- [ ] **C7. Before/after sliders** for redesign case studies.
- [ ] **C8. Easter eggs** — Konami code unlocks "secret weapon" process page; long-press hero star plays an audio whisper; etc.
- [ ] **C9. Awards strip** if you have any (CSSDA, Behance features, Awwwards mentions) as a top marquee.
- [ ] **C10. Toggleable UI sound** — brand sonic signature on hover/click, OFF by default.
- [ ] **C11. Cinematic testimonial framing** — film-grain overlay, subtle color grade, "now playing" indicator. Already 80% there with the projector image.

---

## D. STRATEGIC — bigger plays beyond UI  `[future]`

These shape positioning and growth, not pixels. Captured for the founder, not for me to build.

- [ ] **D1. Niche positioning** — "Marketing-first web design for MENA D2C brands" instead of generic "best studio."
- [ ] **D2. Verticalize case studies** — group projects by industry (Beauty, Fashion, Lab Diagnostics, etc.).
- [ ] **D3. Content engine** — `/insights/<slug>` doing teardowns of other MENA D2C sites. SEO + lead gen.
- [ ] **D4. Newsletter** — "The MENA Conversion Letter", every 2 weeks.
- [ ] **D5. Free tools** — Egypt VAT calculator for Shopify, Arabic typography checker, etc.
- [ ] **D6. Webinars / AMAs** — quarterly live "How to 2x your Shopify conversions."
- [ ] **D7. Founder content** — Abdelrahman writes / speaks. Founder-led content out-converts company content.

---

## ⚡ Quick wins ("ship this week")  `[future, when B is done]`

Roughly ordered by impact ÷ effort. Several of these are B items; this section is the "if you only had 3-4 days" list.

1. **B1. Hero rewrite** — half a day. Highest leverage edit on the entire site.
2. **A2 + project metrics** — display numbers on cards immediately even before full case study pages exist.
3. **B9. Defer analytics scripts** — 30 minutes. Cuts ~100 KB from TTI.
4. **C1. Magnetic CTA** on "Book a call" — half a day. Demonstrates the level of detail you sell.
5. **C2. Cursor reactivity** on project tiles — half a day.
6. **B7. Accessibility audit pass** — 1 hour for focus rings + skip link.
7. **B8. Real footer** — half a day.
8. **A2. Numbers strip** — 1 hour for the trust block.

≈ 3–4 working days of work for a meaningful perceived-quality jump.

---

## 🛠️ Tech foundations to lay  `[future]`

Doing these now makes A items above cheaper later.

- [ ] **F1. Headless CMS for case studies** (Sanity or Contentful) — so case studies are editable without code.
- [ ] **F2. `react-i18next` setup** — Arabic-ready scaffolding even if AR launches later.
- [ ] **F3. JSON-LD structured data** in `index.html` — Organization schema with founder, location, services, ratings. Free SEO win.
- [ ] **F4. `/sitemap.xml` + `/robots.txt`** in `public/`.
- [ ] **F5. Event tracking schema** — `src/lib/analytics.ts` with ~10 named events. Tracker-agnostic.
- [ ] **F6. Per-route OG images** — case studies should have unique OG cards.
- [ ] **F7. Lighthouse CI in GitHub Actions** — fail builds that regress performance/accessibility now that PR-3 gave us a clean baseline.

---

## Reference: what's already done (PRs 1–4)

For context. Don't re-do these.

- ✅ Videos moved from bundle to Cloudinary CDN (-64 MB from `dist/`)
- ✅ `.htaccess` for SPA routing + asset caching + gzip on Hostinger
- ✅ 10 dead files deleted (~3,300 lines)
- ✅ 9 verified bugs fixed (favicon, OG image, Wistia dup, ScrollTrigger frame-fire, NotFound styling, Lenis cleanup, scoped queries, etc.)
- ✅ Mobile cursor restored, duplicate CSS removed, debug `console.log` gone
- ✅ Route-level code splitting (React.lazy + Suspense)
- ✅ Vendor chunks split: react / three / gsap / framer-motion / lenis
- ✅ Project thumbnails lazy-loaded
- ✅ CustomCursor refactored to ref-based (no per-frame setState)
- ✅ Calendar validation constants hoisted to module scope
- ✅ ProjectsSectionMobile RAF gated by IntersectionObserver + Page Visibility
- ✅ Google Fonts moved to HTML preconnect+link (no more render-blocking @import)
