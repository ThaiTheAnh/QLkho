const mongoose = require('mongoose');
const autoIncrement = require('../utils/autoIncrement.plugin');

const ExportStockSchema = new mongoose.Schema({
    // =====================================
    // 1. THÔNG TIN CHUNG (Phần Vỏ)
    // =====================================
    exportID: { type: String, unique: true },
    dateExport: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Ai là người lập phiếu?
    
    // 🌟 BỔ SUNG: THÔNG TIN NGƯỜI NHẬN HÀNG (Khách hàng / Kỹ thuật viên)
    recipientName: { type: String, required: true, trim: true }, // Tên người nhận
    recipientPhone: { type: String, trim: true },                // Số điện thoại người nhận (Tùy chọn)

    // =====================================
    // 2. CHỨNG TỪ & GHI CHÚ
    // =====================================
    invoiceNumber: { type: String, default: '', trim: true },    // Số hóa đơn / Số hợp đồng
    reason: { type: String, default: 'Xuất triển khai' },        // Lý do xuất (VD: Triển khai mới, Bảo hành...)
    note: { type: String, trim: true },                          // Ghi chú thêm (VD: Xuất cho line đường Trần Hưng Đạo)
    totalAmount: { type: Number, default: 0 },                   // Tổng giá trị phiếu xuất

    // =====================================
    // 3. TRẠNG THÁI PHIẾU & LƯU VẾT HỦY
    // =====================================
    isDeleted: { type: Boolean, default: false }, // Đánh dấu đã hủy phiếu
    isHidden: { type: Boolean, default: false }, //xóa trong thùng rác

    cancelReason: { type: String, default: '' },                  // Lý do hủy phiếu
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // Ai là người hủy
    cancelledAt: { type: Date }                                   // Hủy vào lúc nào

}, { timestamps: true });

// Plugin tự động nhảy mã PX0001, PX0002...
ExportStockSchema.plugin(autoIncrement, { 
    counterName: 'export_seq', 
    targetField: 'exportID', 
    prefix: 'PX', 
    padLength: 4 
}); 

// BÙA CHỐNG LỖI ĐÈ MODEL
module.exports = mongoose.models.ExportStock || mongoose.model('ExportStock', ExportStockSchema);