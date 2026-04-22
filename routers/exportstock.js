const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Gọi 5 Model cần thiết
const ExportStock = require('../models/exportstock'); // Vỏ phiếu xuất
const ExportItems = require('../models/exportitems'); // Ruột phiếu xuất
const Inventory = require('../models/inventory');     // Tồn kho
const Product = require('../models/product');         // Thiết bị
const User = require('../models/user');               // Người dùng

//  MIDDLEWARE: CHỈ CHO PHÉP ADMIN HOẶC KẾ TOÁN TRUY CẬP
const requireAdmin = (req, res, next) => {
    const user = res.locals.currentUser || req.user || (req.session ? req.session.user : null);
    if (user && user.role === 'admin') {
        next(); // Cho phép đi tiếp
    } else {
        // Nếu không phải admin, báo lỗi hoặc đá về trang chủ
        res.status(403).send(`
            <div style="text-align:center; margin-top: 50px; font-family: sans-serif;">
                <h1 style="color: red;">⛔ TRUY CẬP BỊ TỪ CHỐI</h1>
                <p>Bạn không có quyền truy cập vào chức năng này!</p>
                <a href="/exportstock" style="padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 5px;">Quay lại</a>
            </div>
        `);
    }
};

// ==========================================
// 1. GET: Trang danh sách Phiếu Xuất (Ai cũng xem được)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { search, fromDate, toDate } = req.query;
        let queryCondition = { isDeleted: false }; // Chỉ hiện phiếu chưa bị hủy

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const matchedUsers = await User.find({
                $or: [
                    { fullName: searchRegex }, 
                    { userName: searchRegex }
                ]
            }).select('_id');
            const userIDs = matchedUsers.map(u => u._id);

            queryCondition.$or = [
                { exportID: searchRegex },
                { reason: searchRegex },
                { recipientName: searchRegex }, 
                { recipientPhone: searchRegex },
                { invoiceNumber: searchRegex }, 
                { user: { $in: userIDs } }
            ];
        }

        if (fromDate || toDate) {
            queryCondition.dateExport = {};
            if (fromDate) {
                queryCondition.dateExport.$gte = new Date(fromDate);
            }
            if (toDate) {
                let endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                queryCondition.dateExport.$lte = endDate;
            }
        }

        const exportsList = await ExportStock.find(queryCondition)
            .populate('user', 'fullName userName')     
            .sort({ createdAt: -1 });

        res.render('exportstock', { 
            title: 'Lịch sử Xuất kho', 
            exports: exportsList,
            filters: { search, fromDate, toDate }, 
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải danh sách phiếu xuất!');
    }
});

