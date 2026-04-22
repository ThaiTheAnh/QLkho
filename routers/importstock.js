const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Gọi các Model
const ImportStock = require('../models/importstock');
const ImportItems = require('../models/importitems');
const Inventory = require('../models/inventory');
const Product = require('../models/product');
const Provider = require('../models/provider');
const User = require('../models/User');

// 1. GET: Trang danh sách Phiếu Nhập
router.get('/', async (req, res) => {
    try {
        const { search, fromDate, toDate } = req.query;
        // Chỉ hiện phiếu CHƯA bị hủy ở trang chủ
        let queryCondition = { isDeleted: false };

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const matchedProviders = await Provider.find({
                $or: [{ name: searchRegex }, { providerName: searchRegex }, { ProviderName: searchRegex }]
            }).select('_id');
            const providerIDs = matchedProviders.map(p => p._id);

            const matchedUsers = await User.find({
                $or: [{ fullName: searchRegex }, { userName: searchRegex }]
            }).select('_id');
            const userIDs = matchedUsers.map(u => u._id);

            queryCondition.$or = [
                { importID: searchRegex },
                { invoiceNumber: searchRegex },
                { provider: { $in: providerIDs } },
                { user: { $in: userIDs } }
            ];
        }

        if (fromDate || toDate) {
            queryCondition.dateImport = {};
            if (fromDate) queryCondition.dateImport.$gte = new Date(fromDate);
            if (toDate) {
                let endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                queryCondition.dateImport.$lte = endDate;
            }
        }

        const imports = await ImportStock.find(queryCondition)
            .populate('provider', 'name providerName ProviderName')
            .populate('user', 'fullName userName')
            .sort({ createdAt: 1 }); // Mới nhất lên đầu

        res.render('importstock', {
            title: 'Lịch sử Nhập kho',
            imports: imports,
            filters: { search, fromDate, toDate },
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tải danh sách phiếu nhập!');
    }
});

// 2. GET: Form thêm
router.get('/them', async (req, res) => {
    try {
        const providers = await Provider.find({ isDeleted: false });
        const products = await Product.find({ isDeleted: false }).populate('unit');
        res.render('importstock_them', {
            title: 'Lập phiếu Nhập kho',
            providers: providers,
            products: products,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        res.status(500).send('Lỗi khi tải form!');
    }
});

// 3. POST: Lưu phiếu mới
router.post('/them', async (req, res) => {
    try {
        const { provider, invoiceNumber, dateImport, note, productId, quantity } = req.body;
        const currentUserId = res.locals.currentUser ? res.locals.currentUser._id : req.user._id;

        const newImport = new ImportStock({
            provider,
            invoiceNumber,
            note,
            dateImport: dateImport || Date.now(),
            user: currentUserId
        });
        const savedImport = await newImport.save();

        let productsArr = Array.isArray(productId) ? productId : [productId];
        let quantitiesArr = Array.isArray(quantity) ? quantity : [quantity];

        for (let i = 0; i < productsArr.length; i++) {
            const prodId = productsArr[i];
            const qty = Number(quantitiesArr[i]);
            const productInfo = await Product.findById(prodId).populate('unit');

            const newItem = new ImportItems({
                importStock: savedImport._id,
                product: prodId,
                unit: productInfo.unit ? productInfo.unit._id : null,
                quantity: qty,
                price: productInfo.price || 0,
                productName: productInfo.productName || productInfo.name,
                unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
            });
            await newItem.save();

            await Inventory.findOneAndUpdate(
                { product: prodId },
                { $inc: { quantity: qty } },
                { upsert: true }
            );
        }
        res.redirect('/importstock');
    } catch (error) {
        res.status(500).send('Lỗi khi lưu!');
    }
});

// 4. GET: Chi tiết
router.get('/chitiet/:id', async (req, res) => {
    try {
        // 1. Lấy vỏ phiếu (Header)
        const importStock = await ImportStock.findById(req.params.id)
            .populate('provider', 'ProviderName name providerName address phone')
            .populate('user', 'fullName userName')
            .populate('cancelledBy', 'fullName userName'); 

        if (!importStock) {
            return res.status(404).send('Không tìm thấy phiếu nhập!');
        }

        // 2. Lấy ruột phiếu (Details) - 🌟 PHẢI THÊM POPULATE Ở ĐÂY
        const importItems = await ImportItems.find({ importStock: importStock._id })
            .populate({
                path: 'product', // Móc sang bảng Product
                select: 'productID productName unit', // Lấy các trường cần thiết
                populate: { path: 'unit', select: 'unitName name' } // Móc tiếp sang bảng Unit để lấy tên ĐVT
            });

        // 3. Render ra giao diện
        res.render('import_detail', {
            title: `Chi tiết Phiếu ${importStock.importID}`,
            pn: importStock,
            items: importItems,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        console.error("Lỗi chi tiết phiếu nhập:", error);
        res.status(500).send('Lỗi khi tải dữ liệu chi tiết!');
    }
});

// 5. GET: Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        const importStock = await ImportStock.findById(req.params.id);
        if (!importStock || importStock.isDeleted) return res.redirect('/importstock');

        const importItems = await ImportItems.find({ importStock: importStock._id }).populate('product');
        const providers = await Provider.find({ isDeleted: false });
        const products = await Product.find({ isDeleted: false }).populate('unit');

        res.render('importstock_sua', {
            title: `Sửa Phiếu Nhập ${importStock.importID}`,
            pn: importStock,
            items: importItems,
            providers,
            products,
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null)
        });
    } catch (error) {
        res.status(500).send('Lỗi sửa!');
    }
});

// 6. POST: Xử lý Sửa
router.post('/sua/:id', async (req, res) => {
    try {
        const importId = req.params.id;
        const { provider, invoiceNumber, dateImport, note, productId, quantity } = req.body;

        const oldItems = await ImportItems.find({ importStock: importId });
        for (let item of oldItems) {
            await Inventory.findOneAndUpdate({ product: item.product }, { $inc: { quantity: -item.quantity } });
        }

        await ImportItems.deleteMany({ importStock: importId });
        await ImportStock.findByIdAndUpdate(importId, { provider, invoiceNumber, note, dateImport });

        let productsArr = Array.isArray(productId) ? productId : [productId];
        let quantitiesArr = Array.isArray(quantity) ? quantity : [quantity];

        for (let i = 0; i < productsArr.length; i++) {
            const prodId = productsArr[i];
            const qty = Number(quantitiesArr[i]);
            const productInfo = await Product.findById(prodId).populate('unit');

            const newItem = new ImportItems({
                importStock: importId,
                product: prodId,
                unit: productInfo.unit ? productInfo.unit._id : null,
                quantity: qty,
                price: productInfo.price || 0,
                productName: productInfo.productName || productInfo.name,
                unitName: productInfo.unit ? (productInfo.unit.unitName || productInfo.unit.name) : 'Cái'
            });
            await newItem.save();

            await Inventory.findOneAndUpdate({ product: prodId }, { $inc: { quantity: qty } }, { upsert: true });
        }
        res.redirect('/importstock');
    } catch (error) {
        res.status(500).send('Lỗi cập nhật!');
    }
});

// 🌟 7. POST: HỦY PHIẾU (Thay cho GET /xoa)
router.post('/huy/:id', async (req, res) => {
    try {
        const { cancelReason } = req.body;
        const importStock = await ImportStock.findById(req.params.id);

        if (!importStock || importStock.isDeleted) {
            return res.status(400).json({ success: false, message: 'Phiếu đã hủy hoặc không tồn tại!' });
        }

        const items = await ImportItems.find({ importStock: importStock._id });
        for (let item of items) {
            await Inventory.findOneAndUpdate({ product: item.product }, { $inc: { quantity: -item.quantity } });
        }

        importStock.isDeleted = true;
        importStock.cancelReason = cancelReason;
        importStock.cancelledAt = new Date();
        importStock.cancelledBy = res.locals.currentUser ? res.locals.currentUser._id : null;
        await importStock.save();

        res.json({ success: true, message: 'Hủy phiếu và trừ kho thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// 8. GET: Thùng rác
router.get('/thung-rac', async (req, res) => {
    try {
        const deletedImports = await ImportStock.find({ isDeleted: true, isHidden: { $ne: true } })
            .populate('provider', 'name providerName ProviderName')
            .populate('user', 'fullName userName')
            .populate('cancelledBy', 'fullName userName')
            .sort({ updatedAt: -1 });

        res.render('importstock_trash', {
            title: 'Thùng rác Nhập kho',
            imports: deletedImports,
            currentUser: res.locals.currentUser || (req.session ? req.session.user : null)
        });
    } catch (error) {
        res.status(500).send('Lỗi thùng rác!');
    }
});

// 9. GET: Khôi phục
router.get('/khoi-phuc/:id', async (req, res) => {
    try {
        const importStock = await ImportStock.findById(req.params.id);
        const items = await ImportItems.find({ importStock: importStock._id });

        for (let item of items) {
            await Inventory.findOneAndUpdate({ product: item.product }, { $inc: { quantity: item.quantity } }, { upsert: true });
        }

        importStock.isDeleted = false;
        await importStock.save();
        res.redirect('/importstock/thung-rac');
    } catch (error) {
        res.status(500).send('Lỗi khôi phục!');
    }
});
// 10 xoa phiếu
router.get('/xoa-an/:id', async (req, res) => {
    try {
        // Chỉ cập nhật trạng thái isHidden thành true thay vì xóa vĩnh viễn
        await ImportStock.findByIdAndUpdate(req.params.id, { 
            isHidden: true 
        });
        
        res.redirect('/importstock/thung-rac');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi dọn dẹp thùng rác!');
    }
});

module.exports = router;