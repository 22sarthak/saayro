# Backend Architecture

## FastAPI app structure
- route modules grouped by domain
- request validation at the edge
- service layer behind handlers

## Services layer
- trips service
- itinerary service
- Buddy service
- exports service
- connected travel service

## DB layer
- PostgreSQL as the primary store
- repository or query layer isolated from route handlers

## Background jobs
- export generation first
- connector sync tasks later
- media preprocessing later

## Integrations layer
- auth providers
- maps deep links
- inbox and calendar connectors later

## Security middleware
- auth context resolution
- rate limiting
- request logging and trace metadata
