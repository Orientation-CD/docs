"""Regression checks for syntax-only source extraction (no backend dependencies)."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


class SourceExtractionTest(unittest.TestCase):
    def test_utf8_source_payload_is_independent_of_windows_pipe_encoding(self):
        source = 'router = APIRouter(prefix="/v1")\n@router.get("/中文")\ndef read(): pass\n'
        script = Path(__file__).resolve().parents[1] / 'scripts/extract-source-facts.py'
        payload = json.dumps({'files': {'app/unicode.py': source}}, ensure_ascii=False).encode('utf-8')
        output = subprocess.run([sys.executable, str(script)], input=payload, check=True, capture_output=True)
        self.assertEqual(json.loads(output.stdout)['api'][0]['path'], '/v1/中文')

    def test_gateway_methods_are_resolved_without_importing_application(self):
        source = '''
raise RuntimeError("never execute")
router = APIRouter()
HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE", "CONNECT"]
@router.api_route("/v1/gateway/{target}/{path:path}", methods=HTTP_METHODS)
async def relay(): pass
@router.api_route("/v1/default")
async def default_read(): pass
'''
        script = Path(__file__).resolve().parents[1] / 'scripts/extract-source-facts.py'
        output = subprocess.run([sys.executable, str(script)], input=json.dumps({'files': {'app/gateway.py': source}}), text=True, check=True, capture_output=True)
        routes = json.loads(output.stdout)['api']
        gateway = [row for row in routes if row['handler']['symbol'] == 'relay']
        self.assertEqual({row['method'] for row in gateway}, {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'})
        self.assertTrue(all(row['path'] == '/v1/gateway/{target}/{path:path}' for row in gateway))
        self.assertEqual(next(row['method'] for row in routes if row['handler']['symbol'] == 'default_read'), 'GET')

    def test_unresolved_public_gateway_methods_fail_instead_of_disappearing(self):
        source = '''
router = APIRouter()
@router.api_route("/v1/gateway", methods=runtime_methods())
async def relay(): pass
'''
        script = Path(__file__).resolve().parents[1] / 'scripts/extract-source-facts.py'
        output = subprocess.run([sys.executable, str(script)], input=json.dumps({'files': {'app/gateway.py': source}}), text=True, capture_output=True)
        self.assertNotEqual(output.returncode, 0)
        self.assertIn('public api_route methods must be statically resolvable', output.stderr)

    def test_routes_defaults_and_secrets_without_executing_source(self):
        source = {
            'app/core/config.py': '''
from missing_runtime import Settings, Field, SecretStr, AliasChoices
raise RuntimeError("Application code must never execute")
TIMEOUT = 60
class Settings:
    model_config = object()
    config_encryption_key: SecretStr = SecretStr("encryption-not-for-output")
    ttl: int = Field(default=2 * TIMEOUT, ge=1)
    optional_password: SecretStr | None = None
    jwt_secret: SecretStr = SecretStr("not-for-output")
    s3_endpoint: str = Field(default="http://localhost", validation_alias=AliasChoices("S3_ENDPOINT", "S3_ENDPOINT_URL"))
''',
            'app/handlers.py': '''
def imported_handler(): return 'not executed'
''',
            'app/example_api.py': '''
from app.handlers import imported_handler as imported
router = APIRouter(prefix="/v1")
mock = APIRouter(prefix="/mock")
admin = APIRouter(prefix="/admin")
@router.post("/retired", deprecated=True, status_code=status.HTTP_409_CONFLICT)
def retired(): pass
router.get("/workflows/{id}")(get_workflow)
router.get("/imported")(imported)
@mock.post("/settle")
def settle(): pass
@admin.get("/users")
def users(): pass
''',
        }
        script = Path(__file__).resolve().parents[1] / 'scripts/extract-source-facts.py'
        output = subprocess.run([sys.executable, str(script)], input=json.dumps({'files': source}), text=True, check=True, capture_output=True)
        data = json.loads(output.stdout)
        fields = {row['name']: row for row in data['settings']}
        self.assertNotIn('model_config', fields)
        self.assertEqual(fields['ttl']['default'], 120)
        self.assertIsNone(fields['optional_password']['default'])
        self.assertNotIn('not-for-output', output.stdout)
        self.assertTrue(fields['config_encryption_key']['secret'])
        self.assertEqual(fields['s3_endpoint']['aliases'], ['S3_ENDPOINT', 'S3_ENDPOINT_URL'])
        self.assertEqual([(row['method'], row['path']) for row in data['api']], [('GET', '/v1/imported'), ('POST', '/v1/retired'), ('GET', '/v1/workflows/{id}')])
        self.assertEqual(data['api'][1]['status'], 409)
        self.assertTrue(data['api'][1]['deprecated'])
        self.assertEqual(data['api'][0]['handler'], {'source': 'app/handlers.py', 'symbol': 'imported_handler', 'line': 2})
        self.assertEqual(data['api'][1]['handler']['symbol'], 'retired')
        self.assertTrue(any(row['source'] == 'app/handlers.py' and row['symbol'] == 'imported_handler' for row in data['symbols']))


if __name__ == '__main__':
    unittest.main()
