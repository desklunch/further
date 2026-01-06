# Design Guidelines: Domains & Tasks Productivity App

## Design Approach
**System**: Linear + Notion hybrid approach
**Rationale**: Utility-focused productivity tool requiring efficiency, scanability, and data density. Drawing from Linear's refined typography and Notion's flexible layouts.

---

## Typography System

**Font Stack**: Inter (via Google Fonts CDN)
- **Page Title**: 2xl, semibold (Domain headers, screen titles)
- **Section Headers**: lg, medium (Empty states, modal titles)
- **Task Title**: base, medium (Primary task text)
- **Metadata/Labels**: sm, regular (Chips, counts, secondary info)
- **Micro Text**: xs, regular (Timestamps, hints)

**Line Height**: 1.5 for body text, 1.2 for headings

---

## Layout System

**Spacing Scale**: Tailwind units of **2, 3, 4, 6, 8, 12**
- Component padding: p-4 to p-6
- Stack spacing: space-y-2 for tight lists, space-y-4 for sections
- Card/row padding: px-4 py-3
- Section gaps: gap-6 to gap-8

**Container Strategy**:
- Main content: max-w-6xl mx-auto px-6
- Modal/drawer: max-w-2xl
- Forms: max-w-md

**Grid System**:
- Domain columns: Single column list (no multi-column for tasks)
- Metadata chips: Inline-flex with gap-2
- Action buttons: Flex justify-between

---

## Core Components

### Task Row
- Full-width clickable row with subtle border-bottom
- Left: Checkbox (20px) + Title (flex-1) + Metadata chips (inline)
- Right: Action icons (edit, archive) - visible on hover/focus
- Height: py-3, maintains consistent rhythm
- Hover state: Subtle background shift

### Domain Header
- Sticky positioning during scroll
- Left: Domain name (semibold) + task count badge
- Right: Add task button (icon only, ghost style)
- Bottom border for visual separation
- Padding: px-6 py-4

### Metadata Chips
- Rounded-full, px-2.5 py-0.5
- Display only when present (priority, effort, dates)
- Icons from Heroicons (CDN): calendar, lightning, chart-bar
- Text size: xs

### Filter & Sort Bar
- Horizontal layout, sticky below header
- Left: Filter pills (Open/Completed/Archived) - pill group style
- Right: Sort dropdown
- Height: h-12, px-6
- Border-bottom for separation

### Task Creation
- Inline form per domain (revealed on "Add Task" click)
- Input: Full-width text field + expandable metadata section
- Actions: Save (primary) + Cancel (ghost)
- Form padding: p-4, subtle border

### Empty States
- Centered content, py-12
- Icon (48px) + heading + description + CTA
- Max-width: max-w-sm mx-auto

### Modals/Drawers
- Slide-in drawer from right for task editing (w-96 to w-[32rem])
- Modal overlay: backdrop blur
- Close icon: top-right
- Form layout: Vertical stack with space-y-4

---

## Component Library Details

**Buttons**:
- Primary: Solid background, medium weight text
- Secondary: Border with transparent background
- Ghost: No border, hover background only
- Icon-only: 32px square touch target
- Height: h-9 for standard, h-8 for compact

**Forms**:
- Input fields: h-10, px-3, border, rounded-md
- Labels: text-sm, mb-1.5
- Field groups: space-y-4
- Inline labels for checkboxes/toggles

**Badges/Pills**:
- Task count: Rounded-full, text-xs, px-2 py-0.5
- Status indicators: 6px circle dot + text label

**Dividers**:
- Between domains: 1px border with my-6
- Within sections: Hairline borders (border-t)

---

## Interaction Patterns

**Drag & Drop** (Manual reorder mode):
- Visual grab handle (6 dots icon) appears on hover
- Dragging item: Elevated with shadow
- Drop zone: 2px border indicator
- Constraint: Only in Open + Manual sort mode

**State Changes**:
- Task completion: Checkbox animates, row fades slightly
- Archive: Item slides out with fade
- Status transitions: Instant UI update (optimistic)

**Progressive Disclosure**:
- Metadata collapsed by default on mobile
- Expand icon to reveal priority/effort/dates
- Desktop: Always visible inline

---

## Layout Structure

**Main Screen**:
```
[App Header: Logo + User Menu]
[Filter/Sort Bar - Sticky]
[Content Area]
  - Domain Header (Sticky)
  - Task List (vertical stack)
  - Inline Add Form
  - Domain Header (Sticky)
  - Task List...
[No footer needed]
```

**Mobile Considerations**:
- Stack metadata chips vertically on narrow screens
- Single-column always
- Swipe gestures for complete/archive (optional enhancement)
- Bottom sheet for task editing instead of side drawer

---

## Visual Density

**Information Hierarchy**:
- High density for power users: 15-20 tasks visible per viewport
- Row height: 44-52px for adequate touch targets
- Metadata chips: Minimal padding to conserve space
- Domain headers: Slightly more padding for visual breaks

**Whitespace Strategy**:
- Tight within components (task rows)
- Generous between sections (domains)
- Breathing room in modals/forms

---

## Icons

**Library**: Heroicons (CDN)
- 20px for inline task metadata
- 16px for action buttons
- 24px for empty states
- Outlined style for inactive, solid for active states

**Common Icons**:
- Check circle (complete), Calendar (dates), Lightning (priority), Chart-bar (effort), Cog (complexity), Archive, Pencil (edit), Plus (add)

---

## Accessibility

- Keyboard navigation: Tab through all interactive elements
- Focus indicators: 2px outline offset
- ARIA labels on icon-only buttons
- Screen reader announcements for state changes
- Minimum touch target: 44x44px
- Color-independent status indicators (icons + text)

---

**No animations** except for state transitions (fade-in/out on archive, checkbox check). Keep interface snappy and responsive.