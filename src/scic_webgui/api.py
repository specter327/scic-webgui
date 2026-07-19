from __future__ import annotations
from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, Field
from scic import SCIC, SCICError
from .serialization import json_safe
from .sessions import SessionStore
from .themes import ThemeRegistry

class ExecuteRequest(BaseModel):
    instruction: str = Field(min_length=1)

class InvokeRequest(BaseModel):
    path: str = Field(min_length=1)
    arguments: list[str] = Field(default_factory=list)

class NavigateRequest(BaseModel):
    path: str = Field(min_length=1)


def create_api_router(scic: SCIC, sessions: SessionStore, themes: ThemeRegistry, prefix: str) -> APIRouter:
    router = APIRouter(prefix=prefix)

    def normalize_path(path: str) -> str:
        """Convert ResourceTree paths into SCIC textual resolution paths."""
        tokens = [token for token in path.strip().split("/") if token]
        return " ".join(tokens) if tokens else scic.root.name

    def current_session(session_id: str | None, response: Response):
        identifier, session = sessions.get(session_id)
        response.headers["X-SCIC-Session"] = identifier
        return session

    @router.get("/health")
    async def health():
        return {"ok": True, "framework": "scic", "frozen": scic.frozen}

    @router.get("/tree")
    async def tree():
        return {"ok": True, "tree": scic.export_tree()}

    @router.get("/themes")
    async def list_themes():
        return {"ok": True, "themes": themes.describe()}

    @router.get("/context")
    async def context(response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        return {"ok": True, "context": session.describe(), "path": session.context_path}

    @router.post("/navigate")
    async def navigate(payload: NavigateRequest, response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        try:
            context = session.enter(normalize_path(payload.path))
            return {"ok": True, "context": context.describe(), "path": session.context_path}
        except SCICError as error:
            raise HTTPException(400, detail={"type": type(error).__name__, "message": str(error)}) from error

    @router.post("/back")
    async def back(response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        context = session.back()
        return {"ok": True, "context": context.describe(), "path": session.context_path}

    @router.post("/reset")
    async def reset(response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        context = session.reset()
        return {"ok": True, "context": context.describe(), "path": session.context_path}

    @router.get("/describe")
    async def describe(response: Response, path: str | None = None, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        try:
            normalized = normalize_path(path) if path else None
            return {"ok": True, "resource": session.describe(normalized)}
        except SCICError as error:
            raise HTTPException(404, detail={"type": type(error).__name__, "message": str(error)}) from error

    @router.post("/execute")
    async def execute(payload: ExecuteRequest, response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        try:
            results = await session.execute(payload.instruction)
            return {"ok": True, "results": json_safe(results), "path": session.context_path}
        except SCICError as error:
            raise HTTPException(400, detail={"type": type(error).__name__, "message": str(error)}) from error
        except Exception as error:
            raise HTTPException(500, detail={"type": type(error).__name__, "message": str(error)}) from error

    @router.post("/invoke")
    async def invoke(payload: InvokeRequest, response: Response, x_scic_session: str | None = Header(default=None)):
        session = current_session(x_scic_session, response)
        try:
            executable = session.require_executable(normalize_path(payload.path))
            parameters = executable.adapt_parameters(payload.arguments)
            value = executable.get_function()(*parameters)
            import inspect
            if inspect.isawaitable(value):
                value = await value
            results = executable.adapt_results(value)
            return {"ok": True, "results": json_safe(results), "path": session.context_path}
        except SCICError as error:
            raise HTTPException(400, detail={"type": type(error).__name__, "message": str(error)}) from error
        except Exception as error:
            raise HTTPException(500, detail={"type": type(error).__name__, "message": str(error)}) from error

    return router
