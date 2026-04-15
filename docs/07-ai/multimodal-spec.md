# Multimodal Spec

## Supported inputs
- text
- voice input
- images
- short video later

## Limits
- file size, duration, and format limits to be finalized during implementation
- unsupported inputs must fail with clear recovery paths

## Expected outputs
- concise interpretation
- confidence-aware summary
- structured follow-up action when useful

## Latency constraints
- voice and text should feel near-interactive
- image processing should return clear progress states
- later video support must not block core travel flows

## Privacy notes
- media use must be explained before capture or upload
- retention behavior must match policy and UI copy
