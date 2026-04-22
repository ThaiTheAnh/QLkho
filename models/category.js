const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const CategorySchema = new mongoose.Schema({
    categoryID: { type: String, unique: true }, 
    categoryName: { type: String, required: true }, 
    isDeleted: { type: Boolean, default: false } 
}, { timestamps: true });


CategorySchema.plugin(autoIncrement, { 
    counterName: 'category_seq', 
    targetField: 'categoryID', 
    prefix: 'CAT', 
    padLength: 3 
});

module.exports = mongoose.model('Category', CategorySchema);