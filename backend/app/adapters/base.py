from abc import ABC, abstractmethod

from .result import RunResult


class TestAdapter(ABC):
    """Adapter boundary for a runner executed inside an isolated worker."""

    name: str

    @abstractmethod
    async def run(self, *, project_root: str, run_id: str, timeout_seconds: int) -> RunResult:
        """Run only within a coordinator-approved project root and return normalized output."""
        raise NotImplementedError
