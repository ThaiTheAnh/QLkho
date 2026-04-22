const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ImportStockSchema = new mongoose.Schema({
    // 1. THÔNG TIN CHUNG (Phần Vỏ)
    importID: { type: String, unique: true },
    dateImport: { type: Date, default: Date.now },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true }, 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },        
    
    // Số hóa đơn / Chứng từ
    invoiceNumber: { type: String, default: '' },

    // Ghi chú thêm cho đợt nhập hàng (VD: "Nhập gấp lô Modem WiFi 6 đợt 1")
    note: { type: String, trim: true },

    // Tổng tiền thanh toán cho nhà cung cấp của cả phiếu này
    totalAmount: { type: Number, default: 0 },

   // 3. TRẠNG THÁI PHIẾU
    isDeleted: { type: Boolean, default: false }, // Hủy phiếu nhập (Soft delete)
    isHidden: { type: Boolean, default: false }, //xóa trong thùng rác
    
    // 🌟 BỔ SUNG CHO TÍNH NĂNG "HỦY PHIẾU CÓ LƯU VẾT"
    cancelReason: { type: String, default: '' },                  
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    cancelledAt: { type: Date }                                   
     
}, { timestamps: true });

// Plugin tự động nhảy mã PN0001, PN0002...
ImportStockSchema.plugin(autoIncrement, { 
    counterName: 'import_seq', 
    targetField: 'importID', 
    prefix: 'PN', 
    padLength: 4 
}); 

// BÙA CHỐNG LỖI ĐÈ MODEL
module.exports = mongoose.models.ImportStock || mongoose.model('ImportStock', ImportStockSchema);