const express = require('express');
const router = express.Router();

const { provisionTenant } = require('./controller');

router.post('/tenants/provision', (req, res) => {
    const tenant = req.body;
    provisionTenant(tenant).then(() => {
        res.status(202).send('Provisioning started.');
    }).catch(err => {
        res.status(500).send(`Error: ${err.message}`);
    });
});

router.get('/tenants/status', (req, res) => {
    // Query status logic here
});

module.exports = router;