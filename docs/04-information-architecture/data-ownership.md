# Data Ownership

| Entity | Source of truth |
| --- | --- |
| Trip | backend entity later, mock client store during shell phase |
| Itinerary | trip-scoped structured data |
| Buddy history | trip-aware conversational state with backend persistence later |
| Export pack | generated artifact and export metadata |
| Connected travel item | imported record with source metadata |
| Profile settings | user-scoped preferences |
| Preferred maps app | user preference with local persistence and account sync later |
