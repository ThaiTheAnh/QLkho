const express = require('express');
const router = express.Router();

const Request = require('../models/request');
const RequestItem = require('../models/requestitem');
const Product = require('../models/product');
const Inventory = require('../models/inventory');
const User = require('../models/user'); 

// ==========================================
// 1. XEM DANH SÁCH PHIẾU YÊU CẦU (Cho cả Admin và Nhân viên)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;

        // Tạo biến query để chứa các điều kiện lọc
        let query = { isDeleted: false };

        // 1. Nếu sếp có gõ tìm kiếm (🌟 ĐÃ CẬP NHẬT TÌM THEO TÊN NGƯỜI LẬP)
        if (req.query.search) {
            const keyword = req.query.search;
            const searchRegex = new RegExp(keyword, 'i'); // 'i' để không phân biệt hoa/thường

            // Bước 1: Tìm các User có Tên hoặc Username khớp với từ khóa
            const matchedUsers = await User.find({
                $or: [
                    { fullName: searchRegex },
                    { userName: searchRegex }
                ]
            }).select('_id'); // Chỉ lấy ID cho nhẹ

            // Gom ID của các User tìm được thành 1 mảng
            const matchedUserIds = matchedUsers.map(user => user._id);

            // Bước 2: Tìm Phiếu thỏa mãn: Mã phiếu khớp keyword HOẶC Người lập nằm trong mảng User vừa tìm
            query.$or = [
                { requestID: searchRegex },
                { user: { $in: matchedUserIds } }
            ];
        }

        // 2. Nếu sếp có lọc theo Từ ngày - Đến ngày
        if (req.query.fromDate || req.query.toDate) {
            query.dateCreated = {};
            if (req.query.fromDate) query.dateCreated.$gte = new Date(req.query.fromDate + 'T00:00:00.000Z');
            if (req.query.toDate) query.dateCreated.$lte = new Date(req.query.toDate + 'T23:59:59.999Z');
        }

        const requests = await Request.find(query)
            .populate('user')       // Chọc vào bảng User để bốc tên người lập
            .populate('handledBy')  // Chọc vào bảng User để bốc tên người duyệt
            .sort({ dateCreated: -1 }); // Nên để -1 để phiếu mới nhất nổi lên đầu

        res.render('request_list', {
            title: 'Quản lý Phiếu Yêu Cầu',
            requests: requests,
            currentUser: currentUser,
            filters: req.query // Trả về filters để giữ lại chữ sếp vừa gõ trên ô tìm kiếm
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải danh sách!');
    }
});

// ==========================================
// 2. LOAD FORM LẬP PHIẾU YÊU CẦU (Dành cho Nhân viên)
// ==========================================
router.get('/them', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;

        // Bốc tất cả thiết bị
        const products = await Product.find({ isDeleted: false });

        // Chạy qua kho đếm số lượng cho từng thiết bị
        const productsWithInventory = await Promise.all(products.map(async (p) => {
            const inv = await Inventory.findOne({ product: p._id });
            return {
                _id: p._id,
                productName: p.productName || p.name,
                inventoryQuantity: inv ? inv.quantity : 0 // Nếu có trong kho thì lấy số lượng, không thì bằng 0
            };
        }));

        res.render('request_them', {
            title: 'Lập Phiếu Yêu Cầu mới',
            products: productsWithInventory, // Gửi danh sách đã đếm số lượng ra giao diện
            currentUser: currentUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải form!');
    }
});

