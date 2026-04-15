# Auth And Security

## OAuth high-level flow
- initiate provider auth
- complete callback
- resolve account shell
- establish session

## OTP login high-level flow
- request OTP
- verify OTP
- create or resume account shell
- establish session with expiration rules

## Token model
- short-lived access token
- refresh or session continuation strategy decided during implementation
- avoid exposing provider tokens to clients directly

## Session expiration
- keep session behavior predictable
- require re-auth for sensitive account connection changes when appropriate

## Encryption and secrets handling
- store secrets only in environment-managed secret systems
- encrypt sensitive tokens at rest
- avoid logging secret material

## Abuse prevention
- rate limit OTP and auth endpoints
- protect Buddy and export endpoints from spam bursts
- log repeated verification failures for review
