class UEBATracker:
    """User & Entity Behavior Analytics — baseline tracker."""

    def __init__(self):
        self._active = True

    def health_check(self) -> bool:
        return self._active
