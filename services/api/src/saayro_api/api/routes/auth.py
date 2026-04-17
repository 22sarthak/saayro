from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from saayro_api.api.deps import get_db, get_optional_session, get_session
from saayro_api.core.config import get_settings
from saayro_api.core.errors import ApiException
from saayro_api.models.users import User
from saayro_api.schemas.auth import (
    AuthStatusRead,
    EmailSignInPayload,
    EmailSignUpPayload,
    EmailVerificationRequestPayload,
    ForgotPasswordPayload,
    GoogleAuthExchangeRequest,
    GoogleAuthExchangeResponse,
    LogoutResponse,
    OtpChallengeRead,
    OtpRequestPayload,
    OtpVerifyPayload,
    RefreshSessionResponse,
    ResetPasswordPayload,
    SessionRead,
    TokenPayload,
)
from saayro_api.services.auth import (
    SessionEnvelope,
    authenticate_google,
    build_session_read,
    request_email_verification,
    request_password_reset,
    refresh_session,
    request_otp_challenge,
    revoke_session,
    reset_password_with_token,
    sign_in_with_email_password,
    sign_up_with_email_password,
    verify_email_token,
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
        intent=payload.intent,
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
        intent=payload.intent,
        transport="bearer",
        client_label="Mobile Google sign-in",
    )
    return GoogleAuthExchangeResponse(session=build_session_read(envelope), session_token=envelope.token)


@router.post("/auth/email/web/sign-up", response_model=GoogleAuthExchangeResponse)
async def post_email_web_sign_up(
    payload: EmailSignUpPayload,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await sign_up_with_email_password(
        db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        transport="cookie",
        client_label="Web email sign-up",
    )
    if envelope.token:
        _set_session_cookie(response, envelope.token)
    return GoogleAuthExchangeResponse(session=build_session_read(envelope))


@router.post("/auth/email/web/sign-in", response_model=GoogleAuthExchangeResponse)
async def post_email_web_sign_in(
    payload: EmailSignInPayload,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await sign_in_with_email_password(
        db,
        email=payload.email,
        password=payload.password,
        transport="cookie",
        client_label="Web email sign-in",
    )
    if envelope.token:
        _set_session_cookie(response, envelope.token)
    return GoogleAuthExchangeResponse(session=build_session_read(envelope))


@router.post("/auth/email/mobile/sign-up", response_model=GoogleAuthExchangeResponse)
async def post_email_mobile_sign_up(
    payload: EmailSignUpPayload,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await sign_up_with_email_password(
        db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        transport="bearer",
        client_label="Mobile email sign-up",
    )
    return GoogleAuthExchangeResponse(session=build_session_read(envelope), session_token=envelope.token)


@router.post("/auth/email/mobile/sign-in", response_model=GoogleAuthExchangeResponse)
async def post_email_mobile_sign_in(
    payload: EmailSignInPayload,
    db: AsyncSession = Depends(get_db),
) -> GoogleAuthExchangeResponse:
    envelope = await sign_in_with_email_password(
        db,
        email=payload.email,
        password=payload.password,
        transport="bearer",
        client_label="Mobile email sign-in",
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


@router.post("/auth/email/verify/request", response_model=AuthStatusRead)
async def post_email_verify_request(
    payload: EmailVerificationRequestPayload,
    session: SessionEnvelope = Depends(get_session),
    db: AsyncSession = Depends(get_db),
) -> AuthStatusRead:
    actor_email = payload.email or session.actor.email
    if actor_email.lower() != session.actor.email.lower():
        raise ApiException(status_code=403, code="unauthorized", message="You can only request verification for your own account.")
    user = await db.get(User, session.actor.user_id)
    if user is None:
        raise ApiException(status_code=404, code="not_found", message="User not found.")
    return await request_email_verification(db, user)


@router.post("/auth/email/verify/confirm", response_model=AuthStatusRead)
async def post_email_verify_confirm(payload: TokenPayload, db: AsyncSession = Depends(get_db)) -> AuthStatusRead:
    return await verify_email_token(db, payload.token)


@router.post("/auth/password/forgot", response_model=AuthStatusRead)
async def post_password_forgot(payload: ForgotPasswordPayload, db: AsyncSession = Depends(get_db)) -> AuthStatusRead:
    return await request_password_reset(db, payload.email)


@router.post("/auth/password/reset", response_model=AuthStatusRead)
async def post_password_reset(payload: ResetPasswordPayload, db: AsyncSession = Depends(get_db)) -> AuthStatusRead:
    return await reset_password_with_token(db, payload.token, payload.password)


@router.post("/auth/otp/request", response_model=OtpChallengeRead)
async def post_otp_request(payload: OtpRequestPayload, db: AsyncSession = Depends(get_db)) -> OtpChallengeRead:
    return await request_otp_challenge(db, payload.phone_number, intent=payload.intent)


@router.post("/auth/otp/verify", response_model=OtpChallengeRead)
async def post_otp_verify(payload: OtpVerifyPayload, db: AsyncSession = Depends(get_db)) -> OtpChallengeRead:
    return await verify_otp_challenge(db, payload.challenge_id, payload.code)