// ==========================================
// 3. XỬ LÝ LƯU PHIẾU YÊU CẦU (POST)
// ==========================================
router.post('/them', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;

        // 3.1. Tạo VỎ phiếu yêu cầu
        const newRequest = new Request({
            requestID: 'YC' + Date.now().toString().slice(-6),
            type: 'import', // 🌟 Cố định luôn là phiếu nhập hàng
            user: currentUser._id,
            note: req.body.note
        });
        await newRequest.save();

        // 3.2. Tạo RUỘT phiếu (bóc tách mảng thiết bị gửi lên từ giao diện)
        let productIds = req.body.productID;
        let quantities = req.body.quantity;

        // Đảm bảo dữ liệu là mảng (nếu chỉ chọn 1 thiết bị thì biến nó thành mảng)
        if (!Array.isArray(productIds)) {
            productIds = [productIds];
            quantities = [quantities];
        }

       for (let i = 0; i < productIds.length; i++) {
            if (productIds[i] && quantities[i] > 0) {
                
                // 🌟 BƯỚC 1: Tìm thiết bị trong DB để lấy Tên và Giá HIỆN TẠI
                const productInfo = await Product.findById(productIds[i]).populate('unit');
                
                if (productInfo) {
                    // 🌟 BƯỚC 2: Lưu chi tiết phiếu kèm theo dữ liệu Snapshot chốt cứng
                    const newItem = new RequestItem({
                        request: newRequest._id,
                        product: productIds[i],
                        quantity: quantities[i],
                        
                        // --- DỮ LIỆU ĐƯỢC CHỐT CỨNG TẠI THỜI ĐIỂM NÀY ---
                        productName: productInfo.productName || productInfo.name, 
                        price: productInfo.price || 0,
                        
                        // Chốt thêm thông tin đơn vị tính (nếu model có yêu cầu)
                        unit: productInfo.unit ? productInfo.unit._id : null,
                        unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
                    });
                    
                    await newItem.save();
                }
            }
        }
        res.redirect('/request');
    } catch (error) { res.status(500).send('Lỗi lưu phiếu yêu cầu!'); }
});

// ==========================================
// 4. ADMIN DUYỆT PHIẾU (Chỉ đổi trạng thái, KHÔNG TỰ ĐỘNG XUẤT KHO NỮA)
// ==========================================
router.get('/duyet/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;

        // 🛡️ Khiên bảo vệ: Chỉ Admin mới được duyệt
        if (currentUser.role !== 'admin') {
            return res.send('<script>alert("Chỉ Admin mới có quyền duyệt phiếu!"); window.location.href="/request";</script>');
        }

        const request = await Request.findById(req.params.id);
        if (request.status !== 'pending') return res.redirect('/request'); // Phiếu đã xử lý rồi thì bỏ qua

        // Cập nhật trạng thái vỏ phiếu yêu cầu thành "Đã duyệt" (approved)
        request.status = 'approved';
        request.dateHandled = new Date();
        request.handledBy = currentUser._id;
        await request.save();

        res.redirect('/request');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi hệ thống khi duyệt!');
    }
});

// ==========================================
// 5. ADMIN TỪ CHỐI PHIẾU
// ==========================================
router.get('/tu-choi/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;
        if (currentUser.role !== 'admin') {
            return res.send('<script>alert("Chỉ Admin mới có quyền từ chối phiếu!"); window.location.href="/request";</script>');
        }

        // Đổi trạng thái thành "Từ chối" (rejected)
        await Request.findByIdAndUpdate(req.params.id, {
            status: 'rejected',
            dateHandled: new Date(),
            handledBy: currentUser._id
        });
        res.redirect('/request');
    } catch (error) { res.status(500).send('Lỗi từ chối phiếu!'); }
});

// ==========================================
// 6. XEM CHI TIẾT PHIẾU YÊU CẦU
// ==========================================
router.get('/chitiet/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;

        // Bốc Vỏ phiếu
        const requestDoc = await Request.findById(req.params.id)
            .populate('user')
            .populate('handledBy');

        if (!requestDoc) return res.status(404).send('Không tìm thấy phiếu yêu cầu!');

        
        const requestItems = await RequestItem.find({ request: requestDoc._id })
            .populate({
                path: 'product',
                populate: { path: 'unit' } 
            });

        res.render('request_detail', {
            title: 'Chi tiết Phiếu Yêu Cầu',
            request: requestDoc,
            requestItems: requestItems,
            currentUser: currentUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải chi tiết phiếu!');
    }
});
// ==========================================
// 7. XÓA MỀM PHIẾU YÊU CẦU
// ==========================================
router.get('/xoa/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).send('Không tìm thấy phiếu!');

        // 🛡️ Luật 1: Chỉ phiếu "pending" mới được xóa
        if (request.status !== 'pending') {
            return res.send('<script>alert("Lỗi: Chỉ có thể xóa phiếu đang chờ duyệt!"); window.location.href="/request";</script>');
        }

        // 🛡️ Luật 2: Chỉ người lập phiếu hoặc Admin mới được xóa
        if (request.user.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
            return res.send('<script>alert("Lỗi: Bạn không có quyền xóa phiếu của người khác!"); window.location.href="/request";</script>');
        }

        // Thực hiện xóa mềm
        request.isDeleted = true;
        await request.save();

        res.redirect('/request');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi hệ thống khi xóa phiếu!');
    }
});

