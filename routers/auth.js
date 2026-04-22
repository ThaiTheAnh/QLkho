const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 1. GET: Hiển thị form Đăng nhập
router.get('/login', async (req, res) => {
    // Nếu người dùng đã đăng nhập rồi mà còn mò vào trang này, đẩy họ về Trang chủ luôn
    if (req.session && req.session.currentUser) {
        return res.redirect('/');
    }
    
    res.render('login', { 
        title: 'Đăng nhập Kho FTEL', 
        error: null // Dùng biến error để hiện thông báo nếu họ gõ sai pass
    });
});

// 2. POST: Xử lý Đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { userName, password } = req.body;

        // B1: Tìm user trong Database (Chỉ tìm người chưa bị xóa)
        const user = await User.findOne({ userName: userName, isDeleted: false });
        
        // B2: Nếu không tìm thấy tên đăng nhập
        if (!user) {
            return res.render('login', { 
                title: 'Đăng nhập', 
                error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' 
            });
        }

        // B3: Có tên đăng nhập rồi thì mang mật khẩu đi so sánh
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { 
                title: 'Đăng nhập', 
                error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' 
            });
        }

        // B4: Mật khẩu đúng! Lưu thông tin vào Session (Giấy thông hành)
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.currentUser = user; // Toàn bộ web sẽ nhận diện user qua biến này

        // Đăng nhập thành công -> Chở thẳng về Trang chủ
        res.redirect('/'); 
        
    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.render('login', { title: 'Đăng nhập', error: 'Có lỗi hệ thống xảy ra!' });
    }
});

// 3. GET: Xử lý Đăng xuất
router.get('/logout', async (req, res) => {
    // Hủy bỏ "giấy thông hành"
    req.session.destroy((err) => {
        if (err) {
            console.error("Lỗi khi đăng xuất:", err);
        }
        
        res.redirect('/'); 
    });
});

module.exports = router;