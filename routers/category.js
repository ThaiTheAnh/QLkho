const express = require('express');
const router = express.Router();
const Category = require('../models/category');

// 1. GET: Hiển thị danh sách Danh mục
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.render('category', { 
            title: 'Danh mục thiết bị', 
            categories: categories 
        });
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi tải danh sách danh mục!'); 
    }
});

// 2. GET: Form thêm Danh mục
router.get('/them', (req, res) => {
    res.render('category_them', { title: 'Thêm Danh mục mới' });
});

// 3. POST: Xử lý lưu Danh mục mới
router.post('/them', async (req, res) => {
    try {
        // Lưu ý: categoryID sẽ tự động được sinh ra nhờ plugin autoIncrement
        const newCategory = new Category({ 
            categoryName: req.body.categoryName 
        });
        await newCategory.save();
        res.redirect('/category');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi thêm danh mục!'); 
    }
});

// 4. GET: Form sửa Danh mục
router.get('/sua/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if(!category) return res.redirect('/category');
        
        res.render('category_sua', { 
            title: 'Sửa Danh mục', 
            category: category 
        });
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi tải thông tin sửa!'); 
    }
});

// 5. POST: Xử lý cập nhật Danh mục
router.post('/sua/:id', async (req, res) => {
    try {
        await Category.findByIdAndUpdate(req.params.id, { 
            categoryName: req.body.categoryName 
        });
        res.redirect('/category');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi cập nhật danh mục!'); 
    }
});

// 6. GET: Xử lý xóa mềm (Chuyển vào thùng rác)
router.get('/xoa/:id', async (req, res) => {
    try {
        // Có thể thêm bước kiểm tra phân quyền giống phần User ở đây nếu cần bảo mật
        if (req.session.currentUser && req.session.currentUser.role !== 'admin') {
            return res.send('<script>alert("Chỉ Admin mới có quyền xóa danh mục!"); window.location.href="/category";</script>');
        }

        await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect('/category');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi xóa danh mục!'); 
    }
});
router.post('/ajax-them', async (req, res) => {
    try {
        const newCat = new Category({ categoryName: req.body.categoryName });
        await newCat.save();
        res.status(200).json({ success: true, category: newCat });
    } catch (error) { 
        res.status(500).json({ success: false, message: 'Lỗi thêm danh mục' }); 
    }
});
module.exports = router;