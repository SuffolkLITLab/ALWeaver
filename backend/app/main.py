from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
  BlockSummary,
  ParseRequest,
  ParseResponse,
  ValidateRequest,
  ValidateResponse,
  ValidationIssue,
)
from .services.yaml_parser import analyze_blocks, validate_document


app = FastAPI(
  title='Docassemble Interview Builder API',
  version='0.1.0',
  summary='Support services for the Docassemble visual editor experience.',
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],
  allow_methods=['*'],
  allow_headers=['*'],
)


@app.get('/health')
async def healthcheck() -> dict[str, str]:
  return {'status': 'ok'}


@app.post('/parse', response_model=ParseResponse)
async def parse_yaml(request: ParseRequest) -> ParseResponse:
  try:
    analyses = analyze_blocks(request.yaml)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc

  blocks = [
    BlockSummary(
      id=analysis.id,
      type=analysis.type,
      label=analysis.label,
      language=analysis.language,  # type: ignore[arg-type]
      position=analysis.position,
      order_items=analysis.order_items or None,
    )
    for analysis in analyses
  ]

  return ParseResponse(blocks=blocks)


@app.post('/validate', response_model=ValidateResponse)
async def validate_yaml(request: ValidateRequest) -> ValidateResponse:
  messages = validate_document(request.yaml)
  issues = [ValidationIssue(block_id=None, level='error', message=message) for message in messages]
  return ValidateResponse(issues=issues, valid=len(issues) == 0)


def run() -> None:  # pragma: no cover - convenience entrypoint
  import uvicorn

  uvicorn.run('app.main:app', host='0.0.0.0', port=8000, reload=True)
