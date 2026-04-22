const express = require('express');
const router = express.Router();
const Provider = require('../models/provider');

// 1. HIỂN THỊ DANH SÁCH (Read)
router.get('/', async (req, res) => {
    try {
        // Chỉ lấy những nhà cung cấp chưa bị xóa (isDeleted: false)
        // .sort({ createdAt: -1 }) để sắp xếp người mới thêm lên đầu
        const providers = await Provider.find({ isDeleted: false }).sort({ createdAt: -1 });
        
        // Truyền mảng providers ra ngoài file giao diện provider.ejs
        res.render('provider', { 
            title: 'Quản lý Nhà cung cấp',
            providers: providers 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Có lỗi xảy ra khi tải dữ liệu!');
    }
});

// 2. HIỂN THỊ FORM THÊM MỚI
router.get('/them', async (req, res) => {
    // Render ra một file ejs chứa form nhập liệu (ví dụ: provider_them.ejs)
    res.render('provider_them', { title: 'Thêm Nhà cung cấp' });
});

// 3. XỬ LÝ LƯU THÊM MỚI VÀO DATABASE (Create)
router.post('/them', async (req, res) => {
    try {
        // Lấy dữ liệu từ form (thẻ input name="providerName", "phone", "address")
        const { providerName, phone, address } = req.body;
        
        // Tạo đối tượng mới và lưu (Mã providerID sẽ tự sinh ra nhờ Plugin)
        const newProvider = new Provider({
            providerName: providerName,
            phone: phone,
            address: address
        });
        
        await newProvider.save();
        
        // Lưu thành công thì chuyển hướng về lại trang danh sách
        res.redirect('/provider');
    } catch (error) {
        console.error(error);
        res.status(500).send('Có lỗi xảy ra khi thêm dữ liệu!');
    }
});

// 4. HIỂN THỊ FORM SỬA DỮ LIỆU
router.get('/sua/:id', async (req, res) => {
    try {
        // Tìm nhà cung cấp theo _id trên thanh URL
        const provider = await Provider.findById(req.params.id);
        
        if (!provider) {
            return res.status(404).send('Không tìm thấy nhà cung cấp!');
        }
        
        // Truyền dữ liệu cũ ra form để người dùng sửa (ví dụ: provider_sua.ejs)
        res.render('provider_sua', { 
            title: 'Sửa Nhà cung cấp',
            provider: provider 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải thông tin sửa!');
    }
});

// 5. XỬ LÝ LƯU CẬP NHẬT VÀO DATABASE (Update)
router.post('/sua/:id', async (req, res) => {
    try {
        const { providerName, phone, address } = req.body;
        
        // Cập nhật dữ liệu mới dựa vào _id
        await Provider.findByIdAndUpdate(req.params.id, {
            providerName: providerName,
            phone: phone,
            address: address
        });
        
        res.redirect('/provider');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi cập nhật dữ liệu!');
    }
});

// 6. XỬ LÝ XÓA DỮ LIỆU (Delete - Xóa mềm)
router.get('/xoa/:id', async (req, res) => {
    try {
        // Thay vì xóa hẳn (findByIdAndDelete), ta chỉ cập nhật isDeleted = true
        await Provider.findByIdAndUpdate(req.params.id, {
            isDeleted: true
        });
        
        res.redirect('/provider');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi xóa dữ liệu!');
    }
});
// 7. AJAX: THÊM NHANH NHÀ CUNG CẤP (TỪ MODAL CỦA TRANG KHÁC)
router.post('/ajax-them', async (req, res) => {
    try {
        
        const { name, phone, address } = req.body; 
        
        
        const newProv = new Provider({ 
            providerName: name, 
            phone: phone || '',
            address: address || '' 
        }); 
        
        await newProv.save();
        res.status(200).json({ success: true, provider: newProv });
    } catch (error) { 
        console.error("Lỗi AJAX thêm NCC:", error);
        res.status(500).json({ success: false, message: 'Lỗi thêm nhà cung cấp' }); 
    }
});
module.exports = router;