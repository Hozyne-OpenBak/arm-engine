// User model definition
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    passwordHash: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = User;