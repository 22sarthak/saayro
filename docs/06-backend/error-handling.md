# Error Handling

## Public API error schema
```json
{
  "error": {
    "code": "validation_error",
    "message": "Destination is required.",
    "retryable": false,
    "requestId": "req_123"
  }
}
```

## Internal logging rules
- log errors with request id and actor context
- separate expected validation failures from internal exceptions
- never log secrets or raw provider credentials

## Retryable vs non-retryable errors
- retryable: transient network issues, queued export delays, temporary provider failures
- non-retryable: invalid input, unsupported provider state, missing required fields
