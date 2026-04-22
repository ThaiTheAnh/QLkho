const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestSchema = new Schema({
    requestID: { type: String, required: true, unique: true }, // Mã phiếu (VD: YC001)
    type: { type: String, enum: ['import', 'export'], required: true }, // Loại yêu cầu: Xin nhập hàng (import) hoặc Xin xuất kho (export)
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Trạng thái: Chờ duyệt, Đã duyệt, Từ chối
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Người lập phiếu (Nhân viên)
    note: { type: String }, // Ghi chú thêm lý do xin cấp
    dateCreated: { type: Date, default: Date.now }, // Ngày lập
    dateHandled: { type: Date }, // Ngày Admin duyệt/từ chối
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Admin nào đã duyệt
    isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('request', requestSchema);