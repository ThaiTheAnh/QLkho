var express = require('express');
var app = express();
var mongoose = require('mongoose');
var session = require('express-session'); 

// Gọi các Router
var indexRouter = require('./routers/index');
var userRouter = require('./routers/user');
var providerRouter = require('./routers/provider');
var importstockRouter = require('./routers/importstock');
var exportstockRouter = require('./routers/exportstock');
var inventoryRouter = require('./routers/inventory');
var productRouter = require('./routers/product');
var categoryRouter = require('./routers/category');
var unitRouter = require('./routers/unit');
var authRouter = require('./routers/auth'); 
var requestRouter = require('./routers/request');

// 🌟 GỌI THÊM ROUTER ACTIVITYLOG VÀ MIDDLEWARE
var activitylogRouter = require('./routers/activitylog'); 
const activityLogger = require('./middlewares/activityLogger');
const cron = require('node-cron');

var uri = process.env.MONGODB_URI;

mongoose.connect(uri)
 .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
 .catch(err => console.log(err));

require('./models/Counter');

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. KHỞI TẠO SESSION TRƯỚC TIÊN
app.use(session({
    secret: 'kho_ftel_secret_key_sieu_bao_mat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Phiên đăng nhập sống 1 ngày
}));

// 2. LẤY THÔNG TIN USER GẮN VÀO GIAO DIỆN
app.use((req, res, next) => {
    res.locals.currentUser = req.session.currentUser || null;
    next();
});

// 3. HÀM KIỂM TRA BẢO MẬT
const kiemTraDangNhap = (req, res, next) => {
    if (req.session && req.session.currentUser) {
        return next(); 
    } else {
        return res.redirect('/auth/login'); 
    }
};

// 🌟 ĐẶT MÁY QUÉT LOG Ở ĐÂY: Dưới Session nhưng TRƯỚC các Router chức năng
app.use(activityLogger);

// 4. KHAI BÁO CÁC ĐƯỜNG DẪN (ROUTERS)
app.use('/auth', authRouter);
app.use('/', indexRouter); 
app.use('/user', kiemTraDangNhap, userRouter);
app.use('/provider', kiemTraDangNhap, providerRouter);
app.use('/category', kiemTraDangNhap, categoryRouter);
app.use('/unit', kiemTraDangNhap, unitRouter);
app.use('/product', kiemTraDangNhap, productRouter);
app.use('/inventory', kiemTraDangNhap, inventoryRouter);
app.use('/request', kiemTraDangNhap, requestRouter);
app.use('/importstock', kiemTraDangNhap, importstockRouter);
app.use('/exportstock', kiemTraDangNhap, exportstockRouter); 

// 🌟 KHAI BÁO ĐƯỜNG DẪN TRANG NHẬT KÝ
app.use('/activitylog', kiemTraDangNhap, activitylogRouter);

require('./utils/cronJobs');

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});