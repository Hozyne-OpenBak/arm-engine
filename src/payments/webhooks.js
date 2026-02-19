const { provisionTenant } = require('../provisioning/controller');

function handlePaymentWebhook(event) {
    if (event.type === 'payment_intent.succeeded') {
        const { subscriptionId, tenantId } = event.data.object.metadata;
        provisionTenant({
            subscriptionId,
            tenantId
        }).then(() => {
            console.log('Provisioning triggered for tenantId:', tenantId);
        }).catch(err => {
            console.error('Provisioning failed:', err);
        });
    }
}

module.exports = { handlePaymentWebhook };