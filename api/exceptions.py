class APIException(Exception):
    """Base exception class for custom API errors."""
    def __init__(self, message: str, status_code: int = 500, code: str = "500"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class DatabaseConnectionError(APIException):
    """Raised when database connection fails or is unavailable."""
    def __init__(self, message: str = "Database connection error occurred."):
        super().__init__(message=message, status_code=500, code="500")


class NotFoundError(APIException):
    """Raised when a requested resource is not found."""
    def __init__(self, message: str = "Resource not found."):
        super().__init__(message=message, status_code=404, code="404")


class PermissionDeniedError(APIException):
    """Raised when permission is denied for the action."""
    def __init__(self, message: str = "Permission denied."):
        super().__init__(message=message, status_code=403, code="403")
