"""Regression checks for syntax-only source extraction (no backend dependencies)."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


class SourceExtractionTest(unittest.TestCase):
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
            'app/example_api.py': '''
router = APIRouter(prefix="/v1")
mock = APIRouter(prefix="/mock")
admin = APIRouter(prefix="/admin")
@router.post("/retired", deprecated=True, status_code=status.HTTP_409_CONFLICT)
def retired(): pass
router.get("/workflows/{id}")(get_workflow)
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
        self.assertEqual([(row['method'], row['path']) for row in data['api']], [('POST', '/v1/retired'), ('GET', '/v1/workflows/{id}')])
        self.assertEqual(data['api'][0]['status'], 409)
        self.assertTrue(data['api'][0]['deprecated'])


if __name__ == '__main__':
    unittest.main()
