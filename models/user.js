const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const UserSchema = new mongoose.Schema({
    userID: { type: String, unique: true }, 
    userName: { type: String, required: true }, 
    password: { type: String, required: true }, 
    fullName: { type: String, required: true }, 
    phone: { type: String },
    email: { type: String, required: true },
    role: { type: String, required: true },
    isDeleted: { type: Boolean, default: false } 
}, { timestamps: true });

UserSchema.plugin(autoIncrement, { counterName: 'user_seq', targetField: 'userID', prefix: 'USR', padLength: 3 });

module.exports = mongoose.models.User || mongoose.model('user', UserSchema);