// ==========================================
// 8. LOAD FORM SỬA PHIẾU YÊU CẦU
// ==========================================
router.get('/sua/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).send('Không tìm thấy phiếu!');

        // 🛡️ Kiểm tra quyền hạn giống y như phần Xóa
        if (request.status !== 'pending') {
            return res.send('<script>alert("Lỗi: Chỉ có thể sửa phiếu đang chờ duyệt!"); window.location.href="/request";</script>');
        }
        if (request.user.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
            return res.send('<script>alert("Lỗi: Bạn không có quyền sửa phiếu của người khác!"); window.location.href="/request";</script>');
        }

        // Bốc danh sách chi tiết (ruột phiếu) hiện tại
        const requestItems = await RequestItem.find({ request: request._id });

        // Bốc tất cả thiết bị kèm số lượng tồn kho (giống chức năng Thêm)
        const products = await Product.find({ isDeleted: false });
        const productsWithInventory = await Promise.all(products.map(async (p) => {
            const inv = await Inventory.findOne({ product: p._id });
            return {
                _id: p._id,
                productName: p.productName || p.name,
                inventoryQuantity: inv ? inv.quantity : 0
            };
        }));

        res.render('request_sua', {
            title: 'Sửa Phiếu Yêu Cầu',
            request: request,
            requestItems: requestItems, // Truyền ruột phiếu cũ ra để hiển thị lên Form
            products: productsWithInventory,
            currentUser: currentUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải form sửa phiếu!');
    }
});

// ==========================================
// 9. XỬ LÝ LƯU CẬP NHẬT PHIẾU YÊU CẦU (POST)
// ==========================================
router.post('/sua/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || req.session.user;
        const request = await Request.findById(req.params.id);

        if (!request || request.status !== 'pending') {
            return res.status(400).send('Phiếu không tồn tại hoặc đã bị khóa!');
        }
        if (request.user.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
            return res.status(403).send('Không có quyền can thiệp!');
        }

        // 9.1 Cập nhật VỎ phiếu (Ghi chú mới)
        request.note = req.body.note;
        await request.save();

        // 9.2 XÓA TOÀN BỘ RUỘT PHIẾU CŨ (Cách an toàn nhất để update danh sách mảng)
        await RequestItem.deleteMany({ request: request._id });

        // 9.3 TẠO LẠI RUỘT PHIẾU MỚI TỪ FORM GỬI LÊN
        let productIds = req.body.productID;
        let quantities = req.body.quantity;

        if (!Array.isArray(productIds)) {
            productIds = [productIds];
            quantities = [quantities];
        }

        for (let i = 0; i < productIds.length; i++) {
            if (productIds[i] && quantities[i] > 0) {
                const productInfo = await Product.findById(productIds[i]).populate('unit');
                
                if (productInfo) {
                    const newItem = new RequestItem({
                        request: request._id,
                        product: productIds[i],
                        quantity: quantities[i],
                        productName: productInfo.productName || productInfo.name, 
                        price: productInfo.price || 0,
                        unit: productInfo.unit ? productInfo.unit._id : null,
                        unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
                    });
                    await newItem.save();
                }
            }
        }
        
        res.redirect('/request/chitiet/' + request._id);
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi lưu cập nhật phiếu!');
    }
});

module.exports = router;