const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const path = require('path');

// Gọi Models
const Product = require('../models/product');
const Category = require('../models/category');
const Provider = require('../models/provider');
const Unit = require('../models/unit');
const Inventory = require('../models/inventory');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/'); 
    },
    filename: function (req, file, cb) {
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// 1. GET: Danh sách Sản phẩm (CÓ TÌM KIẾM & LỌC)
router.get('/', async (req, res) => {
    try {
        const selectedCategory = req.query.category;
        const searchQuery = req.query.search; // Bắt từ khóa tìm kiếm

        // Xây dựng bộ điều kiện tìm kiếm ban đầu (chưa bị xóa)
        let filterConditions = { isDeleted: false };
        
        // 1. Nếu có lọc theo danh mục
        if (selectedCategory && selectedCategory !== 'all') {
            filterConditions.category = selectedCategory;
        }

        // 2. Nếu có gõ từ khóa tìm kiếm
        if (searchQuery) {
            filterConditions.$or = [
                // Tìm kiếm gần đúng (chứa từ khóa) và không phân biệt hoa thường ('i')
                { productName: { $regex: searchQuery, $options: 'i' } },
                { productID: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const products = await Product.find(filterConditions)
            .populate('category', 'categoryName')
            .populate('provider', 'name') // Sửa lại thành providerName nếu Schema bạn quy định thế
            .populate('unit', 'unitName')
            .sort({ productID: 1 });
            
        const categories = await Category.find({ isDeleted: false });

        res.render('product', { 
            title: 'Quản lý Sản phẩm', 
            products: products,
            categories: categories,
            selectedCategory: selectedCategory,
            searchQuery: searchQuery || '' // Truyền lại từ khóa ra giao diện để giữ chữ vừa gõ
        });
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi tải danh sách sản phẩm!'); 
    }
});

// 2. GET: Form Thêm Sản phẩm
router.get('/them', async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        const providers = await Provider.find({ isDeleted: false });
        const units = await Unit.find({ isDeleted: false });

        res.render('product_them', { 
            title: 'Thêm Sản phẩm mới',
            categories, providers, units
        });
    } catch (error) { res.status(500).send('Lỗi khi tải form thêm!'); }
});

// 3. POST: Xử lý Thêm (upload.single('image') để hứng file ảnh)
router.post('/them', upload.single('image'), async (req, res) => {
    try {
        let imagePath = '';
        if (req.file) {
            imagePath = '/images/' + req.file.filename; // Lấy tên file lưu vào DB
        }

        const newProduct = new Product({
            productName: req.body.productName,
            price: req.body.price,
            category: req.body.category,
            provider: req.body.provider,
            unit: req.body.unit,
            image: imagePath // Lưu đường dẫn
        });
        await newProduct.save();
        res.redirect('/product');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi thêm sản phẩm!'); 
    }
});

// 4. GET: Form Sửa Sản phẩm
router.get('/sua/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if(!product) return res.redirect('/product');

        const categories = await Category.find({ isDeleted: false });
        const providers = await Provider.find({ isDeleted: false });
        const units = await Unit.find({ isDeleted: false });

        res.render('product_sua', { 
            title: 'Sửa Sản phẩm', 
            product, categories, providers, units 
        });
    } catch (error) { res.status(500).send('Lỗi khi tải thông tin sửa!'); }
});

// 5. POST: Xử lý Sửa
router.post('/sua/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            productName: req.body.productName,
            price: req.body.price,
            category: req.body.category,
            provider: req.body.provider,
            unit: req.body.unit
        };

        
        if (req.file) {
            updateData.image = '/images/' + req.file.filename;
        }

        await Product.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/product');
    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi cập nhật sản phẩm!'); 
    }
});

// 6. GET: Xóa mềm
router.get('/xoa/:id', async (req, res) => {
    try {
        const currentUser = res.locals.currentUser || (req.session ? req.session.user : null) || req.user;
        
        
        if (currentUser && currentUser.role !== 'admin') {
            return res.send('<script>alert("Chỉ Admin mới có quyền xóa sản phẩm!"); window.location.href="/product";</script>');
        }

        const productId = req.params.id;

        // 2. KHIÊN BẢO VỆ 2: Kiểm tra kho hàng
        const checkStock = await Inventory.findOne({ product: productId });
        if (checkStock && checkStock.quantity > 0) {
            return res.send(`
                <script>
                    alert('Thiết bị này vẫn còn tồn [ ${checkStock.quantity} ] cái trong kho!\\nVui lòng xuất hết hàng về 0 trước khi xóa.');
                    window.location.href="/product"; 
                </script>
            `);
        }

        // 3. Vượt qua 2 khiên -> Thi hành án (Xóa mềm)
        await Product.findByIdAndUpdate(productId, { isDeleted: true });
        res.redirect('/product');

    } catch (error) { 
        console.error(error);
        res.status(500).send('Lỗi khi xóa sản phẩm!'); 
    }
});

module.exports = router;