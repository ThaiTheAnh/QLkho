const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');

// 1. HIỂN THỊ DANH SÁCH TÀI KHOẢN
router.get('/', async (req, res) => {
    try {
        const users = await User.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.render('user', { 
            title: 'Quản lý Người dùng',
            users: users,
            
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Có lỗi xảy ra khi tải danh sách người dùng!');
    }
});

// 2. HIỂN THỊ FORM THÊM MỚI
router.get('/them', async (req, res) => {
    res.render('user_them', { title: 'Thêm Người dùng' });
});

// 3. XỬ LÝ LƯU THÊM MỚI (Sửa lỗi userName)
router.post('/them', async (req, res) => {
    try {
        const { fullName, username, password, role, phone, email } = req.body;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName: fullName,
            userName: username, // Lấy biến username (thường) gán vào cột userName (Hoa)
            password: hashedPassword,
            role: role || 'nhanvien',
            phone: phone,
            email: email
        });
        
        await newUser.save();
        res.redirect('/user'); // Đổi từ /users thành /user
    } catch (error) {
        console.error("Lỗi thêm user:", error);
        res.status(500).send('Có lỗi xảy ra khi thêm tài khoản!');
    }
});

// 4. HIỂN THỊ FORM SỬA DỮ LIỆU
router.get('/sua/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = req.session.currentUser; 

       
        if (currentUser.role === 'nhanvien' && currentUser._id.toString() !== userId) {
            return res.send('<script>alert("CẢNH BÁO: Bạn chỉ được phép sửa thông tin tài khoản của chính mình!"); window.location.href="/user";</script>');
        }
        
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('Không tìm thấy tài khoản!');
        
        res.render('user_sua', { 
            title: 'Sửa Người dùng',
            user: user 
        });
    } catch (error) {
        res.status(500).send('Lỗi khi tải thông tin sửa!');
    }
});

// 5. XỬ LÝ CẬP NHẬT (Sửa lỗi userName)
router.post('/sua/:id', async (req, res) => {
    try {
        const { fullName, username, password, role, phone, email } = req.body;
        
        let updateData = {
            fullName: fullName,
            userName: username, // Lấy biến username gán vào cột userName
            role: role,
            phone: phone,
            email: email
        };

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        await User.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/user'); // Đổi từ /users thành /user
    } catch (error) {
        console.error("Lỗi sửa user:", error);
        res.status(500).send('Lỗi khi cập nhật tài khoản!');
    }
});

// 6. XỬ LÝ XÓA DỮ LIỆU
router.get('/xoa/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect('/user'); // Đổi từ /users thành /user
    } catch (error) {
        res.status(500).send('Lỗi khi xóa tài khoản!');
    }
});

module.exports = router;