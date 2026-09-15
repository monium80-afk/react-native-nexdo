---
name: Warm Focus
colors:
  surface: '#fef9f0'
  surface-dim: '#ded9d1'
  surface-bright: '#fef9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ea'
  surface-container: '#f2ede4'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e7e2d9'
  on-surface: '#1d1c16'
  on-surface-variant: '#59413a'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f5f0e7'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3504'
  primary: '#a83301'
  on-primary: '#ffffff'
  primary-container: '#ca4a1c'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59d'
  secondary: '#625d5b'
  on-secondary: '#ffffff'
  secondary-container: '#e9e1dd'
  on-secondary-container: '#686361'
  tertiary: '#226843'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e825a'
  on-tertiary-container: '#f6fff5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390b00'
  on-primary-fixed-variant: '#842500'
  secondary-fixed: '#e9e1dd'
  secondary-fixed-dim: '#ccc5c2'
  on-secondary-fixed: '#1e1b19'
  on-secondary-fixed-variant: '#4a4643'
  tertiary-fixed: '#abf2c2'
  tertiary-fixed-dim: '#90d6a8'
  on-tertiary-fixed: '#002110'
  on-tertiary-fixed-variant: '#01522f'
  background: '#fef9f0'
  on-background: '#1d1c16'
  surface-variant: '#e7e2d9'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: DM Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  gutter: 1rem
  margin-screen: 1.25rem
---

## Brand & Style

This design system delivers an approachable, anti-anxiety AI productivity interface. Rather than relying on sterile, hyper-clinical monochrome palettes or futuristic neon aesthetics, the interface embraces tactile warmth, organic calm, and grounding clarity. Designed for professionals, students, and neurodivergent operators navigating busy task pipelines, the system minimizes cognitive friction through calm, editorial composure and humanized cues.

The visual style blends modern warm minimalism with tactile, rounded containers and pill elements. Broad, soft surfaces frame key workflows, while deep charcoal typography provides high legibility against cream-tinted canvas backdrops. Vibrant terracotta orange serves as a high-intent catalyst for action, driving session starts, active states, and AI-driven recommendations.

## Colors

The color palette centers on tactile warmth and intentional contrast:

- **Primary (`#E05A2B`)**: Vibrant burnt terracotta. Reserved for primary calls to action, high-priority status indicators, active focus chips, and key interactive triggers.
- **Secondary (`#1D1A18`)**: Deep obsidian charcoal. Serves as the high-contrast foundational ink for titles, top headers, dark mode sheets, and grounded badge backgrounds.
- **Tertiary (`#5A9E74`)**: Muted sage green. Applied to completed states, check indicators, balance affirmations, and low-friction categorical tags.
- **Neutral Canvas (`#F4EFE6`)**: Natural unbleached cream. Replaces cold digital whites to establish a calm, paper-like background that prevents eye fatigue.
- **Neutral Container Surfaces (`#EAE3D5` and `#FFFFFF`)**: Used for layered cards, inset lists, and nested pill fields. Inset containers use tinted warm ivory, while elevated interaction surfaces introduce pure white to lift priorities.
- **Supportive Accents**: Soft peach (`#FCEEE8`) for active task highlights and subtle borders; muted ochre (`#D97736`) for pending or upcoming alerts.

## Typography

Typography balances geometric structure with humanistic warmth:

- **DM Sans** delivers structured, modern headline forms with friendly terminal curves that prevent cold rigidity.
- **Plus Jakarta Sans** provides open counters and clean geometry for body text and metadata chips, maintaining legibility at compact mobile scales (11px–14px).
- **Caps Hierarchy**: Section titles and technical category meta (e.g., `SESSION PLAN`, `HOW MUCH TIME HAVE YOU GOT?`) utilize `label-md` with `0.04em` letter-spacing, uppercase transformation, and bold weights to anchor content zones without heavy dividers.

## Layout & Spacing

The layout is built for fluid touch ergonomics on handheld mobile devices:

- **Screen Rhythm**: A standard 16px to 20px screen margin contains cards and primary containers. Vertical flows use stacked 12px to 16px card spacing, creating clear module separation without visual clutter.
- **Internal Component Spacing**: Parent containers enforce 16px to 20px internal padding. Secondary nested rows (such as checklist subtasks or metadata tags) use 8px to 12px gaps.
- **Touch Targets**: All actionable chips, selector pills, and list chevrons conform to an absolute minimum bounding area of 44×44px, using expanded tap margins where visual chips are compact.

## Elevation & Depth

Visual hierarchy uses tonal surface nesting and soft, ambient physical separation rather than harsh drop shadows:

- **Surface Base**: `#F4EFE6` establishes the low-glare canvas level.
- **Card Containers**: Layered on the base using `#FAF7F2` or `#EFE8DC`, defined by subtle 1px border outlines in `#E4DCCE`.
- **Active / Elevated Cards**: Raised slightly using a warm ambient drop shadow: `0 4px 16px -2px rgba(80, 50, 30, 0.06), 0 1px 3px 0 rgba(80, 50, 30, 0.04)`.
- **Floating Controls & Modals**: Bottom action drawers and primary floating action buttons utilize a deeper warm shadow: `0 12px 32px -4px rgba(29, 26, 24, 0.16)`.
- **Inset Recesses**: Input bars, nested subtask pools, and inactive selector groups use flat fills tinted slightly darker than the parent surface (`#EAE3D5`) with no shadow.

## Shapes

The design system uses soft, rounded container geometry paired with fully pill-shaped micro elements:

- **Level 2 Foundation**: Outer structural cards and dialog windows employ 16px to 20px (`rounded-xl` to `rounded-2xl`) corner radii.
- **Pills & Selectors**: Buttons, filter chips, time presets, status badges, and search inputs adopt 9999px fully rounded caps (`rounded-full`).
- **Checkboxes**: Subtask selectors use 6px rounded squares, softening the traditional mechanical square to match the system's approachable aesthetic.

## Components

### Buttons
- **Primary**: Terracotta background (`#E05A2B`), crisp white text, full pill curvature (`rounded-full`), height 52px for mobile screen anchors. Active states scale down to `0.98` with subtle warmth intensification (`#CB4D20`).
- **Secondary / Charcoal**: Obsidian background (`#1D1A18`), white text, used for focused AI actions (e.g., "Break down session").
- **Ghost / Tertiary**: Transparent with soft warm borders (`#E0D7C9`) and charcoal text; interactive hover or press applies `#EAE3D5`.

### Selector Chips & Time Pills
- Unselected state: Warm neutral fill (`#EAE3D5` or `#FAF7F2`), subtle 1px border (`#DED4C4`), deep charcoal text (`#1D1A18`).
- Selected state: Primary terracotta fill (`#E05A2B`) with white text, or deep charcoal (`#1D1A18`) for mode switches.

### Task & Session Cards
- Encapsulated within 16px rounded surfaces with light perimeter borders.
- Structured into three tiers: Header row (priority numbering, task title, allotted time badge), middle metadata tier (category tag pills and completion counters), and optional nested subtask containers (`#EAE3D5` background).

### Subtask Items & Checkboxes
- Completed items: Desaturated text with strikethrough, paired with a terracotta or sage check badge (`rounded-full` or `rounded-md`).
- Active items: Obsidian text, rounded checkbox with 1.5px border (`#C8BEAF`).

### Input Fields & Prompt Bars
- Floating or docked pill bar (`rounded-full`) filled with `#FAF7F2` and framed by a delicate border (`#E0D7C9`). Includes rounded icon action triggers for voice, camera, and submission.