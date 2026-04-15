# Analytics Events

| Event | Trigger | Key properties |
| --- | --- | --- |
| trip_created | user creates a trip | destination, trip_type, source_surface |
| buddy_message_sent | user sends Buddy message | trip_id, input_mode, message_context |
| export_clicked | user starts export | trip_id, export_type |
| map_handoff_selected | user selects map handoff | trip_id, map_app, route_scope |
| account_connected | user completes provider connection | provider, trip_context |
| otp_requested | user requests login OTP | country_code, source_surface |
| itinerary_optimized | user runs optimization | trip_id, optimization_goal |
