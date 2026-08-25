# Billing — ChaseFlow

## Stripe
- Checkout Session for Pro upgrade
- Customer Portal for manage/cancel
- Webhook: checkout.session.completed, customer.subscription.updated/deleted

## Plan field
- users.plan: free | pro | admin
- Only webhook handlers write free/pro
- Admin code unlock writes plan=admin + role=admin (billing_bypass)
