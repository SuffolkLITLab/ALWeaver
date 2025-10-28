from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable
import importlib
import tempfile
import os

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError

yaml = YAML(typ='rt')
yaml.preserve_quotes = True
yaml.width = 4096


BLOCK_TYPES = (
    'question',
    'code',
    'objects',
    'features',
    'auto terms',
    'template',
    'attachment',
    'attachments',
    'table',
    'translations',
    'include',
    'default screen parts',
    'metadata',
    'modules',
    'imports',
    'sections',
    'interview help',
    'def',
    'default validation messages',
    'machine learning storage',
    'initial',
    'event',
    'comment',
    'variable name',
    'data',
    'data from code',
    'reset',
    'on change',
    'image sets',
    'images',
    'order',
)

LANGUAGE_MAP = {
    'metadata': 'yaml',
    'objects': 'yaml',
    'question': 'yaml',
    'code': 'python',
    'event': 'yaml',
    'features': 'yaml',
    'auto terms': 'yaml',
    'template': 'yaml',
    'attachment': 'yaml',
    'attachments': 'yaml',
    'table': 'yaml',
    'translations': 'yaml',
    'include': 'yaml',
    'default screen parts': 'yaml',
    'metadata': 'yaml',
    'modules': 'yaml',
    'imports': 'yaml',
    'sections': 'yaml',
    'interview help': 'yaml',
    'def': 'markdown',
    'default validation messages': 'yaml',
    'machine learning storage': 'yaml',
    'initial': 'yaml',
    'event': 'yaml',
    'comment': 'yaml',
    'data': 'yaml',
    'data from code': 'yaml',
    'reset': 'yaml',
    'on change': 'yaml',
    'image sets': 'yaml',
    'images': 'yaml',
    'order': 'yaml',
}


@dataclass(slots=True)
class BlockAnalysis:
    id: str
    type: str
    label: str | None
    language: str
    position: int
    order_items: list[str]
    is_mandatory: bool


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        return normalized in {'true', 'yes', '1', 'on'}
    if isinstance(value, (int, float)):
        return bool(value)
    return False


def _split_blocks(document: str) -> list[str]:
    cleaned = document.strip()
    if not cleaned:
        return []
    parts = []
    buffer: list[str] = []

    for line in cleaned.splitlines():
        if line.strip() == '---':
            part = '\n'.join(buffer).strip()
            if part:
                parts.append(part)
            buffer = []
            continue
        buffer.append(line)

    tail = '\n'.join(buffer).strip()
    if tail:
        parts.append(tail)

    return parts


def _guess_block_type(data: dict) -> str:
    for candidate in BLOCK_TYPES:
        if candidate in data:
            return candidate
    if 'question' in data:
        return 'question'
    return 'code'


def _label_for_block(block_type: str, data: dict) -> str | None:
    if isinstance(data.get('interview_order'), dict):
        return 'Interview Order'
    if block_type == 'metadata':
        meta = data.get('metadata') or {}
        return f"{meta.get('title')}" if meta.get('title') else 'Metadata'
    if block_type == 'question':
        question = data.get('question')
        return f"{question.splitlines()[0]}" if isinstance(question, str) else 'Question'
    if block_type == 'code':
        code = data.get('code')
        return f"{code.splitlines()[0][:24]}" if isinstance(code, str) and code else 'Code'
    if block_type == 'attachment':
        payload = data.get('attachment') or {}
        return f"{payload.get('name')}" if payload.get('name') else 'Attachment'
    if block_type == 'event':
        return f"{data.get('event')}" if data.get('event') else 'Event'
    if block_type == 'objects':
        return 'Objects'
    return block_type


def _order_items_from_code(code: str | None) -> list[str]:
    if not code:
        return []
    return [line.strip() for line in code.splitlines() if line.strip() and not line.strip().startswith('#')]


def analyze_blocks(document: str) -> list[BlockAnalysis]:
    analyses: list[BlockAnalysis] = []
    for position, chunk in enumerate(_split_blocks(document)):
        try:
            data = yaml.load(chunk) or {}
        except YAMLError as exc:  # pragma: no cover - validation handles this path
            raise ValueError(f'Failed to parse YAML segment at index {position}: {exc}') from exc

        block_type = _guess_block_type(data)
        label = _label_for_block(block_type, data)
        order_items: list[str] = []

        interview_order_payload = data.get('interview_order')
        if isinstance(interview_order_payload, dict):
            code_value = interview_order_payload.get('code')
            code = code_value if isinstance(code_value, str) else None
            order_items = _order_items_from_code(code)
            mandatory_flag = _coerce_bool(interview_order_payload.get('mandatory'))
        else:
            mandatory_flag = _coerce_bool(data.get('mandatory'))

        analyses.append(
            BlockAnalysis(
                id=f'{block_type}-{position}',
                type=block_type,
                label=label,
                language=LANGUAGE_MAP.get(block_type, 'yaml'),
                position=position,
                order_items=order_items,
                is_mandatory=mandatory_flag,
            ),
        )

    return analyses


def validate_document(document: str) -> list[str]:
    issues: list[str] = []

    # Prefer using the third-party DAYamlChecker if available. It validates
    # docassemble YAML structure and returns structured errors. We call its
    # `find_errors` function by writing the document to a temporary file
    # (the module expects a filename).
    dayaml_mod = None
    try:
        dayaml_mod = importlib.import_module("dayamlchecker.yaml_structure")
    except Exception:
        dayaml_mod = None

    if dayaml_mod is not None:
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as tf:
                tf.write(document)
                tf.flush()
                tmp_path = tf.name

            try:
                errors = dayaml_mod.find_errors(tmp_path) or []
                for e in errors:
                    # The YAMLError class in the package implements __str__
                    issues.append(str(e))
            except Exception as exc:  # pragma: no cover - defensive
                issues.append(f"dayamlchecker validation failed: {exc}")
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    try:
        blocks = analyze_blocks(document)
    except ValueError as exc:
        issues.append(str(exc))
        return issues

    seen_mandatory = False

    for block in blocks:
        if block.type not in BLOCK_TYPES:
            issues.append(f'Unsupported block type "{block.type}" at position {block.position}.')

    for chunk in _split_blocks(document):
        try:
            data = yaml.load(chunk) or {}
        except YAMLError as exc:  # pragma: no cover
            issues.append(f'Invalid YAML block: {exc}')
            continue

        if 'interview_order' in data:
            metadata = data['interview_order'] or {}
            mandatory = metadata.get('mandatory')
            mandatory_flag = _coerce_bool(mandatory)
            if mandatory_flag and seen_mandatory:
                issues.append('Only one mandatory interview_order block is allowed.')
            seen_mandatory = seen_mandatory or mandatory_flag

    return issues


def iter_blocks(document: str) -> Iterable[dict]:
    for chunk in _split_blocks(document):
        try:
            yield yaml.load(chunk) or {}
        except YAMLError:  # pragma: no cover - validated separately
            continue
