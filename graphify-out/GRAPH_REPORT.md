# Graph Report - .  (2026-06-05)

## Corpus Check
- 83 files · ~84,640 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 318 nodes · 384 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: 51,028 input · 5,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Optimization Patterns|Optimization Patterns]]
- [[_COMMUNITY_Scroll Animations & 3D|Scroll Animations & 3D]]
- [[_COMMUNITY_Build & Lint Tooling|Build & Lint Tooling]]
- [[_COMMUNITY_3D Buttons & Hero Models|3D Buttons & Hero Models]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Calendar Booking System|Calendar Booking System]]
- [[_COMMUNITY_TS App Compiler Options|TS App Compiler Options]]
- [[_COMMUNITY_Page Routes & Globals|Page Routes & Globals]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Hero Section & Text Splitting|Hero Section & Text Splitting]]
- [[_COMMUNITY_Legacy Calendar|Legacy Calendar]]
- [[_COMMUNITY_Animated Text System|Animated Text System]]
- [[_COMMUNITY_Projects Showcase|Projects Showcase]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Particle 3D System|Particle 3D System]]
- [[_COMMUNITY_Starry Background|Starry Background]]
- [[_COMMUNITY_Booking API Spec|Booking API Spec]]
- [[_COMMUNITY_HDR Environment|HDR Environment]]
- [[_COMMUNITY_Global Starry Background|Global Starry Background]]
- [[_COMMUNITY_Root TS Config|Root TS Config]]

## God Nodes (most connected - your core abstractions)
1. `Stellar Project` - 27 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 18 edges
4. `Vite` - 8 edges
5. `scripts` - 7 edges
6. `Preloader Component` - 7 edges
7. `Direct Imports Pattern` - 6 edges
8. `Project` - 5 edges
9. `React` - 5 edges
10. `autoRotateTexts` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Preloader Animation Sequence` --semantically_similar_to--> `GSAP`  [INFERRED] [semantically similar]
  src/components/Preloader.md → package.json
- `Preloader Component` --depends_on--> `React`  [INFERRED]
  src/components/Preloader.md → package.json
- `React Compiler` --references--> `React`  [EXTRACTED]
  README.md → package.json
- `Bundler Deduplication` --references--> `Vite`  [EXTRACTED]
  OPTIMIZATION_RECOMMENDATIONS.md → package.json
- `Tree Shaking` --references--> `Vite`  [EXTRACTED]
  OPTIMIZATION_RECOMMENDATIONS.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **React + Vite + TypeScript Stack** — package_react, package_vite, package_typescript, package_vitejs_plugin_react, tsconfig_app [EXTRACTED 0.95]
- **3D Rendering Stack** — package_three, package_react_three_fiber, package_react_three_drei [EXTRACTED 0.95]
- **Calendar Booking Flow** — note_available_days_endpoint, note_checked_appointments_endpoint, note_appointment_duration_slots, note_africa_cairo_timezone [EXTRACTED 0.95]

## Communities (23 total, 5 thin omitted)

### Community 0 - "Optimization Patterns"
Cohesion: 0.07
Nodes (43): Barrel Exports Pattern, Bundler Deduplication, Constants Barrel Export, Direct Imports Pattern, Tree Shaking, Autoprefixer, ESLint, Framer Motion (+35 more)

### Community 1 - "Scroll Animations & 3D"
Cohesion: 0.08
Nodes (13): AnimatedTextRotationProps, ScrollProgressProps, Model3DProps, ScrollTrigger3DSectionProps, INITIAL_INDEX, autoRotateTexts, homeHeaderParagraphs, Project (+5 more)

### Community 2 - "Build & Lint Tooling"
Cohesion: 0.07
Nodes (28): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+20 more)

### Community 3 - "3D Buttons & Hero Models"
Cohesion: 0.11
Nodes (14): Model, Button3dWrapperProps, HDREnvironment(), HDREnvironmentProps, Hero3DModelProps, StarModel(), TIMINGS, FlakesTexture (+6 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.09
Nodes (23): include, Bundler module resolution mode, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+15 more)

### Community 5 - "Calendar Booking System"
Cohesion: 0.11
Nodes (20): AvailableDaysData, buildPrefetchDayTasks(), Calendar(), CalendarAction, CalendarProps, calendarReducer(), CalendarState, DayAvailabilityResponse (+12 more)

### Community 6 - "TS App Compiler Options"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 7 - "Page Routes & Globals"
Cohesion: 0.14
Nodes (5): LocationState, useLenis(), ExtendedRoute, routes, App()

### Community 8 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, gh-pages, gsap, lenis, react, react-dom, react-icons (+7 more)

### Community 9 - "Hero Section & Text Splitting"
Cohesion: 0.22
Nodes (8): formatDate(), getOrdinalSuffix(), animateTextRandomization(), getTextFromElements(), splitIntoChars(), splitIntoLines(), splitIntoWords(), TextRandomizationConfig

### Community 10 - "Legacy Calendar"
Cohesion: 0.18
Nodes (10): AvailableDaysData, CalendarAction, calendarReducer(), CalendarState, DayAvailabilityResponse, formatDateToRFC3339(), initialState, SelectedDate (+2 more)

### Community 11 - "Animated Text System"
Cohesion: 0.20
Nodes (5): AnimatedText(), AnimatedTextProps, TextAnimationType, useScrollTrigger(), UseScrollTriggerOptions

### Community 12 - "Projects Showcase"
Cohesion: 0.25
Nodes (4): Project, ProjectsSectionProps, ProjectsSectionDesktopProps, ProjectsSectionMobileProps

### Community 13 - "Theme System"
Cohesion: 0.27
Nodes (5): ThemeContext, ThemeProviderProps, PathsType, ThemeContextType, ThemeType

### Community 16 - "Booking API Spec"
Cohesion: 0.60
Nodes (5): Africa/Cairo Timezone Convention, Appointment Duration Slot Generation, Available Days Endpoint, Calendar Booking Backend API Spec, Checked Appointments Endpoint

## Knowledge Gaps
- **137 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compilerOptions` connect `TS App Compiler Options` to `TypeScript Config`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Bundler module resolution mode` connect `TypeScript Config` to `Optimization Patterns`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Optimization Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.06866002214839424 - nodes in this community are weakly interconnected._
- **Should `Scroll Animations & 3D` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Should `Build & Lint Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `3D Buttons & Hero Models` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._