from pathlib import Path


def test_pyproject_declares_worker_compatible_runtime_and_dependencies() -> None:
    content = Path("pyproject.toml").read_text()

    assert 'requires-python = ">=3.13"' in content
    assert '"pydantic>=' in content
    assert '"workers-py>=' in content
    assert '"workers-runtime-sdk>=' in content
    assert '"pytest>=' not in content.split("[dependency-groups]", 1)[0]
    assert '"uvicorn>=' not in content.split("[dependency-groups]", 1)[0]
    assert '"pywrangler>=' not in content


def test_wrangler_uses_app_worker_entrypoint() -> None:
    content = Path("wrangler.jsonc").read_text()

    assert '"main": "app/worker.py"' in content


def test_app_worker_imports_app_package_modules() -> None:
    content = Path("app/worker.py").read_text()

    assert "from app.core.config import apply_cloudflare_runtime_env" in content
    assert "from app.main import create_app" in content
