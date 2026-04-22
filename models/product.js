const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ProductSchema = new mongoose.Schema({
    productID: { type: String, unique: true },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String }, // Lưu URL của ảnh
    
    // Khóa ngoại liên kết tới các bảng khác
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

ProductSchema.plugin(autoIncrement, { counterName: 'product_seq', targetField: 'productID', prefix: 'PRD', padLength: 4 }); // Để 4 số cho được nhiều SP (PRD0001)
module.exports = mongoose.model('Product', ProductSchema);