const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ExportItemsSchema = new mongoose.Schema({
    exportItemsID: { type: String, unique: true }, 
    exportStock: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportStock', required: true }, 
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }, // Bỏ required để an toàn nếu ĐVT bị xóa
    quantity: { type: Number, required: true, min: 1 }, 
    
    // 🌟 TRƯỜNG CỦA BẠN: Quản lý theo số Serial (Rất hữu ích cho Modem/Box)
    serialNumber: { type: String, default: '', trim: true },

    // =====================================
    // 🌟 SNAPSHOT DATA (CHỐNG MẤT DỮ LIỆU)
    // =====================================
    price: { type: Number, default: 0 },         // Chốt đơn giá tại thời điểm xuất
    productName: { type: String, required: true, default: 'Sản phẩm không tên' }, // Chốt tên thiết bị
    unitName: { type: String, default: 'Cái' }   // Chốt tên ĐVT

}, { timestamps: true });

ExportItemsSchema.plugin(autoIncrement, { 
    counterName: 'export_items_seq', 
    targetField: 'exportItemsID', 
    prefix: 'CTX', 
    padLength: 5 
});

// BÙA CHỐNG LỖI ĐÈ MODEL
module.exports = mongoose.models.ExportItems || mongoose.model('ExportItems', ExportItemsSchema);