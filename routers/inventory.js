const express = require('express');
const router = express.Router();

// Gọi các Model cần thiết
const Inventory = require('../models/inventory');
const Product = require('../models/product'); // 🌟 CẦN GỌI THÊM ĐỂ TÌM KIẾM

// ==========================================
// 1. GET: TRANG DANH SÁCH TỒN KHO (KÈM BỘ LỌC)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        let queryCondition = {};

        // --- XỬ LÝ LỌC TÌM KIẾM ---
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            
            // Tìm sản phẩm khớp với từ khóa (Tên hoặc Mã SP)
            const matchedProducts = await Product.find({
                $or: [
                    { productName: searchRegex },
                    { productID: searchRegex }
                ]
            }).select('_id');
            
            const productIDs = matchedProducts.map(p => p._id);
            queryCondition.product = { $in: productIDs };
        }

        // --- XỬ LÝ LỌC TRẠNG THÁI KHO ---
        if (status === 'empty') {
            queryCondition.quantity = { $lte: 0 }; 
        } else if (status === 'low') {
            queryCondition.quantity = { $gt: 0, $lte: 20 }; 
        } else if (status === 'high') {
            
            queryCondition.quantity = { $gt: 20 }; 
        }

        // --- TRUY VẤN DỮ LIỆU ---
        const inventories = await Inventory.find(queryCondition)
            .populate({
                path: 'product',
                populate: { path: 'unit' } 
            })
            // Ưu tiên hiển thị những món sắp hết lên đầu để Kế toán dễ thấy
            .sort({ quantity: 1, updatedAt: -1 });

        // --- TÍNH TOÁN SỐ LIỆU BÁO CÁO (Logic của bạn) ---
        let totalValue = 0;
        let lowStockCount = 0;

        inventories.forEach(item => {
            const price = (item.product && item.product.price) ? item.product.price : 0;
            totalValue += (item.quantity * price);

            // Đếm số lượng SP sắp hết (Đồng bộ mốc 5 cái giống giao diện)
            if (item.quantity > 0 && item.quantity <= 5) {
                lowStockCount++;
            }
        });

        res.render('inventory', { 
            title: 'Báo cáo Tồn Kho Hệ Thống', 
            inventories: inventories,
            totalValue: totalValue,      
            lowStockCount: lowStockCount, 
            filters: { search, status }, 
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải dữ liệu tồn kho!');
    }
});

// ==========================================
// 2. GET: XUẤT BÁO CÁO (IN PDF)
// ==========================================
router.get('/in-bao-cao', async (req, res) => {
    try {
        const inventories = await Inventory.find()
            .populate({
                path: 'product',
                populate: { path: 'unit' } 
            })
            .sort({ quantity: 1 });

        let totalValue = 0;
        inventories.forEach(item => {
            const price = (item.product && item.product.price) ? item.product.price : 0;
            totalValue += (item.quantity * price);
        });

        res.render('inventory_print', { 
            title: 'Báo cáo Tồn kho Chi tiết', 
            inventories, 
            totalValue,
            datePrint: new Date(),
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi hệ thống khi in báo cáo!');
    }
});

module.exports = router;