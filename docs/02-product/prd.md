# Product Requirements Document

## Scope
This PRD defines the shell-first Saayro product for web and mobile with mock data, documented contracts, and future-ready expansion points.

## Objectives
- establish a coherent travel-first product shell
- define reusable modules for web and mobile
- make future backend and AI work implementation-friendly

## User problems
- fragmented planning
- low trust in generic travel AI
- messy sharing and handoff
- poor visibility into trip state

## Requirements by module
### Planning
- create trip with destination, dates, party type, and constraints
- generate and edit a mock itinerary
- optimize itinerary order and pacing through guided actions

### Buddy
- answer trip-aware questions
- suggest actions, not just text responses
- escalate into structured actions such as add stop or refine day plan

### Trip hub
- centralize summary, itinerary, connected items, and exports
- keep the active trip visible across major surfaces

### Exports
- support PDF export, shareable summary, and notes-friendly copy

### Maps handoff
- support preferred maps app selection and route handoff actions

### Connected travel
- support mock account connection states and attachable travel items

### Profile and settings
- manage preferences, connected states, and preferred maps app

## Non-goals
- real payments
- production auth backend wiring
- live inbox parsing or calendar sync
- video understanding pipeline
- advanced RAG or model routing

## Acceptance criteria
- web and mobile shells use the same product model
- primary modules have documented flows and states
- docs are sufficient for implementation agents to follow directly
