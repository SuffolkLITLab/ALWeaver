from __future__ import annotations

import itertools
import re
from dataclasses import dataclass
from pathlib import Path


SAVE_ROOT = Path(__file__).resolve().parent.parent / 'data' / 'saved_interviews'
SAVE_ROOT.mkdir(parents=True, exist_ok=True)

_UNSAFE_PATTERN = re.compile(r'[^A-Za-z0-9._-]+')


@dataclass(slots=True)
class SaveResult:
  document_name: str
  file_path: Path
  bytes_written: int


def _sanitize_filename(document_name: str | None) -> str:
  """
  Normalize potentially user-provided names to a safe filename.
  """
  candidate = (document_name or '').strip() or 'untitled.yml'
  candidate = Path(candidate).name  # Strip directory segments if provided.
  candidate = _UNSAFE_PATTERN.sub('_', candidate)

  lower = candidate.lower()
  if not (lower.endswith('.yml') or lower.endswith('.yaml')):
    candidate = f'{candidate or "untitled"}.yml'

  return candidate


def _unique_path(filename: str) -> Path:
  path = SAVE_ROOT / filename
  if not path.exists():
    return path

  stem = path.stem
  suffix = path.suffix or '.yml'

  for index in itertools.count(1):
    candidate = path.with_name(f'{stem}-{index}{suffix}')
    if not candidate.exists():
      return candidate

  raise RuntimeError('Unable to derive a unique filename for saving document.')  # pragma: no cover


def save_yaml_document(yaml_content: str, document_name: str | None = None) -> SaveResult:
  """
  Persist the provided YAML payload to disk and return metadata about the saved file.
  """
  if yaml_content is None:
    raise ValueError('YAML content is required.')

  filename = _sanitize_filename(document_name)
  path = _unique_path(filename)

  encoded = yaml_content.encode('utf-8')
  path.write_bytes(encoded)

  relative_document_name = path.name
  return SaveResult(document_name=relative_document_name, file_path=path, bytes_written=len(encoded))
