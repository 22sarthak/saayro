# Trip Planning Flow

## Create trip
1. user starts a new trip
2. app captures destination, dates, party type, and optional travel style
3. app creates a draft trip shell

## Set constraints
- user can specify budget sensitivity, pace, food interest, comfort level, or must-see items
- app reflects constraints visibly in trip context

## Generate itinerary
1. user requests a draft itinerary
2. app returns a mock structured plan by day
3. each day contains stops, timing assumptions, and route-aware grouping

## Optimize itinerary
- user can reorder or optimize for distance, pacing, or priority
- Buddy may suggest refinements with reasoning
- optimization must remain editable and reversible

## Save, share, and export
- save updates to the active trip
- offer PDF, notes copy, share link, and map handoff entry points
