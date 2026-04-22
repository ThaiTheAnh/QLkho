const express = require('express');
const router = express.Router();

const Inventory = require('../models/inventory');
const ImportStock = require('../models/importstock');
const ExportStock = require('../models/exportstock');
const ExportItem = require('../models/exportitems'); 

router.get('/', async (req, res) => {
    try {
        // 1. Xử lý khoảng thời gian (Năm)
        const currentYear = new Date().getFullYear();
        const selectedYear = req.query.year ? parseInt(req.query.year) : currentYear;
        
        const startOfYear = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${selectedYear}-12-31T23:59:59.999Z`);

        // 2. Lấy dữ liệu Nhập/Xuất trong năm
        const importsThisYear = await ImportStock.find({
            isDeleted: false,
            dateImport: { $gte: startOfYear, $lte: endOfYear }
        });

        const exportsThisYear = await ExportStock.find({
            isDeleted: false,
            dateExport: { $gte: startOfYear, $lte: endOfYear }
        });

        // Tính tổng Phiếu Nhập/Xuất theo năm đã chọn
        const totalImports = importsThisYear.length;
        const totalExports = exportsThisYear.length;

        // 🌟 TÍNH TỔNG DOANH THU CỦA NĂM ĐÓ
        const exportIds = exportsThisYear.map(px => px._id); // Lấy danh sách ID các phiếu xuất
        const exportedItems = await ExportItem.find({ exportStock: { $in: exportIds } }).populate('product');
        
        let totalRevenue = 0;
        exportedItems.forEach(item => {
            if (item.product && item.product.price) {
                totalRevenue += (item.quantity * item.product.price);
            }
        });

        // Xây dựng mảng thống kê 12 tháng
        let monthlyImports = new Array(12).fill(0);
        let monthlyExports = new Array(12).fill(0);

        importsThisYear.forEach(doc => {
            if (doc.dateImport) monthlyImports[new Date(doc.dateImport).getMonth()] += 1;
        });

        exportsThisYear.forEach(doc => {
            if (doc.dateExport) monthlyExports[new Date(doc.dateExport).getMonth()] += 1;
        });

        // 3. Tính Tổng giá trị Tồn Kho
        const inventories = await Inventory.find().populate('product');
        let totalInventoryValue = inventories.reduce((total, item) => {
            if (item.product && item.product.price) {
                return total + (item.quantity * item.product.price);
            }
            return total;
        }, 0);

        // 4. Thống kê tỉ trọng tồn kho theo Danh mục
        const allInventories = await Inventory.find({ quantity: { $gt: 0 } })
            .populate({
                path: 'product',
                populate: { path: 'category' }
            });

        let categoryMap = {};
        allInventories.forEach(item => {
            if (item.product && item.product.category) {
                let catName = item.product.category.categoryName || item.product.category.name || 'Chưa phân loại';
                categoryMap[catName] = (categoryMap[catName] || 0) + item.quantity;
            }
        });

        const chartLabels = Object.keys(categoryMap);
        const chartData = Object.values(categoryMap);

        // 5. Render giao diện
        res.render('index', { 
            title: 'Trang chủ Dashboard',
            currentUser: res.locals.currentUser || req.user || (req.session ? req.session.user : null),
            selectedYear,
            totalImports,
            totalExports,
            totalRevenue, // 🌟 BẮN BIẾN DOANH THU RA GIAO DIỆN
            totalInventoryValue,
            chartLabels: JSON.stringify(chartLabels), 
            chartData: JSON.stringify(chartData),
            monthlyImports: JSON.stringify(monthlyImports),
            monthlyExports: JSON.stringify(monthlyExports)
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send('Lỗi khi tải dữ liệu trang chủ!');
    }
});

module.exports = router;