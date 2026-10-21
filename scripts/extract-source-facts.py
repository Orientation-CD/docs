"""Read tracked source text from stdin; never import or execute application code."""
import ast
import json
import re
import sys

payload = json.load(sys.stdin)
files = payload['files']
routes = []
settings = []
symbols = []


def literal(node, constants=None):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name) and constants and node.id in constants:
        return constants[node.id]
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -literal(node.operand, constants)
    if isinstance(node, ast.BinOp):
        a, b = literal(node.left, constants), literal(node.right, constants)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            if isinstance(node.op, ast.Mult):
                return a * b
            if isinstance(node.op, ast.Add):
                return a + b
            if isinstance(node.op, ast.Sub):
                return a - b
    if isinstance(node, (ast.List, ast.Tuple)):
        return [literal(item, constants) for item in node.elts]
    raise ValueError('nonliteral')


for path, source in sorted(files.items()):
    if not path.endswith('.py'):
        continue
    tree = ast.parse(source, filename=path)
    parents = {id(child): parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}
    imports = {}
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module:
            for alias in node.names:
                imports[alias.asname or alias.name] = (node.module.replace('.', '/') + '.py', alias.name)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            owner = parents.get(id(node))
            name = f'{owner.name}.{node.name}' if isinstance(owner, ast.ClassDef) else node.name
            symbols.append({'source': path, 'symbol': name, 'line': node.lineno, 'endLine': node.end_lineno})
    prefixes = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == 'APIRouter':
            prefix = next((k.value.value for k in node.value.keywords if k.arg == 'prefix' and isinstance(k.value, ast.Constant)), '')
            for target in node.targets:
                if isinstance(target, ast.Name):
                    prefixes[target.id] = prefix
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute) or not isinstance(node.func.value, ast.Name):
            continue
        name, method = node.func.value.id, node.func.attr
        if name not in prefixes or method not in {'get', 'post', 'put', 'patch', 'delete', 'head', 'options'} or not node.args or not isinstance(node.args[0], ast.Constant):
            continue
        route = prefixes[name] + node.args[0].value
        if not route.startswith(('/v1/', '/health/', '/voice-upload')):
            continue
        kwargs = {kw.arg: kw.value for kw in node.keywords}
        code = ast.unparse(kwargs['status_code']) if 'status_code' in kwargs else '200'
        code = re.search(r'HTTP_(\d+)', code).group(1) if re.search(r'HTTP_(\d+)', code) else code
        parent = parents.get(id(node))
        handler_name = None
        if isinstance(parent, (ast.FunctionDef, ast.AsyncFunctionDef)):
            handler_name = parent.name
        elif isinstance(parent, ast.Call) and parent.func is node and parent.args and isinstance(parent.args[0], ast.Name):
            handler_name = parent.args[0].id
        handler_source, handler_symbol = imports.get(handler_name, (path, handler_name))
        routes.append({'method': method.upper(), 'path': route, 'status': int(code) if code.isdigit() else code,
                       'deprecated': isinstance(kwargs.get('deprecated'), ast.Constant) and kwargs['deprecated'].value is True,
                       'source': path, 'line': node.lineno,
                       'handler': {'source': handler_source, 'symbol': handler_symbol}})
    if path != 'app/core/config.py':
        continue
    constants = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
            try:
                constants[node.targets[0].id] = literal(node.value)
            except (ValueError, TypeError):
                pass
    cls = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == 'Settings')
    for node in cls.body:
        if not isinstance(node, ast.AnnAssign) or not isinstance(node.target, ast.Name) or node.target.id == 'model_config':
            continue
        name, value = node.target.id, node.value
        default = value
        aliases = []
        if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == 'Field':
            default = next((kw.value for kw in value.keywords if kw.arg == 'default'), None)
            alias = next((kw.value for kw in value.keywords if kw.arg in ('validation_alias', 'alias')), None)
            if isinstance(alias, ast.Constant) and isinstance(alias.value, str):
                aliases = [alias.value]
            if isinstance(alias, ast.Call):
                aliases = [arg.value for arg in alias.args if isinstance(arg, ast.Constant) and isinstance(arg.value, str)]
        type_name = ast.unparse(node.annotation)
        secret = 'SecretStr' in type_name or bool(re.search(r'(secret|password|private_key|api_key|access_key)', name))
        try:
            result = literal(default, constants) if default else '<required or default factory; see source>'
        except (ValueError, TypeError):
            result = ast.unparse(default) if default else '<required or default factory; see source>'
        if secret and result is not None:
            result = '<secret; see source>'
        settings.append({'name': name, 'env': aliases[0] if aliases else name.upper(), 'aliases': aliases,
                         'type': type_name, 'default': result, 'secret': secret, 'line': node.lineno})
for route in routes:
    match = next((item for item in symbols if item['source'] == route['handler']['source'] and item['symbol'] == route['handler']['symbol']), None)
    if match:
        route['handler']['line'] = match['line']
print(json.dumps({'api': sorted(routes, key=lambda row: (row['path'], row['method'])), 'settings': settings, 'symbols': symbols}, ensure_ascii=False))
