# Frontend API contract

All N0 HTTP APIs (gateway and microservices) use the same response envelopes.

## Success

```json
{
  "success": true,
  "data": { },
  "message": "optional human message",
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-05-25T12:00:00.000Z"
  }
}
```

Handlers may return a plain object; `ApiResponseInterceptor` wraps it automatically. Prefer returning DTOs directly and use `apiSuccess()` only when you need an explicit message.

## Error

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Human-readable summary",
    "details": []
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-05-25T12:00:00.000Z"
  }
}
```

### `error.code` values (HTTP status numbers)

`error.code` is a numeric HTTP status (same family as the response status). Use `ErrorCode` constants in services.

| Code | Meaning |
|------|---------|
| `400` | Validation / bad request (`ErrorCode.VALIDATION_ERROR`, `ErrorCode.BAD_REQUEST`) |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not found |
| `409` | Conflict |
| `429` | Rate limited |
| `500` | Internal error |
| `503` | Service unavailable |

Branch in the FE on `error.code` (e.g. `401` → logout), not raw status text.

## Throwing errors in services

```typescript
import { AppException } from "../common/errors";
import { ErrorCode } from "../common/errors";

throw new AppException(ErrorCode.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
```

## Authentication

All protected routes require:

```http
Authorization: Bearer <access_token>
```

Obtain the token from auth-service (via gateway `POST /api/auth/...`). There is no dev-user bypass.

## Request correlation

Send or read header `x-request-id` on every call. The gateway forwards it to upstream services.

## Entry URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:3001/api` (gateway) |
| Production | `https://api.<your-domain>/api` (gateway only) |

Do not call microservice ports (`4000`, `4001`, …) from the browser in production.
