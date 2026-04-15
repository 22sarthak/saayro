# Screen Inventory

## Core screens
- landing page
- auth entry
- Google sign-in
- OTP login
- onboarding welcome
- onboarding preferences
- trip list
- create trip
- trip hub
- itinerary day view
- itinerary stop detail
- planner workspace
- Buddy panel or screen
- connected travel list
- connected item detail
- export panel
- maps preference
- profile and settings

## Required states for major screens
- empty state
- loading state
- error state
- success state
- partial connected state
- no-trip state

## State expectations
- trip hub must support no-trip, active trip, and partially connected scenarios
- connected travel must support unconnected, connecting, connected, partial import, and revoked states
- exports must support idle, generating, success, and failed states
