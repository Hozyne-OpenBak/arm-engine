const tenants = [];

function generateMockTenant(id) {
    return {
        id: `tenant-${id}`,
        name: `Tenant ${id}`,
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
    };
}

function createMockTenants(count) {
    for (let i = 1; i <= count; i++) {
        tenants.push(generateMockTenant(i));
    }
    return tenants;
}

module.exports = {
    createMockTenants,
};