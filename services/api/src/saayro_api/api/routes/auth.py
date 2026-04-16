from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_optional_session, get_session
from saayro_api.core.config import get_settings
from saayro_api.schemas.auth import (
    GoogleAuthExchangeRequest,
    GoogleAuthExchangeResponse,
    LogoutResponse,
    OtpChallengeRead,
    OtpRequestPayload,
    OtpVerifyPayload,
    RefreshSessionResponse,
    SessionRead,
)
from saayro_api.services.auth import (
    SessionEnvelope,
    authenticate_google,
    build_session_read,
    refresh_session,
    request_otp_challenge,
    revoke_session,
    verify_otp_challenge,
)

router = APIRouter(tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        max_age=settings.auth_session_ttl_hours * 3600,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.auth_session_cookie_name, path="/")


@router.get("/auth/session", response_model=SessionRead)
async def get_auth_session(session: SessionEnvelope | None = Depends(get_optional_session)) -> SessionRead:
    return build_session_read(session)


@router.post("/auth/google/web", response_model=GoogleAuthExchangeResponse)
async def post_google_web_auth(
    payload: GoogleAuthExchangeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await authenticate_google(
        db,
        access_token=payload.access_token,
        id_token=payload.id_token,
        transport="cookie",
        client_label="Web Google sign-in",
    )
    if envelope.token:
        _set_session_cookie(response, envelope.token)
    return GoogleAuthExchangeResponse(session=build_session_read(envelope))


@router.post("/auth/google/mobile", response_model=GoogleAuthExchangeResponse)
async def post_google_mobile_auth(
    payload: GoogleAuthExchangeRequest,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await authenticate_google(
        db,
        access_token=payload.access_token,
        id_token=payload.id_token,
        transport="bearer",
        client_label="Mobile Google sign-in",
    )
    return GoogleAuthExchangeResponse(session=build_session_read(envelope), session_token=envelope.token)


@router.post("/auth/logout", response_model=LogoutResponse)
async def post_logout(
    response: Response,
    session: SessionEnvelope = Depends(get_session),
    db: AsyncSession = Depends(get_db),
) -> LogoutResponse:
    await revoke_session(db, session.session)
    _clear_session_cookie(response)
    return LogoutResponse()


@router.post("/auth/refresh", response_model=RefreshSessionResponse)
async def post_refresh(
    request: Request,
    response: Response,
    session: SessionEnvelope = Depends(get_session),
    db: AsyncSession = Depends(get_db),
) -> RefreshSessionResponse:
    refreshed = await refresh_session(db, session)
    if request.cookies.get(get_settings().auth_session_cookie_name):
        _set_session_cookie(response, refreshed.token or "")
        return RefreshSessionResponse(session=build_session_read(refreshed))
    return RefreshSessionResponse(session=build_session_read(refreshed), session_token=refreshed.token)


@router.post("/auth/otp/request", response_model=OtpChallengeRead)
async def post_otp_request(payload: OtpRequestPayload, db: AsyncSession = Depends(get_db)) -> OtpChallengeRead:
    return await request_otp_challenge(db, payload.phone_number)


@router.post("/auth/otp/verify", response_model=OtpChallengeRead)
async def post_otp_verify(payload: OtpVerifyPayload, db: AsyncSession = Depends(get_db)) -> OtpChallengeRead:
    return await verify_otp_challenge(db, payload.challenge_id, payload.code)
