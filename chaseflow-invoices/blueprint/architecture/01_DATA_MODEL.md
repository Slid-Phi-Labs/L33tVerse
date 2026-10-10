# Data model — ChaseFlow

## Entities
| Entity | Purpose |
|--------|---------|
| User | Auth identity + plan |
| Workspace | Ownership boundary |
| Client | Who is invoiced |
| Invoice | Amount, due date, status |
| ChaseSequence | Follow-up steps and channels |
| Payment | Linked Stripe / payment events |

See root schema.sql for production tables.
