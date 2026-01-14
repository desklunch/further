# PRD v0.2 — Today, Habits, Inbox & Scheduling

## Purpose

This document defines **PRD v0.2** for a personal productivity web application.
It builds directly on **v0.1 (Domains & Tasks Core)** and introduces a **thin daily execution layer**.

This PRD is written to be used as a **direct prompt for an AI software development agent**.
Assume the agent has **no prior context** beyond this document and PRD v0.1.

---

## 1. Objective

Enable the user to decide and execute what matters **today**, without introducing:
- itineraries
- timeboxing
- end-of-day ceremony
- analytics or streaks

v0.2 should make:
- habits usable without recreating structure
- scheduling meaningful
- inbox triage effective
- Today the default execution surface

---

## 2. Design Principles

1. **Today is a lens, not a container**
2. **No ceremony**
3. **Out of mind = scheduled**
4. **Habits are not tasks**
5. **Execution and grooming are separate**

---

## 3. Scope

### In Scope
- Today View (default landing)
- Inbox / triage
- Habits (daily choice sets)
- Scheduling semantics
- Task assignment to Today (thin)
- Valence + effort model updates
- Tasks View updates

### Out of Scope
- Itineraries / sections
- Durations / timeboxing
- Close Day
- Analytics / streaks
- Recurring tasks (beyond habits)
- Subtasks / continuation
- Projects / areas

---

## 4. Core Concepts

### 4.1 Today
Today is a temporary execution surface showing:
- Habits
- Tasks scheduled for today
- Inbox items
- Tasks explicitly added to today

### 4.2 InboxItem
Untriaged inputs that appear only in Today.
Triage outcomes:
- Add to Today
- Schedule for future
- Leave untriaged

### 4.3 Habits
Daily menu-based actions with:
- single-select or multi-select semantics
- implicit completion via selection

### 4.4 Task–Day Assignment
A minimal mapping enabling Add to Today without ownership transfer.

---

## 5. Data Model Changes (High-Level)

### New Entities
- InboxItem
- HabitDefinition
- HabitOption
- HabitDailyEntry
- TaskDayAssignment

### Task Updates
- Replace `complexity` with `valence` (-1, 0, 1)
- Make `effort` nullable
- `scheduled_date` controls visibility

---

## 6. View Definitions

### 6.1 Today View
Order:
1. Habits
2. Scheduled Today
3. Inbox
4. Added to Today

### 6.2 Tasks View
Filters:
- Open (unscheduled only)
- Scheduled
- Completed
- Archived

---

## 7. Behavioral Rules

1. Scheduled-future tasks never appear in Today
2. Scheduling removes items from Today immediately
3. Tasks scheduled for today appear automatically
4. Add to Today does not modify scheduled_date
5. Completing a task removes it from Today
6. Habits appear every day
7. Today is the landing page

---

## 8. Success Criteria

- Today becomes default entry point
- Habits no longer recreated daily
- Inbox volume decreases via decisions
- Scheduling feels meaningful
- Tasks remain system of record

---


# Implementation Checklist & Migration Plan

## Phase 0 — Preconditions
- v0.1 stable
- Domains & Tasks working
- Landing route switchable

## Phase 1 — Schema Changes
- Add InboxItem
- Add HabitDefinition, HabitOption, HabitDailyEntry
- Add TaskDayAssignment
- Migrate complexity → valence
- Make effort nullable

## Phase 2 — Migration
- Preserve existing task data
- No retroactive habit data

## Phase 3 — Inbox / Triage
- Inbox only visible in Today
- Triage actions: Add to Today, Schedule, Leave
- Scheduling removes from Today

## Phase 4 — Habits
- Render daily habits
- Single- and multi-select support
- No streaks

## Phase 5 — Today View
- Render habits, scheduled today, inbox, added to today
- Completing task removes from Today

## Phase 6 — Tasks View
- Scheduled filter
- Valence icons
- Effort unknown state

## Phase 7 — Safeguards
- No duplicate TaskDayAssignment
- Idempotent Today queries

---


# Edge-Case UX & Behavioral Flows

## Skipping Habits
- No penalty
- No data written
- Habit reappears next day

## Habit Selection
- Single-select replaces prior
- Multi-select allows multiple

## Double Scheduling
- New date replaces old
- Optional confirmation

## Schedule vs Add to Today
- Schedule sets date
- Add to Today creates assignment only

## Undo (Lightweight)
- Undo for archive
- Undo for schedule
- Undo for inbox triage

## Midnight Boundary
- Today recalculates automatically
- No Close Day

## Integrity Rules
- One HabitDailyEntry per habit/day
- One TaskDayAssignment per task/day
- Inbox items cannot be triaged and visible simultaneously

---

