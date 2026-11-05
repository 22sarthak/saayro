# AGENTS.md

## Project
Saayro is a premium pan-India AI travel companion app.

Brand:
- Name: Saayro
- Tagline: Your trip's smarter half

## Current phase
Saayro v2 rebuild. See `docs/02-product/v2-plan.md`.
- Mobile-first group trip app for anywhere in India
- First real-world test: founder's Goa group trip on 2026-12-27; build freeze 2026-12-20
- Keep monorepo, FastAPI, Postgres and auth; replace the rule-based Buddy orchestrator with a tool-calling agent; refresh the visual design

Now in scope (explicitly requested for v2):
- ticket and booking extraction from PDFs, images and confirmation emails
- calendar export and Google Calendar sync
- Google Places data, web search and review summaries
- group trips, chat, expenses and budget
- location check-ins

Still out of scope unless explicitly requested:
- real payments (UPI settle-up is a deep-link handoff only)
- video understanding pipeline
- complex RAG stack

## Approved design direction
Use the Ivory Atlas design system with subtle hues.

Design rules:
- bright, premium, editorial
- soft ivory and white base
- slate text and borders
- subtle accent hues
- sky = maps, movement, flights
- violet/lilac = Buddy AI, intelligence, suggestions
- mint/emerald = success, connected status, confidence
- amber = discovery, food, warmth, culture
- soft shadows
- rounded cards
- high whitespace
- avoid generic dark AI styling

## Product principles
- Saayro is travel-first, not chatbot-first
- Buddy should guide, not just answer
- app should be open ecosystem, not closed ecosystem
- user should be able to export/share/handoff anywhere
- trust, clarity, and calmness matter more than flashy complexity

## Stack
- apps/web: Next.js + TypeScript + Tailwind
- apps/mobile: Expo + TypeScript
- services/api: FastAPI + PostgreSQL
- packages/ui
- packages/types

## Build order
1. root workspace
2. shared packages
3. web UI shell
4. mobile UI shell
5. mock data and front-end flows
6. backend basics
7. AI layer
8. integrations

## Working style
- keep code modular and readable
- create reusable components
- do not overbuild
- avoid speculative abstractions
- keep file and component names clear
- prefer explicit types
- respect design system tokens

