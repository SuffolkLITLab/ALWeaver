from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError

yaml = YAML(typ='rt')
yaml.preserve_quotes = True
yaml.width = 4096


BLOCK_TYPES = (
    'metadata',
    'objects',
    'code',
    'attachment',
    'question',
    'interview_order',
    'event',
)

LANGUAGE_MAP = {
    'metadata': 'yaml',
    'objects': 'yaml',
    'question': 'yaml',
    'attachment': 'markdown',
    'code': 'python',
    'interview_order': 'python',
    'event': 'yaml',
}


@dataclass(slots=True)
class BlockAnalysis:
    id: str
    type: str
    label: str | None
    language: str
    position: int
    order_items: list[str]


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
    if block_type == 'metadata':
        meta = data.get('metadata') or {}
        return f"Metadata • {meta.get('title')}" if meta.get('title') else 'Metadata'
    if block_type == 'question':
        question = data.get('question')
        return f"Question • {question.splitlines()[0]}" if isinstance(question, str) else 'Question'
    if block_type == 'code':
        code = data.get('code')
        return f"Code • {code.splitlines()[0][:24]}" if isinstance(code, str) and code else 'Code'
    if block_type == 'interview_order':
        return 'Interview Order'
    if block_type == 'attachment':
        payload = data.get('attachment') or {}
        return f"Attachment • {payload.get('name')}" if payload.get('name') else 'Attachment'
    if block_type == 'event':
        return f"Event • {data.get('event')}" if data.get('event') else 'Event'
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

        if block_type == 'interview_order':
            details = data.get('interview_order') or {}
            code = details.get('code') if isinstance(details, dict) else None
            order_items = _order_items_from_code(code if isinstance(code, str) else None)

        analyses.append(
            BlockAnalysis(
                id=f'{block_type}-{position}',
                type=block_type,
                label=label,
                language=LANGUAGE_MAP.get(block_type, 'yaml'),
                position=position,
                order_items=order_items,
            ),
        )

    return analyses


def validate_document(document: str) -> list[str]:
    issues: list[str] = []

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
            if mandatory and seen_mandatory:
                issues.append('Only one mandatory interview_order block is allowed.')
            seen_mandatory = seen_mandatory or bool(mandatory)

    return issues


def iter_blocks(document: str) -> Iterable[dict]:
    for chunk in _split_blocks(document):
        try:
            yield yaml.load(chunk) or {}
        except YAMLError:  # pragma: no cover - validated separately
            continue
