# SaaS Operations Runbook

## Tenant Provisioning Troubleshooting
1. Check the tenant creation logs for errors.
2. Ensure Kubernetes cluster has enough resources.
3. Retry provisioning using the admin CLI.

## Handling Payment Webhooks
1. Validate payload signature.
2. Ensure Stripe API is reachable.
3. Retry failed webhooks using the webhook dashboard.

## Kubernetes Cluster Management
- Scale nodes as needed: `kubectl scale`
- Monitor cluster health with `kubectl top nodes`

## Incident Response Playbook
1. Assess the impact.
2. Follow the escalation protocol.
3. Communicate with affected users.
4. Document the issue and resolution.