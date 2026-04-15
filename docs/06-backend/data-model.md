# Data Model

## Users
- id
- auth identifiers
- profile basics
- preferences

## Trips
- id
- user id
- destination
- date range
- party type
- planning preferences
- status

## Itinerary days
- id
- trip id
- day number
- date
- summary

## Itinerary stops
- id
- itinerary day id
- title
- type
- timing hints
- route metadata

## Buddy messages
- id
- trip id
- role
- content
- action metadata
- confidence label

## Connected accounts
- id
- user id
- provider
- status
- granted scopes

## Connected travel items
- id
- connected account id
- source type
- extracted metadata
- attachment status

## Export jobs
- id
- trip id
- format
- status
- artifact location
