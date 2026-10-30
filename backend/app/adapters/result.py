from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Finding(BaseModel):
    title: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    description: str
    file: str | None = None
    line: int | None = None


class RunResult(BaseModel):
    run_id: str
    project_id: str
    kind: Literal["unit", "e2e", "security"]
    status: Literal["queued", "running", "passed", "failed", "cancelled"]
    started_at: datetime | None = None
    finished_at: datetime | None = None
    summary: str = ""
    findings: list[Finding] = Field(default_factory=list)
    evidence_path: str | None = None
