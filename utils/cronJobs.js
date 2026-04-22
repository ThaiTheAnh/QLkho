const cron = require('node-cron');
const ActivityLog = require('../models/ActivityLog'); // Chú ý đường dẫn lùi lại 1 cấp

// Khai báo lịch trình: 0 phút, 0 giờ, mọi ngày, mọi tháng, vào Chủ Nhật (0)
cron.schedule('0 0 * * 0', async () => {
    try {
        const baThangTruoc = new Date();
        baThangTruoc.setMonth(baThangTruoc.getMonth() - 3);
        
        // Tìm và xóa các log có ngày tạo (createdAt) nhỏ hơn (<) mốc 3 tháng trước
        const result = await ActivityLog.deleteMany({ createdAt: { $lt: baThangTruoc } });
        
        console.log(`[CRON TỰ ĐỘNG] Đã dọn dẹp ${result.deletedCount} bản ghi log cũ hơn 90 ngày!`);
    } catch (err) {
        console.error('[CRON LỖI] Không thể dọn dẹp log:', err);
    }
});

// In ra một dòng thông báo nhỏ để biết file này đã được gọi thành công khi bật Server
console.log('✅ Hệ thống chạy ngầm (Cron Jobs) đã được kích hoạt!');