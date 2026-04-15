# Integrations

## Maps deep links
- generate provider-specific route links for Google Maps and Apple Maps where supported

## Google sign-in
- use OAuth provider flow with minimal scope for authentication

## OTP provider placeholder
- abstract provider behind a service interface
- do not lock product logic to one vendor

## Gmail and Outlook connector architecture
- connector service should normalize provider-specific travel items into one internal shape
- treat this as later-phase work

## Calendar connector architecture
- normalize calendar events into connected travel item candidates or trip-linked events
- keep sync scope explicit and revocable
