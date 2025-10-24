# Docassemble Visual Interview Builder

This workspace follows the implementation plan in `plan.md` to deliver a browser-based visual + code editor for Docassemble YAML interviews.

## Features (Phase 1)

- React + Vite frontend with Tailwind styling and Shadcn-inspired layout
- Dual-mode editing: visual forms for metadata, questions, and interview order & Monaco-powered code editing for all blocks
- Interview flow visualization via React Flow with automatic node/edge generation from YAML content
- Auto-sync Docassemble YAML serialization with download support
- Background schema checks by a FastAPI service using `ruamel.yaml`

## Project Structure

- `frontend/` — Vite React app with Zustand state, editor components, and validation hook
- `backend/` — FastAPI service exposing `/parse` and `/validate` endpoints for YAML analysis
- `plan.md` — master implementation plan to be followed for subsequent phases

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Environment variables:

- `VITE_API_URL` (optional) – points to the FastAPI backend (`http://localhost:8000` by default)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

Endpoints:

- `GET /health` — service heartbeat
- `POST /parse` — returns block summaries from Docassemble YAML
- `POST /validate` — runs structural validation

## Next Phases

Future work (see `plan.md` for details):

1. Visual forms for additional block types (attachments, events, objects)
2. Live Docassemble sandbox preview integration
3. Collaboration features (Yjs) and AI-assisted block suggestions
4. Enhanced validation with schema cross-checking and unreachable flow detection

## Testing & Build

- Frontend: `npm run build`
- Backend: planned FastAPI unit tests (`pytest`) to be added in Phase 2

## Notes

- Tailwind uses the new `@tailwindcss/postcss` adapter; ensure Node 18+.
- YAML parsing preserves block order; comments preservation is in scope for a follow-up backend enhancement.
