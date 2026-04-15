# Frontend API Contracts

## Trips
- request: create, list, get, update
- response: trip id, destination, dates, party type, preferences, status

## Itinerary
- request: generate, fetch, update, optimize
- response: days, stops, timing hints, notes, confidence labels

## Buddy messages
- request: trip id, user message, optional media refs
- response: assistant message, suggestions, structured actions, confidence label

## Exports
- request: trip id, export format
- response: export job status, artifact URL or share payload

## Map handoff
- request: stop or route payload plus preferred app
- response: external deep link or in-app preview model

## Connected travel
- request: provider connect state, item list, attach action
- response: provider status, connected items, attachment results
