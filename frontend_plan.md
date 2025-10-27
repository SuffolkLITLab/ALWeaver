# Docassemble Interview Builder — Frontend Frontend Specification

**Target frameworks:** Next.js 14 (App Router) **or** Vite + React 18

**Summary:** A modern, Gutenberg‑style block editor for Docassemble YAML interviews. Each YAML block is represented as a card with a live preview and a Monaco‑powered code view toggle. The editor emphasizes readability (light theme, generous whitespace, clear separators), fast navigation (outline + filtering), and a faithful preview of **question** blocks (question, subquestion, fields with types). The right sidebar can dynamically expose editing for **special blocks** such as metadata, mandatory, or attachment blocks.

---

## 1) Product Goals

* **Inline block authoring:** Create, preview, and edit Docassemble blocks without leaving the canvas.
* **Safe by default:** Never break valid YAML, Mako, or Docassemble conventions in rendered previews.
* **Fast navigation:** Filter by block type or id; jump via outline; spotlight quick search.
* **Question fidelity:** The most realistic visual approximation of a Docassemble screen: question, subquestion, field list, left labels + right variable names.
* **Ergonomic editing:** Toggle code/preview per block; Monaco for YAML/Python/Markdown; rich‑text for Markdown that preserves Mako.
* **Contextual side editing:** Right sidebar adapts to selected block type for quick access to metadata, attachments, and mandatory settings.
* **Confidence:** Debounced validation with inline issue badges; full YAML preview pane; optimistic updates.

**Non‑goals**

* Full Docassemble runtime; we only preview structure and Markdown, not execute Python or interview logic.
* Complex flow branching simulation; we show static previews of blocks.

---

## 2) Architecture Overview

### 2.1 High‑level diagram (conceptual)

```
UI (React) ──► Editor State (Zustand/Redux) ──► API Client
   ▲                 │                               │
   │                 └────────► parser/validator ◄───┘
   │                                   ▲
   └────────── Live YAML builder ◄─────┘
```

* **State Store:** Zustand (lightweight) or Redux Toolkit. Holds blocks array, selection, filters, validation issues.
* **API Client:** Fetch to backend endpoints:

  * `GET /health`
  * `POST /parse` `{ yaml: string } → { blocks: BlockSummary[] }`
  * `POST /validate` `{ yaml: string } → { valid: boolean, issues: ValidationIssue[] }`
* **YAML Builder:** Deterministically serializes current editor state back to YAML (mirrors server’s parse/validate).
* **Editor Surface:** Virtualized list of BlockCards; each card has Preview mode and Monaco Code mode.

### 2.2 Suggested Dependencies

* **UI:** React 18, Next.js 14 *or* Vite, Radix UI Primitives, Framer Motion, React Aria/Headless UI, React‑Virtual.
* **Editor:** Monaco Editor, TipTap/Lexical for rich text, `marked`/`micromark` for read‑only Markdown.
* **YAML:** `yaml` (eemeli/yaml) for client‑side serialization.
* **State:** Zustand + immer.
* **Forms:** React Hook Form + Zod.
* **Icons:** Lucide React.
* **Styling:** Tailwind CSS (light theme) with design tokens.

---

## 3) Data Model (Frontend)

Same as before, but additional flags:

```ts
export interface BlockSummary {
  ...
  isMandatory?: boolean;
  isAttachment?: boolean;
  isMetadata?: boolean;
}
```

These booleans enable contextual right‑sidebar editing panels.

---

## 4) UI & Interaction Design

### 4.1 Layout

* **Header bar:** File name, health/validation status chip, global actions.
* **Left Sidebar:** Outline + filters.
* **Canvas:** Virtualized vertical stack of **BlockCards**.
* **Right Sidebar:** Adaptive panel showing context‑sensitive editors.

  * **Default view:** YAML preview & validation issues.
  * **Metadata block selected:** key/value editor for metadata fields.
  * **Mandatory block:** checklist of mandatory elements; quick toggles.
  * **Attachment block:** file list with add/remove buttons.
  * **Any other block:** compact properties editor (id, label, type badge).

### 4.2 Sidebar Interaction

* Opens automatically when selecting a special block type.
* Editable fields update YAML via two‑way binding.
* Collapsible sections: **Properties**, **Validation**, **Quick actions**.
* Optional pinned mode (sidebar stays open when changing blocks of same category).

### 4.3 Visual Design

* Maintains light theme with subtle shadow separation.
* Sidebar width ~320px; resizable.
* Animated slide‑in/out using Framer Motion.

---

## 5) Question Block Preview & Editor (Most Important)

(unchanged from prior version)

---

## 6) API Integration

Includes same endpoints; sidebar interactions trigger YAML update and optional validation debounce.

---

## 7) Component Hierarchy (updated)

```
AppShell
├─ Header
├─ Sidebar (Outline)
├─ EditorCanvas
│  ├─ BlockCard
│  │  ├─ BlockHeader
│  │  ├─ BlockPreview | BlockCode
│  │  └─ AddBlockInline
└─ RightSidebar
    ├─ MetadataEditor
    ├─ MandatoryEditor
    ├─ AttachmentEditor
    └─ ValidationSummary
```

---

## 8) Acceptance Criteria (added sidebar)

* Selecting a metadata, mandatory, or attachment block automatically opens the right sidebar.
* Sidebar displays corresponding editor.
* Edits reflect live in YAML.
* Sidebar collapses smoothly when deselected.
* Validation and export features continue to function.

---

**End of specification.**
