try:
    import asgi
    from workers import WorkerEntrypoint
except ModuleNotFoundError:  # pragma: no cover - only used outside Workers runtime
    asgi = None

    class WorkerEntrypoint:  # type: ignore[override]
        pass

from app.core.config import apply_cloudflare_runtime_env
from app.main import create_app


app = create_app(auto_init_db=False)


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        if asgi is None:  # pragma: no cover - only used outside Workers runtime
            raise RuntimeError(
                "Cloudflare Workers runtime modules are unavailable. "
                "Run this entrypoint with pywrangler or deploy it to Workers."
            )

        apply_cloudflare_runtime_env(self.env)
        return await asgi.fetch(app, request, self.env)
