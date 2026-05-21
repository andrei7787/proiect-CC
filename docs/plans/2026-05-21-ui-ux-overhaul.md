# UI/UX Overhaul Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the AI Study Planner from a functional-but-bare UI into a polished, modern, responsive web application with smooth animations, proper feedback, and excellent UX.

**Architecture:** Enhance the existing React + CSS codebase. No new dependencies — pure CSS and React patterns. New components: Toast, Skeleton, Modal, DropZone. No component library.

**Tech Stack:** React 19, TypeScript, Vite, CSS custom properties

---

## Phase 1: Foundation — CSS System & Layout Fixes

### Task 1.1: Fix content centering

**Objective:** Center `.content` area properly on wide viewports. Add responsive improvements.

**Files:**
- Modify: `apps/web/src/styles.css`

**Step 1: Center content**
- Add `margin: 0 auto` to `.content`
- Keep `max-width: 1060px`
- Set `width: 100%` to ensure it fills properly on small screens

**Step 2: Improve responsive breakpoints**
- Add intermediate breakpoint at 1024px for 3-col stats
- Add breakpoint at 640px for 2-col stats and mobile nav improvements
- Ensure sidebar collapses gracefully

### Task 1.2: Add micro-interaction system

**Objective:** Button press feedback, card hover lift, smooth transitions.

**Files:**
- Modify: `apps/web/src/styles.css`

**Changes:**
- Button active state: `transform: scale(0.97)` on press
- Card hover: `translateY(-2px)` with enhanced shadow
- Add `transition: all 200ms` consistency
- Focus ring polish (use `outline` with offset for keyboard users)
- Smooth page section entry (stagger children)

### Task 1.3: Typography & spacing scale

**Objective:** Consistent spacing and visual hierarchy.

**Files:**
- Modify: `apps/web/src/styles.css`

**Changes:**
- Add spacing scale CSS variables
- Improve heading hierarchy
- Better content density on the course page

---

## Phase 2: Toast Notification System

### Task 2.1: Create Toast component

**Objective:** Replace all inline `[role="alert"]` error messages with a toast notification system.

**Files:**
- Create: `apps/web/src/components/Toast.tsx`
- Create: `apps/web/src/components/Toast.css`
- Modify: `apps/web/src/App.tsx` (add ToastProvider)
- Modify: `apps/web/src/pages/Dashboard.tsx` (use toasts)
- Modify: `apps/web/src/pages/CourseDetail.tsx` (use toasts)
- Modify: `apps/web/src/pages/CourseCreate.tsx` (use toasts)
- Modify: `apps/web/src/pages/Login.tsx` (use toasts for errors)

**Features:**
- Auto-dismiss after 4s for success, 6s for errors
- Slide-in from top-right animation
- Types: success (green), error (red), info (accent)
- Stack multiple toasts
- Dismiss button on each toast

**Architecture:** React context + provider pattern. `useToast()` hook returns `{ toast }` function. No external deps.

---

## Phase 3: Loading Skeletons

### Task 3.1: Create Skeleton component

**Objective:** Replace spinner with content-shaped loading skeletons.

**Files:**
- Create: `apps/web/src/components/Skeleton.tsx`
- Create: `apps/web/src/components/Skeleton.css`
- Modify: `apps/web/src/pages/Dashboard.tsx` (skeleton loading state)

**Features:**
- Shimmer animation (gradient sweep)
- `Skeleton.Text` — lines of text
- `Skeleton.Card` — card-shaped placeholder
- `Skeleton.StatCard` — stat card placeholder
- Use existing CSS variables for colors

---

## Phase 4: Page Transitions

### Task 4.1: Add view transition animations

**Objective:** Smooth transitions when switching between Dashboard / Course / CourseCreate.

**Files:**
- Modify: `apps/web/src/App.tsx` (wrap views with transition)
- Modify: `apps/web/src/styles.css` (transition CSS)

**Approach:**
- CSS-based: use a wrapper component with key-based animation
- Fade out old view (150ms), slide in new view (300ms)
- Use CSS `@keyframes` for performance
- Apply `will-change: transform, opacity` for GPU acceleration

---

## Phase 5: Drag & Drop Upload

### Task 5.1: Create DropZone component

**Objective:** Modern drag-and-drop file upload replacing native file input.

**Files:**
- Create: `apps/web/src/components/DropZone.tsx`
- Modify: `apps/web/src/pages/CourseDetail.tsx` (integrate DropZone)
- Modify: `apps/web/src/styles.css` (or DropZone.css)

**Features:**
- Visual drop target with dashed border and highlight on drag-over
- Accepts .pdf, .txt, .md files
- Shows file name after selection
- Keeps the native file input as fallback (hidden, triggered by click on dropzone)
- Animated drop indicator

---

## Phase 6: Empty State Illustrations

### Task 6.1: Create SVG empty state illustrations

**Objective:** Replace emoji-based empty states with custom SVG illustrations.

**Files:**
- Create: `apps/web/src/components/EmptyState.tsx`
- Modify: `apps/web/src/pages/Dashboard.tsx` (use EmptyState)
- Modify: `apps/web/src/pages/CourseDetail.tsx` (use EmptyState)
- Modify: `apps/web/src/styles.css` (empty state polish)

**Illustrations needed:**
- 📚 → Books/graduation cap SVG (no courses)
- 🎯 → Target SVG (no tasks)
- 📅 → Calendar SVG (no deadlines)
- 🤖 → AI/brain SVG (no summaries)
- 🔔 → Bell SVG (no notifications)

**Approach:** Inline SVGs with currentColor for theme compatibility.

---

## Phase 7: Confirmation Dialogs

### Task 7.1: Create Modal component

**Objective:** Confirmation dialogs for destructive or irreversible actions.

**Files:**
- Create: `apps/web/src/components/Modal.tsx`
- Modify: `apps/web/src/App.tsx` (logout confirmation)
- Modify: `apps/web/src/pages/CourseDetail.tsx` (delete material confirmation)

**Features:**
- Backdrop with blur
- Slide-up animation
- Focus trap (Tab stays in modal)
- Escape to close
- Click backdrop to close
- Accessible (role="dialog", aria-modal, aria-labelledby)

---

## Phase 8: Polish & QA

### Task 8.1: Run full test suite and fix regressions

**Objective:** Ensure all 62 existing tests pass with the new UI.

**Files:**
- Run: `npm test`
- Fix: any broken test selectors or assertions

### Task 8.2: Manual review checklist

- [ ] Login flow looks polished
- [ ] Dashboard cards centered on wide screens
- [ ] Toasts appear and auto-dismiss
- [ ] Page transitions are smooth
- [ ] Drag & drop works for PDF/TXT/MD
- [ ] Skeletons show during loading
- [ ] Empty states use SVG illustrations
- [ ] Confirmation dialogs work and are accessible
- [ ] Mobile responsive layout works
- [ ] All buttons have press feedback
- [ ] Focus rings visible for keyboard nav
