const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User'); // 🌟 BẮT BUỘC PHẢI GỌI MODEL USER ĐỂ TÌM KIẾM

// 🌟 MIDDLEWARE: CHỈ ADMIN MỚI ĐƯỢC XEM LOG
const requireAdmin = (req, res, next) => {
    const user = res.locals.currentUser || req.user || (req.session ? req.session.user : null);
    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).send('<h2>⛔ BẠN KHÔNG CÓ QUYỀN TRUY CẬP TRANG NÀY!</h2>');
    }
};

// GET: DANH SÁCH NHẬT KÝ
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { search, actionType, startDate, endDate } = req.query;
        let queryCondition = {};

        // 🌟 1. LỌC THEO HÀNH ĐỘNG
        if (actionType) {
            queryCondition.action = actionType;
        }

        // 🌟 2. LỌC THEO KHOẢNG THỜI GIAN
        if (startDate || endDate) {
            queryCondition.createdAt = {};
            if (startDate) {
                let start = new Date(startDate);
                start.setHours(0, 0, 0, 0); // Lấy từ 00:00:00 sáng
                queryCondition.createdAt.$gte = start;
            }
            if (endDate) {
                let end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Lấy đến 23:59:59 tối
                queryCondition.createdAt.$lte = end;
            }
        }

        // 🌟 3. LỌC THEO TÊN NHÂN VIÊN (TÌM KIẾM)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Tìm nhân viên có tên khớp với từ khóa
            const matchedUsers = await User.find({
                $or: [
                    { fullName: searchRegex },
                    { userName: searchRegex }
                ]
            }).select('_id');
            
            // Lấy ra danh sách ID và đưa vào điều kiện tìm kiếm Log
            const userIDs = matchedUsers.map(u => u._id);
            queryCondition.user = { $in: userIDs };
        }

        // 🌟 TRUY VẤN DỮ LIỆU CÚI CÙNG
        const logs = await ActivityLog.find(queryCondition)
            // Lấy thêm trường phone (hoặc phoneNumber) từ bảng User
            .populate('user', 'fullName userName phone phoneNumber') 
            .sort({ createdAt: -1 })
            .limit(200);

        res.render('activitylog', {
            title: 'Nhật ký Hoạt động',
            logs: logs,
            filters: { search, actionType, startDate, endDate }, // Trả lại các giá trị để giữ trên form UI
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error("Lỗi tải Log:", error);
        res.status(500).send('Lỗi khi tải nhật ký hoạt động!');
    }
});

module.exports = router;