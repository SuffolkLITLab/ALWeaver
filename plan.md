# 🧭 Docassemble Visual Interview Builder — Implementation Plan

## Overview

**Goal:**  
Create a **browser-based visual + code editor** for building and previewing Docassemble interviews (YAML-based).  
Users can switch between visual editing and raw YAML, edit different block types (question, code, attachment, etc.), preview flows, and sync changes to a Docassemble backend.

**Core Features:**
- Visual block-based editing interface  
- Code mode with Monaco Editor  
- Flow visualization (logic map + interview order)  
- Schema-aware YAML validation  
- Live interview preview (Docassemble sandbox integration)  
- Versioning and AI-assisted suggestions (optional)

---

## 🧱 1. Architecture

### Frontend
- **Framework:** React + Vite (or Next.js for SSR)
- **State:** Zustand or Redux Toolkit
- **Editor Core:** Monaco Editor (`@monaco-editor/react`)
- **UI:** Shadcn/UI (Radix primitives + Tailwind)
- **Flow Visualization:** `react-flow`
- **Form Builder:** `react-hook-form` + `react-jsonschema-form`
- **Communication:** WebSocket + REST (to Docassemble backend)
- **Validation:** `ajv` + `monaco-yaml`

### Backend
- **Framework:** FastAPI (Python)
- **Purpose:**  
  - Serve YAML schema & validation endpoints  
  - Manage file storage / export / import  
  - Connect to a Docassemble instance for live preview
- **Data Storage:** SQLite (lightweight local persistence) or Postgres
- **Optional AI Layer:** OpenAI or local LLM wrapper for assistive tasks

---

## ⚙️ 2. Data Model

### Block Representation (Frontend)
```ts
type Block = {
  id: string;
  type: 
    | "metadata"
    | "objects"
    | "code"
    | "attachment"
    | "question"
    | "interview_order"
    | "event";
  content: string;
  language: "yaml" | "python" | "markdown";
  schema?: string;
  position?: number;
  orderItems?: OrderItem[]; // for interview_order blocks
};
OrderItem Structure
ts
Copy code
type OrderItem = {
  variable: string;          // e.g. users[0].name.first
  description?: string;
  condition?: string;        // e.g. if has_co_petitioner
  children?: OrderItem[];    // nested branches
};
🧩 3. Supported Docassemble Block Types
metadata
Defines interview-wide settings: title, language, author, description, login behavior, exit links, etc.
Reference: docassemble.org/docs/initial.html

Visual UI:

Form-based editor for all known metadata keys (title, tags, show login, etc.)

Validation for correct types (e.g., booleans, strings, lists).

Multi-language support for localized text values.

Collapse/expand advanced settings (footer, exit links, etc.)

Code Mode:

YAML block directly editable.

objects
Defines class instances used in the interview.

Example:

yaml
Copy code
objects:
  - user: Individual
  - trial_case: Case
Visual UI:

Editable table: variable → class

Dropdown for known classes

Add/remove rows dynamically

code
Contains Python logic executed in the interview.

Visual UI:

Full Monaco editor (Python mode)

Syntax highlighting, linting, and basic error checking

Optionally, collapsible helper for common code patterns (e.g., defining variables)

attachment
Defines output documents (PDF, DOCX, Markdown, etc.).
Reference: docassemble.org/docs/documents.html

Key fields:
name, filename, valid formats, content or content file, optional formatting metadata.

Visual UI:

Tabbed editor: Metadata | Content | Formatting

Markdown editor for inline content

File picker for content file

Validation for required fields and supported formats

Preview rendered output (optional)

question
Defines user-facing prompts and data collection screens.

Visual UI:

Form builder UI for:

question / subquestion

fields (label, variable, datatype, hint)

continue button field

Support for conditional display (if/show if)

Support for multi-language text

Live preview of screen rendering

“Add field” button for dynamic field creation

event
Defines triggers or navigation events (e.g., event: review, event: restart).

Visual UI:

Simple property form with event name, triggers, and destinations

Option to visually connect to other blocks in flow diagram

interview_order
Specifies the order of variables (screens) asked during the interview.
Reference: Assembly Line Docs — Controlling Interview Order

Behavior:

Typically a code: block with mandatory: True

Lists goal variables in the desired sequence

Can include conditional branches (if, elif, else)

Visual UI:

Drag-and-drop ordered list of variable names

Nested structure for conditional branches

Buttons for “Add Variable” and “Add Condition”

Inline dropdown for existing variable names (autocompletion)

Code tab for viewing/editing Python code

Real-time sync between visual and code modes

Validation:

Only one mandatory interview_order block per file

Warn on unreachable or duplicate variables

Ensure variables exist in other blocks

Flow View:

Graph-based visualization of sequence and branches using react-flow

Clickable nodes to navigate to defining blocks

Optional “simulate flow” mode for debugging

🔄 4. YAML Parsing & Sync
Conversion Layer
Use Ruamel.yaml (Python backend) or yaml (frontend) to parse and reconstruct YAML, preserving comments and order.

Maintain one-to-one mapping between YAML nodes and internal Block models.

Serialize changes back to YAML when saving or exporting.

🧭 5. Flow Visualization
Graph Extraction
Build directed graph based on:

next: and if: logic in question blocks

Interview order structure

Use react-flow for visualization

Display nodes for blocks, edges for flow connections

Click-to-navigate behavior

🧪 6. Live Preview Integration
Backend Responsibilities
Proxy YAML to local Docassemble instance

Provide /run_interview and /validate endpoints

Frontend
“Run Interview” button serializes YAML → sends to backend

Embed live Docassemble session in an iframe

Show logs and errors inline

🧰 7. Collaboration & Versioning
Feature	Implementation
Version history	isomorphic-git (client) or Git integration on backend
Multi-user editing	yjs + y-websocket
Auto-save	LocalStorage or IndexedDB
Import/export	JSZip for packaging YAML + assets

🧠 8. Optional AI Layer
Capability	Example
“Explain this code block”	LLM-generated summary
“Suggest next question”	Contextual AI proposal
“Auto-fix validation errors”	LLM + schema cross-check
Integration	/ai_suggest FastAPI endpoint

🧩 9. Development Milestones
Phase	Deliverables
Phase 1: Core YAML Editor	Monaco, basic block parsing, load/save
Phase 2: Visual Forms	Metadata, Question, Attachment blocks
Phase 3: Flow & Interview Order	Flow graph, drag-order UI
Phase 4: Preview Integration	Docassemble sandbox connection
Phase 5: Versioning & AI	Git history, LLM features, schema validation

🧱 10. Key Libraries Summary
Category	Library
Core Editor	@monaco-editor/react, monaco-yaml, monaco-python
Forms	react-hook-form, react-jsonschema-form
Flow	react-flow, elkjs
UI	shadcn/ui, tailwindcss, radix-ui
Backend	FastAPI, ruamel.yaml, PyYAML, uvicorn
Validation	ajv, jsonschema
Versioning	isomorphic-git
Collaboration	yjs, y-websocket
AI	OpenAI API (optional)

🧩 11. Deployment
Component	Description
Frontend	Vite build → served via CDN or Electron
Backend	FastAPI container → connects to Docassemble API
Docassemble	Separate container or remote instance
Optional Desktop Mode	Electron wrapper for local editing + preview