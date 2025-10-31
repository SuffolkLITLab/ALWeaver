from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
  block_id: str | None = Field(default=None, description="Identifier of the affected block, if known")
  level: Literal['info', 'warning', 'error'] = 'warning'
  message: str


class BlockSummary(BaseModel):
  id: str
  type: str
  label: str | None = None
  language: Literal['yaml', 'python', 'markdown'] = 'yaml'
  position: int
  order_items: list[str] | None = None
  isMandatory: bool | None = None


class ParseRequest(BaseModel):
  yaml: str = Field(..., description="Raw Docassemble YAML interview content")


class ParseResponse(BaseModel):
  blocks: list[BlockSummary]


class ValidateRequest(BaseModel):
  yaml: str


class ValidateResponse(BaseModel):
  issues: list[ValidationIssue]
  valid: bool


class SaveRequest(BaseModel):
  yaml: str
  document_name: str | None = Field(default=None, description="Preferred file name for the YAML document")


class SaveResponse(BaseModel):
  document_name: str
  saved_path: str
  bytes_written: int


class VariableInfo(BaseModel):
  name: str
  type: str


class VariablesResponse(BaseModel):
  variables: list[VariableInfo]
