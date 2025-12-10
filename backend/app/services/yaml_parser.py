from __future__ import annotations

import ast
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

DATATYPE_MAP = {
    'text': 'str',
    'area': 'str',
    'password': 'str',
    'email': 'str',
    'date': 'date',
    'datetime': 'datetime',
    'time': 'time',
    'integer': 'int',
    'number': 'float',
    'currency': 'float',
    'boolean': 'bool',
    'yesno': 'bool',
    'noyes': 'bool',
    'range': 'float',
    'object': 'dict',
    'choices': 'list',
    'dropdown': 'Any',
    'multiselect': 'list',
    'combobox': 'list',
    'file': 'str',
    'files': 'list',
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


def _label_for_block(block_type: str, data: dict, raw_chunk: str = '') -> str | None:
    if isinstance(data.get('interview_order'), dict):
        return 'Interview Order'
    
    # Check for interview order patterns in code blocks
    if block_type == 'code':
        block_id = data.get('id', '')
        code_content = data.get('code', '')
        
        # Normalize block_id for comparison
        id_normalized = str(block_id).lower().strip() if block_id else ''
        
        # Check id patterns - exact match or contains "interview_order" or "main_order"
        if (id_normalized == 'interview order' or 
            id_normalized == 'interview_order' or 
            'interview_order' in id_normalized or 
            id_normalized == 'main_order' or
            'main_order' in id_normalized):
            return 'Interview Order'
        
        # Check for special YAML comment pattern in the raw chunk
        import re
        if re.search(r'#+\s*interview\s+order\s*#+', raw_chunk, re.IGNORECASE):
            return 'Interview Order'
        
        # Check for special comment pattern in code (legacy)
        if isinstance(code_content, str):
            if re.search(r'#+\s*interview\s+order\s*#+', code_content, re.IGNORECASE):
                return 'Interview Order'
    
    if block_type == 'metadata':
        meta = data.get('metadata') or {}
        return f"{meta.get('title')}" if meta.get('title') else None
    if block_type == 'question':
        question = data.get('question')
        return f"{question.splitlines()[0]}" if isinstance(question, str) else None
    if block_type == 'code':
        code = data.get('code')
        return f"{code.splitlines()[0][:24]}" if isinstance(code, str) and code else None
    if block_type == 'attachment':
        payload = data.get('attachment') or {}
        return f"{payload.get('name')}" if payload.get('name') else None
    if block_type == 'event':
        return f"{data.get('event')}" if data.get('event') else None
    if block_type == 'objects':
        return None
    return None


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
        label = _label_for_block(block_type, data, chunk)  # Pass raw chunk for comment detection
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


def _get_type_from_ast_node(node: ast.expr) -> str:
    if isinstance(node, ast.Constant):
        return type(node.value).__name__
    if isinstance(node, ast.Num):
        return type(node.n).__name__
    if isinstance(node, ast.Str):
        return 'str'
    if isinstance(node, ast.NameConstant):
        return type(node.value).__name__
    if isinstance(node, (ast.List, ast.ListComp)):
        return 'list'
    if isinstance(node, (ast.Dict, ast.DictComp)):
        return 'dict'
    if isinstance(node, ast.Tuple):
        return 'tuple'
    if isinstance(node, ast.Set):
        return 'set'
    return 'Any'


def _extract_variables_from_code(code: str) -> dict[str, str]:
    """
    Parses a Python code snippet and extracts the names of variables being assigned
    and their inferred Python types.
    """
    variables = {}
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                var_type = _get_type_from_ast_node(node.value)
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        variables[target.id] = var_type
    except (SyntaxError, TypeError):
        pass
    return variables


def extract_variables(document: str) -> list[dict[str, str]]:
    """
    Parses a YAML document and extracts a list of all defined variables
    with their inferred Python types.
    """
    variables: dict[str, str] = {}
    all_blocks = list(iter_blocks(document))

    # Pass 1: from code blocks (lower priority)
    for block in all_blocks:
        if 'code' in block and isinstance(block['code'], str):
            code_variables = _extract_variables_from_code(block['code'])
            for name, type_ in code_variables.items():
                variables[name] = type_

    # Pass 2: from fields (higher priority)
    for block in all_blocks:
        if 'fields' in block and isinstance(block['fields'], list):
            for field in block['fields']:
                if isinstance(field, dict) and field:
                    first_key = next(iter(field))
                    variable_name = field[first_key]
                    if isinstance(variable_name, str):
                        datatype = field.get('datatype', 'text')
                        py_type = DATATYPE_MAP.get(datatype, 'Any')
                        variables[variable_name] = py_type

    result = [{'name': name, 'type': type_} for name, type_ in variables.items()]
    return sorted(result, key=lambda v: v['name'])


def extract_first_fields(document: str) -> list[dict[str, Any]]:
    """
    Extracts the first field from each question block for use in interview order suggestions.
    Also detects if the field uses list iterators like [i], [j], etc. and suggests .gather() instead.
    Returns a list of dicts with 'field', 'question_id', 'is_list', 'list_name'.
    """
    first_fields = []
    all_blocks = list(iter_blocks(document))
    
    import re
    
    for block in all_blocks:
        # Only process question blocks with fields
        if 'fields' not in block or not isinstance(block['fields'], list) or len(block['fields']) == 0:
            continue
        
        question_id = block.get('id', '')
        first_field_data = block['fields'][0]
        
        if not isinstance(first_field_data, dict) or not first_field_data:
            continue
        
        # Get the first key which should be the field label or variable
        first_key = next(iter(first_field_data))
        variable_name = first_field_data[first_key]
        
        if not isinstance(variable_name, str):
            continue
        
        # Check for list iterators like [i], [j], [k], etc.
        iterator_pattern = re.compile(r'^(\w+(?:\.\w+)*)\[([ijkn])\](?:\.(\w+(?:\.\w+)*))?$')
        match = iterator_pattern.match(variable_name)
        
        if match:
            # This is a list with iterator, suggest .gather() instead
            list_name = match.group(1)
            first_fields.append({
                'field': variable_name,
                'question_id': question_id,
                'is_list': True,
                'list_name': list_name,
                'suggestion': f'{list_name}.gather()',
            })
        else:
            # Regular field
            first_fields.append({
                'field': variable_name,
                'question_id': question_id,
                'is_list': False,
                'list_name': None,
                'suggestion': variable_name,
            })
    
    return first_fields
