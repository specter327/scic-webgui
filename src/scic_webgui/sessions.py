from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4
from scic import SCIC, SCICSession

@dataclass(slots=True)
class SessionEntry:
    session: SCICSession
    touched_at: datetime

class SessionStore:
    def __init__(self, scic: SCIC) -> None:
        self._scic = scic
        self._entries: dict[str, SessionEntry] = {}

    def create(self) -> tuple[str, SCICSession]:
        identifier = uuid4().hex
        session = self._scic.create_session()
        self._entries[identifier] = SessionEntry(session, datetime.now(timezone.utc))
        return identifier, session

    def get(self, identifier: str | None) -> tuple[str, SCICSession]:
        if identifier and identifier in self._entries:
            entry = self._entries[identifier]
            entry.touched_at = datetime.now(timezone.utc)
            return identifier, entry.session
        return self.create()
