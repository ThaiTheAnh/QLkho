const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ImportItemsSchema = new mongoose.Schema({
    importItemsID: { type: String, unique: true }, // PK
    importStock: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportStock', required: true }, // FK Phiếu nhập
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // FK Thiết bị
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // FK Đơn vị tính (Bỏ required để tránh lỗi nếu SP ko có ĐVT)
    
    quantity: { type: Number, required: true, min: 1 }, // Số lượng

    // 🌟 SNAPSHOT: Chốt cứng dữ liệu tại thời điểm lập phiếu
    price: { type: Number, default: 0 }, 
    productName: { type: String, default: 'Sản phẩm không tên' }, // Chốt tên thiết bị
    unitName: { type: String, default: 'Cái' } // Chốt tên đơn vị tính
    
}, { timestamps: true });

ImportItemsSchema.plugin(autoIncrement, { 
    counterName: 'import_items_seq', 
    targetField: 'importItemsID', 
    prefix: 'CTN', // CTN = Chi tiết nhập
    padLength: 5 
});

// 🛡️ BÙA CHỐNG LỖI ĐÈ MODEL (OverwriteModelError)
module.exports = mongoose.models.ImportItems || mongoose.model('ImportItems', ImportItemsSchema);