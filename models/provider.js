const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ProviderSchema = new mongoose.Schema({
    providerID: { type: String, unique: true },
    providerName: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

ProviderSchema.plugin(autoIncrement, { counterName: 'provider_seq', targetField: 'providerID', prefix: 'PRV', padLength: 3 });
module.exports = mongoose.model('Provider', ProviderSchema);