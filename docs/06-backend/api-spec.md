# API Spec

## Endpoint list
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/v1/trips` | GET | list trips |
| `/v1/trips` | POST | create trip |
| `/v1/trips/{tripId}` | GET | fetch trip |
| `/v1/trips/{tripId}` | PATCH | update trip |
| `/v1/trips/{tripId}/itinerary` | GET | fetch itinerary |
| `/v1/trips/{tripId}/itinerary/generate` | POST | generate itinerary |
| `/v1/trips/{tripId}/itinerary/optimize` | POST | optimize itinerary |
| `/v1/trips/{tripId}/buddy/messages` | POST | send Buddy message |
| `/v1/trips/{tripId}/exports` | POST | create export job |
| `/v1/trips/{tripId}/connected-items` | GET | list attached connected items |
| `/v1/connections` | GET | list account connections |
| `/v1/connections/{provider}/connect` | POST | start provider connect flow |

## Request and response rules
- JSON request and response bodies
- stable ids for all top-level entities
- timestamps in ISO 8601 format
- confidence fields optional but standardized where used

## Auth requirements
- authenticated routes require a valid session token
- public routes limited to marketing, waitlist, and legal content

## Validation rules
- destination and trip dates required for trip creation
- itinerary optimization requires a valid trip id and optimization goal
- provider actions require provider identifier from allowed set

## Status codes
- `200` success
- `201` resource created or job started
- `400` validation error
- `401` unauthenticated
- `403` unauthorized
- `404` resource not found
- `409` state conflict
- `429` rate limited
- `500` internal error
