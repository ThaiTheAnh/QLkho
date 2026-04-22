const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    action: { type: String, required: true }, // THÊM, SỬA, XÓA, ĐĂNG NHẬP, HỦY
    module: { type: String, required: true }, // NHẬP KHO, XUẤT KHO, SẢN PHẨM
    description: { type: String },           // Mô tả: "Đã xóa phiếu xuất PX001"
    details: { type: Object },               // Lưu toàn bộ req.body (dữ liệu người dùng gửi lên)
    ipAddress: { type: String },
    sessionID: { type: String },
    method: { type: String },                // POST, PUT, DELETE
    originalUrl: { type: String }
}, { timestamps: true }); // Tự động tạo createdAt và updatedAt

module.exports = mongoose.model('ActivityLog', activityLogSchema);