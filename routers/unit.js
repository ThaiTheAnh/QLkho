const express = require('express');
const router = express.Router();
const Unit = require('../models/unit');

// 1. GET: Hiển thị danh sách Đơn vị tính
router.get('/', async (req, res) => {
    try {
        const units = await Unit.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.render('unit', { 
            title: 'Quản lý Đơn vị tính', 
            units: units 
        });
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi tải danh sách đơn vị tính!'); 
    }
});

// 2. GET: Form thêm Đơn vị tính
router.get('/them', (req, res) => {
    res.render('unit_them', { title: 'Thêm Đơn vị tính mới' });
});

// 3. POST: Xử lý lưu Đơn vị tính mới
router.post('/them', async (req, res) => {
    try {
        // unitID sẽ tự động được sinh ra (UNT001, UNT002...)
        const newUnit = new Unit({ 
            unitName: req.body.unitName 
        });
        await newUnit.save();
        res.redirect('/units');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi thêm đơn vị tính!'); 
    }
});

// 4. GET: Form sửa Đơn vị tính
router.get('/sua/:id', async (req, res) => {
    try {
        const unit = await Unit.findById(req.params.id);
        if(!unit) return res.redirect('/unit');
        
        res.render('unit_sua', { 
            title: 'Sửa Đơn vị tính', 
            unit: unit 
        });
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi tải thông tin sửa!'); 
    }
});

// 5. POST: Xử lý cập nhật Đơn vị tính
router.post('/sua/:id', async (req, res) => {
    try {
        await Unit.findByIdAndUpdate(req.params.id, { 
            unitName: req.body.unitName 
        });
        res.redirect('/unit');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi cập nhật đơn vị tính!'); 
    }
});

// 6. GET: Xử lý xóa mềm
router.get('/xoa/:id', async (req, res) => {
    try {
        // Chỉ Admin mới được quyền xóa Đơn vị tính
        if (req.session.currentUser && req.session.currentUser.role !== 'admin') {
            return res.send('<script>alert("Chỉ Admin mới có quyền xóa đơn vị tính!"); window.location.href="/units";</script>');
        }

        await Unit.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect('/unit');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi xóa đơn vị tính!'); 
    }
});
router.post('/ajax-them', async (req, res) => {
    try {
        const newUnit = new Unit({ 
            unitName: req.body.unitName 
        });
        await newUnit.save();
        
        // Trả về dữ liệu dạng JSON thay vì redirect
        res.status(200).json({ success: true, unit: newUnit });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi khi thêm đơn vị tính!' }); 
    }
});
module.exports = router;