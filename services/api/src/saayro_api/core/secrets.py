from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from typing import Any

from saayro_api.core.errors import ApiException


def _derive_key(secret: str, nonce: bytes, length: int) -> bytes:
    material = bytearray()
    counter = 0
    while len(material) < length:
        block = hashlib.sha256(secret.encode("utf-8") + nonce + counter.to_bytes(4, "big")).digest()
        material.extend(block)
        counter += 1
    return bytes(material[:length])


def seal_payload(payload: dict[str, Any], secret: str) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    nonce = os.urandom(16)
    key = _derive_key(secret, nonce, len(raw))
    ciphertext = bytes(left ^ right for left, right in zip(raw, key, strict=True))
    signature = hmac.new(secret.encode("utf-8"), nonce + ciphertext, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + ciphertext + signature).decode("utf-8")


def unseal_payload(token: str, secret: str) -> dict[str, Any]:
    try:
        blob = base64.urlsafe_b64decode(token.encode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive decoding guard
        raise ApiException(status_code=400, code="invalid_connector_state", message="Connector state could not be decoded.") from exc

    if len(blob) <= 48:
        raise ApiException(status_code=400, code="invalid_connector_state", message="Connector state is incomplete.")

    nonce = blob[:16]
    signature = blob[-32:]
    ciphertext = blob[16:-32]
    expected_signature = hmac.new(secret.encode("utf-8"), nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ApiException(status_code=400, code="invalid_connector_state", message="Connector state signature mismatch.")

    key = _derive_key(secret, nonce, len(ciphertext))
    plaintext = bytes(left ^ right for left, right in zip(ciphertext, key, strict=True))
    try:
        payload = json.loads(plaintext.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ApiException(status_code=400, code="invalid_connector_state", message="Connector state payload is invalid.") from exc

    if not isinstance(payload, dict):
        raise ApiException(status_code=400, code="invalid_connector_state", message="Connector state payload is malformed.")
    return payload
