const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Tenant = sequelize.define('Tenant', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    namespace: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
    }
}, {
    timestamps: true
});

module.exports = Tenant;