from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from saayro_api.core.request_context import get_request_id


class ApiException(Exception):
    def __init__(self, status_code: int, code: str, message: str, retryable: bool = False) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retryable = retryable
        super().__init__(message)


def _error_response(status_code: int, code: str, message: str, retryable: bool) -> JSONResponse:
    request_id = get_request_id() or f"req_{uuid4().hex[:12]}"
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "requestId": request_id,
            }
        },
    )


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiException)
    async def handle_api_exception(_: Request, exc: ApiException) -> JSONResponse:
        return _error_response(exc.status_code, exc.code, exc.message, exc.retryable)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first_error = exc.errors()[0] if exc.errors() else {"msg": "Invalid request."}
        return _error_response(400, "validation_error", str(first_error["msg"]), False)

    @app.exception_handler(HTTPException)
    async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
        code_map = {401: "unauthenticated", 403: "unauthorized", 404: "not_found", 409: "state_conflict"}
        return _error_response(exc.status_code, code_map.get(exc.status_code, "http_error"), str(exc.detail), False)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, __: Exception) -> JSONResponse:
        return _error_response(500, "internal_error", "An unexpected error occurred.", False)
