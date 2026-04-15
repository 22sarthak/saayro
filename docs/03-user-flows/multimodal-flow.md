# Multimodal Flow

## Voice capture flow
1. user enters Buddy voice mode
2. app requests mic permission only when needed
3. user speaks a prompt
4. app transcribes and returns a visible text interpretation before action

## Photo understanding flow
1. user uploads or captures an image
2. app explains the purpose of analysis
3. Buddy returns a structured interpretation or asks for clarification

## Short video understanding flow
- later-phase capability only
- MVP may include a placeholder entry state but not live analysis

## Failure states
- unsupported file type
- low-confidence interpretation
- upload interrupted
- permission denied

## Privacy notices
- explain what media is used for
- avoid implying long-term storage when not required
