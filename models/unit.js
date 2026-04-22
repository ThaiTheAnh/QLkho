const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const UnitSchema = new mongoose.Schema({
    unitID: { type: String, unique: true },
    unitName: { type: String, required: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

UnitSchema.plugin(autoIncrement, { counterName: 'unit_seq', targetField: 'unitID', prefix: 'UNT', padLength: 3 });
module.exports = mongoose.model('Unit', UnitSchema);