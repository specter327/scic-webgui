from __future__ import annotations
import threading
import webbrowser
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from scic import SCIC
from .api import create_api_router
from .config import WebGUIConfig
from .sessions import SessionStore
from .themes import ThemeRegistry

class SCICWebGUI:
    """Ready-to-use web application around one SCIC registry."""

    def __init__(self, scic: SCIC, config: WebGUIConfig | None = None, themes: ThemeRegistry | None = None) -> None:
        if not isinstance(scic, SCIC):
            raise TypeError("scic must be an SCIC instance")
        self.scic = scic
        self.config = config or WebGUIConfig()
        self.themes = themes or ThemeRegistry()
        self.sessions = SessionStore(scic)
        self.app = self._create_app()

    def _create_app(self) -> FastAPI:
        app = FastAPI(title=self.config.application_name, docs_url=None, redoc_url=None)
        if self.config.cors_origins:
            app.add_middleware(CORSMiddleware, allow_origins=list(self.config.cors_origins), allow_methods=["*"], allow_headers=["*"])
        app.state.scic_webgui = self
        app.include_router(create_api_router(self.scic, self.sessions, self.themes, self.config.api_prefix))
        static_dir = Path(__file__).parent / "static"
        app.mount("/assets", StaticFiles(directory=static_dir), name="assets")

        @app.get("/")
        async def index():
            return FileResponse(static_dir / "index.html")

        @app.get("/config.json")
        async def web_config():
            return {
                "applicationName": self.config.application_name,
                "applicationDescription": self.config.application_description,
                "apiPrefix": self.config.api_prefix,
                "defaultTheme": self.config.default_theme,
                "defaultVariant": self.config.default_variant,
                "allowThemeSelection": self.config.allow_theme_selection,
                "showMetadata": self.config.show_metadata,
                "showRawResults": self.config.show_raw_results,
            }
        return app

    def run(self, **uvicorn_options) -> None:
        if self.config.open_browser:
            url = f"http://{self.config.host}:{self.config.port}"
            threading.Timer(0.8, lambda: webbrowser.open(url)).start()
        uvicorn.run(self.app, host=self.config.host, port=self.config.port, **uvicorn_options)
