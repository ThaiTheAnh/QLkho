const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');
const Schema = mongoose.Schema;

const requestItemSchema = new Schema({
    requestItemID: { type: String, unique: true }, 
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    
    
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, 
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    quantity: { type: Number, required: true, min: 1 },

    
    productName: { type: String, required: true }, // Chốt cứng Tên thiết bị
    unitName: { type: String, required: true },    // Chốt cứng Tên đơn vị tính (Cái, Hộp, Bộ...)
    price: { type: Number, default: 0 }            // Chốt cứng Giá
}, { timestamps: true });

requestItemSchema.plugin(autoIncrement, { 
    counterName: 'request_items_seq', 
    targetField: 'requestItemID', 
    prefix: 'CTY', 
    padLength: 5 
});

module.exports = mongoose.models.requestitem || mongoose.model('requestitem', requestItemSchema);