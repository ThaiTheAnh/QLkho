const ActivityLog = require('../models/ActivityLog');
const Product = require('../models/product'); // 🌟 PHẢI GỌI MODEL NÀY ĐỂ TRA TÊN THIẾT BỊ

// 🌟 ĐÃ NÂNG CẤP THÀNH ASYNC FUNCTION ĐỂ CÓ THỂ QUERY DATABASE
async function buildSmartDescription(req) {
    const url = req.originalUrl.toLowerCase();
    const body = req.body || {};
    const method = req.method;

    // 1. Xác định hành động cốt lõi
    let action = "Thao tác";
    if (method === 'POST') action = "Thêm mới";
    if (method === 'PUT' || url.includes('/sua') || url.includes('/edit')) action = "Cập nhật";
    if (method === 'DELETE' || url.includes('/xoa') || url.includes('/huy') || url.includes('/tu-choi')) action = "Xóa/Hủy";
    if (url.includes('/khoi-phuc')) action = "Khôi phục";
    if (url.includes('/duyet')) action = "Duyệt";

    // 2. Xác định Phân hệ (Module)
    let moduleName = "dữ liệu";
    if (url.includes('/product')) moduleName = "Sản phẩm";
    else if (url.includes('/importstock')) moduleName = "Phiếu Nhập kho";
    else if (url.includes('/exportstock')) moduleName = "Phiếu Xuất kho";
    else if (url.includes('/request')) moduleName = "Phiếu Yêu Cầu"; // 🌟 Dạy nó biết phân hệ Request
    else if (url.includes('/user')) moduleName = "Tài khoản";
    else if (url.includes('/provider')) moduleName = "Nhà cung cấp";
    else if (url.includes('/category')) moduleName = "Danh mục";
    else if (url.includes('/unit')) moduleName = "Đơn vị tính";

    let identifier = "";

    // 3. 🌟 TRA CỨU ID SANG TÊN THẬT (Khắc phục lỗi hiện chuỗi 69caa0...)
    if (body.productID) {
        // Đưa về mảng để dễ xử lý dù có 1 hay nhiều thiết bị
        let pIds = Array.isArray(body.productID) ? body.productID : [body.productID];
        try {
            // Chạy vào kho tìm tên thiết bị
            const products = await Product.find({ _id: { $in: pIds } });
            const names = products.map(p => p.productName || p.name);
            identifier = names.join(', '); // Ghép các tên lại: "Modem, Camera"
        } catch (err) {
            identifier = "Nhiều thiết bị";
        }
    } else {
        // Các phân hệ khác không dùng productID thì tự động bốc tên
        identifier = body.productName || body.importID || body.exportID || body.fullName || body.userName || body.providerName || body.categoryName || body.unitName || body.name || "";
    }

    // Trường hợp GET xóa/duyệt lấy ID từ URL
    if (!identifier && url.match(/\/([a-f0-9]{24})/i)) {
        identifier = "Mã ID-" + url.match(/\/([a-f0-9]{24})/i)[1].substring(0, 5) + "...";
    }

    // 4. Ráp thành câu văn
    let description = `${action} ${moduleName}`;
    if (identifier) description += ` [${identifier}]`;

    // 5. Thêm chi tiết
    if (body.price) description += ` (Đã set giá: ${Number(body.price).toLocaleString('vi-VN')} ₫)`;
    if (body.quantity) {
        let q = Array.isArray(body.quantity) ? body.quantity.join(', ') : body.quantity;
        description += ` (Số lượng: ${q})`;
    }
    if (body.note) description += ` - Ghi chú: "${body.note}"`;

    return description;
}

module.exports = async (req, res, next) => {
    const user = req.session.currentUser;

    // 🌟 Bắt vết cả các thao tác Duyệt / Từ chối
    const isModifying = ['POST', 'PUT', 'DELETE'].includes(req.method) || 
                        (req.method === 'GET' && req.originalUrl.match(/\/(xoa|huy|khoi-phuc|xoa-an|duyet|tu-choi)/i));

    if (user && isModifying) {
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                try {
                    let actionType = 'THAO TÁC';
                    if (req.method === 'POST') actionType = 'THÊM MỚI';
                    if (req.method === 'PUT' || req.originalUrl.includes('/sua')) actionType = 'CẬP NHẬT';
                    if (req.method === 'DELETE' || req.originalUrl.includes('/xoa') || req.originalUrl.includes('/huy') || req.originalUrl.includes('/tu-choi')) actionType = 'XÓA/HỦY';
                    if (req.originalUrl.includes('/khoi-phuc')) actionType = 'KHÔI PHỤC';
                    if (req.originalUrl.includes('/duyet')) actionType = 'DUYỆT';

                    let moduleKey = req.originalUrl.split('/')[1];
                    if (moduleKey) moduleKey = moduleKey.toUpperCase();

                    // 🌟 BẮT BUỘC CÓ CHỮ AWAIT Ở ĐÂY
                    const smartDescription = await buildSmartDescription(req);

                    await ActivityLog.create({
                        user: user._id,
                        action: actionType,
                        module: moduleKey,
                        description: smartDescription, 
                        details: req.body, 
                        ipAddress: req.ip || req.connection.remoteAddress,
                        sessionID: req.sessionID,
                        method: req.method,
                        originalUrl: req.originalUrl
                    });
                } catch (err) {
                    console.error("Lỗi ghi nhật ký:", err);
                }
            }
        });
    }
    next();
};