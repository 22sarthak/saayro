# Saayro v2 Plan

## Goal
Saayro is the shared home for a group trip anywhere in India. It works whether the trip is fully planned already or still an idea.

First real-world test: the founder's Goa group trip starting **2026-12-27**.
Build target: **2026-12-20**. The final week is for friend testing and fixes.

## Principles
- Mobile-first. Web follows.
- Pan-India by default. Places come from Google Places and web search, not curated lists.
- Buddy organises and guides inside the trip. It is not the main screen.
- Portable: calendar export, map handoff, UPI settle links, share anywhere.

## Core capabilities
| Area | What it does |
| --- | --- |
| Group trip | Invite by link, shared trip, members and roles |
| Bookings wallet | Drop flight/train/bus tickets (PDF/image/email) for AI extraction; stay card from an Airbnb/hotel link or confirmation email; generic bookings for car rental, cruise, activities; offline access |
| Places wishlist | Search with photos/reviews/hours (Google Places); add from Insta reel share or any link; WhatsApp chat export import; group voting; visited state |
| Day planner | Drag places into days; map view; distance-aware grouping suggested by Buddy |
| Buddy | Tool-calling agent (search places, read tickets, add to plan, split expenses); web/Reddit review summaries; proactive nudges |
| Money | Budget by category; expenses with splits; balances; UPI settle-up deep links |
| Chat | Trip chat with save-to-trip on messages and @Buddy (cut first if time is short) |
| Calendar | .ics export, then Google Calendar sync via the existing connector |
| On-trip | Today screen; geofence "did you visit?" prompts; shared album |

## Known platform limits
- Airbnb has no public booking API. Booking status comes from the confirmation email or a manual mark; listing details come from the shared link preview.
- Instagram saved reels are not accessible. Each reel is added via the share sheet.
- WhatsApp has no API. Import uses the chat export (.txt).
- Geofencing and the share sheet need a native dev build (not Expo Go).

## Tech direction
- Keep: monorepo, FastAPI, Postgres, auth.
- Replace: the rule-based Buddy orchestrator, with a tool-calling agent.
- Refresh: visual design (photo-rich, map-first, evolved Ivory Atlas).
- Add: hosted API + DB, file storage for tickets, realtime for chat.
- Distribution for the trip: TestFlight (iOS) + Play internal testing (Android).

## Timeline
| Week of | Focus |
| --- | --- |
| Nov 5 | Design direction, hosting, groups + invites, mobile restructure |
| Nov 12 | Bookings wallet, ticket/stay extraction, calendar export |
| Nov 19 | Places wishlist, Google Places, Insta share, WhatsApp import, voting |
| Nov 26 | Day planner + map, new Buddy agent, web/Reddit summaries |
| Dec 3 | Expenses, budget, UPI settle-up |
| Dec 10 | Group chat, location check-ins, Today screen, offline wallet |
| Dec 17 | Builds to TestFlight / Play, friend testing, fixes (freeze Dec 20) |
| Dec 27 | Goa |
