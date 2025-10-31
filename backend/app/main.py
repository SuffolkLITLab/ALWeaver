from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
  BlockSummary,
  ParseRequest,
  ParseResponse,
  SaveRequest,
  SaveResponse,
  ValidateRequest,
  ValidateResponse,
  ValidationIssue,
  VariablesResponse,
)
from .services.storage import SAVE_ROOT, save_yaml_document
from .services.yaml_parser import analyze_blocks, validate_document, extract_variables


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
      isMandatory=analysis.is_mandatory,
    )
    for analysis in analyses
  ]

  return ParseResponse(blocks=blocks)


@app.post('/validate', response_model=ValidateResponse)
async def validate_yaml(request: ValidateRequest) -> ValidateResponse:
  messages = validate_document(request.yaml)
  issues = [ValidationIssue(block_id=None, level='error', message=message) for message in messages]
  return ValidateResponse(issues=issues, valid=len(issues) == 0)


@app.post('/variables', response_model=VariablesResponse)
async def get_variables(request: ParseRequest) -> VariablesResponse:
  variables = extract_variables(request.yaml)
  return VariablesResponse(variables=variables)


@app.post('/save', response_model=SaveResponse)
async def save_yaml(request: SaveRequest) -> SaveResponse:
  try:
    result = save_yaml_document(request.yaml, request.document_name)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc

  try:
    saved_path = str(result.file_path.relative_to(SAVE_ROOT))
  except ValueError:
    saved_path = str(result.file_path)

  return SaveResponse(
    document_name=result.document_name,
    saved_path=saved_path,
    bytes_written=result.bytes_written,
  )


def run() -> None:  # pragma: no cover - convenience entrypoint
  import uvicorn

  uvicorn.run('app.main:app', host='0.0.0.0', port=8000, reload=True)
