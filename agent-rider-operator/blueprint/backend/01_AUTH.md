# Auth sub-builder — Operator Dashboard

## MVP choice
- Magic link **or** single OAuth (Google/GitHub)
- Session cookie (httpOnly)

## Flows
1. Request login → email/OAuth
2. Callback → create/find User → ensure Workspace → set session
3. Logout → clear session

## Rules
- No password storage at MVP if magic link
- `plan` lives on User; never trust client for plan
