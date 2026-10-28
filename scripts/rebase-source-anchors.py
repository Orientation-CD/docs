"""Map old source anchors using definitions and unchanged text, never app imports."""
import ast
import difflib
import json
import re
import sys


def definitions(source, path):
    if path.endswith('.py'):
        tree = ast.parse(source)
        result = []

        def visit(node, scope=()):
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    name = scope + (child.name,)
                    result.append({'name': '.'.join(name), 'line': child.lineno, 'end': child.end_lineno})
                    visit(child, name)
                else:
                    visit(child, scope)

        visit(tree)
        return result
    if re.search(r'\.(?:ts|js|mjs|cjs|vue)$', path):
        return [{'name': match.group(1), 'line': source[:match.start()].count('\n') + 1, 'end': None}
                for match in re.finditer(r'\b(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)\b', source)]
    return []


def map_file(item):
    old, new = item['old'], item['new']
    old_lines, new_lines = old.splitlines(), new.splitlines()
    old_defs, new_defs = definitions(old, item['path']), definitions(new, item['path'])
    blocks = difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False).get_matching_blocks()

    def unique_match(lines, context):
        """Return the only exact occurrence, rejecting repeats in either source."""

        if not context:
            return None
        found = None
        for index, value in enumerate(lines):
            if value != context[0] or lines[index:index + len(context)] != context:
                continue
            if found is not None:
                return None
            found = index
        return found

    def text_line(number):
        if not 1 <= number <= len(old_lines):
            return None
        content = old_lines[number - 1].strip()
        # A punctuation-only/empty line cannot establish an anchor on its own.
        for block in blocks:
            if block.a <= number - 1 < block.a + block.size:
                if block.size >= 3 or len(content) >= 4 and not re.fullmatch(r'[{}()\[\],;]+', content):
                    context = old_lines[block.a:block.a + block.size]
                    if unique_match(old_lines, context) == block.a and unique_match(new_lines, context) == block.b:
                        return (block.b + number - block.a, 'unchanged-block')
        start, end = max(0, number - 3), min(len(old_lines), number + 2)
        context = old_lines[start:end]
        if len(context) < 3:
            return None
        if unique_match(old_lines, context) != start:
            return None
        found = unique_match(new_lines, context)
        return (found + number - start, 'unique-context') if found is not None else None

    result = []
    for anchor in item['anchors']:
        number, end = anchor['line'], anchor.get('endLine')
        mapped = {'id': anchor['id']}
        exact_defs = [entry for entry in old_defs if entry['line'] == number]
        if len(exact_defs) == 1:
            candidates = [entry for entry in new_defs if entry['name'] == exact_defs[0]['name']]
            if len(candidates) == 1:
                target = candidates[0]
                mapped.update(line=target['line'], method='definition', symbol=target['name'])
                if end is not None:
                    if end == exact_defs[0]['end'] and target['end'] is not None:
                        mapped['endLine'] = target['end']
                    else:
                        last = text_line(end)
                        if last:
                            mapped['endLine'] = last[0]
                        else:
                            mapped = {'id': anchor['id'], 'reason': 'Range end changed; manual review required.'}
            else:
                mapped['reason'] = f'Definition {exact_defs[0]["name"]} is missing or ambiguous in the new source.'
        else:
            first = text_line(number)
            last = text_line(end) if end is not None else None
            if first and (end is None or last):
                mapped.update(line=first[0], method=first[1])
                if last:
                    mapped['endLine'] = last[0]
            else:
                mapped['reason'] = 'Anchored text changed and no unique unchanged context proves its new line.'
        if 'line' in mapped and (not 1 <= mapped['line'] <= len(new_lines) or end is not None and not mapped['line'] <= mapped.get('endLine', 0) <= len(new_lines)):
            mapped = {'id': anchor['id'], 'reason': 'Mapped range is invalid; manual review required.'}
        result.append(mapped)
    return result


if __name__ == '__main__':
    print(json.dumps([mapped for item in json.load(sys.stdin)['files'] for mapped in map_file(item)], ensure_ascii=False))