// ==========================================
// 2. GET: Trang hiển thị Form Thêm Phiếu Xuất (Ai cũng thêm được)
// ==========================================
router.get('/them', async (req, res) => {
    try {
        const inventories = await Inventory.find({ quantity: { $gt: 0 } })
            .populate({ path: 'product', populate: { path: 'unit' } });

        res.render('exportstock_them', { 
            title: 'Lập phiếu Xuất kho', 
            inventories: inventories,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải form xuất kho!');
    }
});

// ==========================================
// 3. POST: Xử lý lưu Phiếu Xuất (Ai cũng lưu được)
// ==========================================
router.post('/them', async (req, res) => {
    try {
        const { reason, dateExport, recipientName, recipientPhone, invoiceNumber, note, productId, quantity, serialNumber } = req.body;
        const currentUserId = res.locals.currentUser ? res.locals.currentUser._id : req.user._id;

        let productsArr = Array.isArray(productId) ? productId : [productId];
        let quantitiesArr = Array.isArray(quantity) ? quantity : [quantity];
        let serialsArr = Array.isArray(serialNumber) ? serialNumber : [serialNumber];

        for (let i = 0; i < productsArr.length; i++) {
            const prodId = productsArr[i];
            const qtyToExport = Number(quantitiesArr[i]);
            
            const inventoryItem = await Inventory.findOne({ product: prodId });
            if (!inventoryItem || inventoryItem.quantity < qtyToExport) {
                return res.status(400).send(`<h2>LỖI KHO:</h2><p>Sản phẩm không đủ tồn kho để xuất!</p><a href="/exportstock/them">Quay lại</a>`);
            }
        }

        const dateObj = new Date(dateExport || Date.now());
        const yymmdd = dateObj.getFullYear().toString().slice(-2) + 
                       String(dateObj.getMonth() + 1).padStart(2, '0') + 
                       String(dateObj.getDate()).padStart(2, '0');
        const randomNum = Math.floor(100 + Math.random() * 900);
        const newExportID = `PX-${yymmdd}-${randomNum}`;

        const newExport = new ExportStock({
            exportID: newExportID,
            user: currentUserId,
            reason: reason,
            dateExport: dateObj,
            recipientName: recipientName,
            recipientPhone: recipientPhone,
            invoiceNumber: invoiceNumber,
            note: note
        });
        const savedExport = await newExport.save();

        let totalExportAmount = 0;

        for (let i = 0; i < productsArr.length; i++) {
            const prodId = productsArr[i];
            const qtyToExport = Number(quantitiesArr[i]);
            const serialData = serialsArr[i] || ''; 

            const productInfo = await Product.findById(prodId).populate('unit');
            const unitPrice = productInfo.price || 0;
            totalExportAmount += (unitPrice * qtyToExport);

            const newItem = new ExportItems({
                exportStock: savedExport._id, 
                product: prodId,
                unit: productInfo.unit ? productInfo.unit._id : null,       
                quantity: qtyToExport,
                serialNumber: serialData,
                price: unitPrice,
                productName: productInfo.productName || productInfo.name,
                unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
            });
            await newItem.save();

            await Inventory.findOneAndUpdate({ product: prodId }, { $inc: { quantity: -qtyToExport } });
        }

        savedExport.totalAmount = totalExportAmount;
        await savedExport.save();
        res.redirect('/exportstock');
    } catch (error) {
        console.error(error);
        res.status(500).send(`<h2>LỖI HỆ THỐNG!</h2><p>Lỗi chi tiết: ${error.message}</p>`);
    }
});

// ==========================================
// 4. GET: Xem chi tiết Phiếu Xuất (Ai cũng xem được)
// ==========================================
router.get('/chitiet/:id', async (req, res) => {
    try {
        const exportStock = await ExportStock.findById(req.params.id)
            .populate('user', 'fullName userName')
            .populate('cancelledBy', 'fullName userName'); 

        if (!exportStock) return res.status(404).send('Không tìm thấy phiếu xuất!');

        const exportItems = await ExportItems.find({ exportStock: exportStock._id })
            .populate({
                path: 'product',
                select: 'productID productName unit',
                populate: { path: 'unit', select: 'unitName name' } 
            });

        res.render('export_detail', {
            title: `Chi tiết Phiếu ${exportStock.exportID}`,
            px: exportStock,
            items: exportItems,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải chi tiết phiếu xuất!');
    }
});

// ==========================================
// 🌟 5. POST: HỦY PHIẾU XUẤT (Ai cũng hủy được để lưu vết)
// ==========================================
router.post('/huy/:id', async (req, res) => {
    try {
        const { cancelReason } = req.body;
        const exportStock = await ExportStock.findById(req.params.id);

        if (!exportStock || exportStock.isDeleted) {
            return res.status(400).json({ success: false, message: 'Phiếu không tồn tại hoặc đã bị hủy!' });
        }

        const items = await ExportItems.find({ exportStock: exportStock._id });
        for (let item of items) {
            await Inventory.findOneAndUpdate(
                { product: item.product },
                { $inc: { quantity: item.quantity } }, 
                { upsert: true }
            );
        }

        exportStock.isDeleted = true;
        exportStock.cancelReason = cancelReason;
        exportStock.cancelledAt = new Date();
        exportStock.cancelledBy = res.locals.currentUser ? res.locals.currentUser._id : null;
        await exportStock.save();

        res.json({ success: true, message: 'Đã hủy phiếu xuất và hoàn trả thiết bị về kho!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server khi hủy phiếu!' });
    }
});

// ==========================================
// 🌟 6. GET: Giao diện Thùng rác (KHÓA: CHỈ ADMIN)
// ==========================================
router.get('/thung-rac', requireAdmin, async (req, res) => {
    try {
        const deletedExports = await ExportStock.find({ isDeleted: true, isHidden: { $ne: true } })
            .populate('user', 'fullName userName')
            .populate('cancelledBy', 'fullName userName')
            .sort({ updatedAt: -1 });

        res.render('exportstock_trash', {
            title: 'Thùng rác Xuất kho',
            exports: deletedExports,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải thùng rác!');
    }
});

// ==========================================
// 🌟 7. GET: Khôi phục phiếu (KHÓA: CHỈ ADMIN)
// ==========================================
router.get('/khoi-phuc/:id', requireAdmin, async (req, res) => {
    try {
        const exportStock = await ExportStock.findById(req.params.id);
        if (!exportStock || !exportStock.isDeleted) return res.redirect('/exportstock/thung-rac');

        const items = await ExportItems.find({ exportStock: exportStock._id });

        for (let item of items) {
            const inv = await Inventory.findOne({ product: item.product });
            if (!inv || inv.quantity < item.quantity) {
                return res.send(`<script>alert("LỖI KHÔI PHỤC: Hiện tại trong kho không còn đủ thiết bị này để xuất lại!"); window.location.href="/exportstock/thung-rac";</script>`);
            }
        }

        for (let item of items) {
            await Inventory.findOneAndUpdate({ product: item.product }, { $inc: { quantity: -item.quantity } });
        }

        exportStock.isDeleted = false;
        await exportStock.save();
        res.redirect('/exportstock/thung-rac');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khôi phục phiếu!');
    }
});

// ==========================================
// 🌟 8. GET - Tải Form Sửa Phiếu Xuất (KHÓA: CHỈ ADMIN)
// ==========================================
router.get('/sua/:id', requireAdmin, async (req, res) => {
    try {
        const exportStock = await ExportStock.findById(req.params.id);
        if (!exportStock || exportStock.isDeleted) return res.redirect('/exportstock');

        const exportItems = await ExportItems.find({ exportStock: exportStock._id }).populate('product');
        const inventories = await Inventory.find().populate({ path: 'product', populate: { path: 'unit' } });

        res.render('exportstock_sua', {
            title: `Sửa Phiếu Xuất ${exportStock.exportID}`,
            px: exportStock,
            items: exportItems,
            inventories: inventories,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải form sửa!');
    }
});

// ==========================================
// 🌟 9. POST - Xử lý Lưu khi Sửa Phiếu Xuất (KHÓA: CHỈ ADMIN)
// ==========================================
router.post('/sua/:id', requireAdmin, async (req, res) => {
    try {
        const exportId = req.params.id;
        const { recipientName, recipientPhone, invoiceNumber, reason, note, dateExport, productId, quantity, serialNumber } = req.body;

        const oldItems = await ExportItems.find({ exportStock: exportId });
        for (let item of oldItems) {
            await Inventory.findOneAndUpdate({ product: item.product }, { $inc: { quantity: item.quantity } });
        }

        await ExportItems.deleteMany({ exportStock: exportId });
        const exportStock = await ExportStock.findByIdAndUpdate(exportId, {
            recipientName, recipientPhone, invoiceNumber, reason, note, dateExport: dateExport || Date.now()
        }, { returnDocument: 'after' });

        let productsArr = Array.isArray(productId) ? productId : [productId];
        let quantitiesArr = Array.isArray(quantity) ? quantity : [quantity];
        let serialsArr = Array.isArray(serialNumber) ? serialNumber : [serialNumber];
        let totalExportAmount = 0;

        for (let i = 0; i < productsArr.length; i++) {
            const prodId = productsArr[i];
            const qtyToExport = Number(quantitiesArr[i]);
            const serialData = serialsArr[i] || '';

            const productInfo = await Product.findById(prodId).populate('unit');
            totalExportAmount += (productInfo.price || 0) * qtyToExport;

            const newItem = new ExportItems({
                exportStock: exportId,
                product: prodId,
                unit: productInfo.unit ? productInfo.unit._id : null,
                quantity: qtyToExport,
                serialNumber: serialData,
                price: productInfo.price || 0,
                productName: productInfo.productName || productInfo.name,
                unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
            });
            await newItem.save();

            await Inventory.findOneAndUpdate({ product: prodId }, { $inc: { quantity: -qtyToExport } });
        }

        exportStock.totalAmount = totalExportAmount;
        await exportStock.save();
        res.redirect('/exportstock');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi cập nhật phiếu xuất!');
    }
});
//10 xoa
router.get('/xoa-an/:id', requireAdmin, async (req, res) => {
    try {
        // Chỉ cập nhật trạng thái isHidden thành true
        await ExportStock.findByIdAndUpdate(req.params.id, { 
            isHidden: true 
        });
        
        res.redirect('/exportstock/thung-rac');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi dọn dẹp thùng rác!');
    }
});
module.exports = router;