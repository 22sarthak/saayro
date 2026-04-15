# Auth Flows

## Sign up with Google
1. user selects Google sign-up
2. app explains account scope and privacy posture
3. user returns to Saayro with a new account shell
4. onboarding starts immediately

## Sign in with Google
1. user selects Google sign-in
2. app resumes the most recent account and trip context
3. if multiple trips exist, show trip list or last active trip

## Mobile and OTP login
1. user enters mobile number
2. app requests OTP and shows expected wait state
3. user enters OTP
4. app creates or resumes account shell

## Account merge strategy later
- support later account linking across Google and mobile login
- do not promise automatic merge behavior in MVP
- show support-safe language if duplicate accounts are suspected

## Error states
- Google auth cancelled
- OTP not delivered
- invalid OTP
- session expired
- network unavailable
- fallback copy must explain next step calmly
