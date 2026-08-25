# Resource API — Operator Dashboard

## Endpoints
| Method | Path | Behavior |
|--------|------|----------|
| GET | /api/resources | List for session workspace |
| POST | /api/resources | Create `{ title, payload }` |
| GET | /api/resources/:id | Fetch one if owned |
| PATCH | /api/resources/:id | Update title/payload |

## Activation event
On first successful POST, write Event `name=resource_created`.
