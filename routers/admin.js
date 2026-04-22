router.get('/logs', async (req, res) => {
    const logs = await ActivityLog.find()
        .populate('user', 'fullName userName')
        .sort({ createdAt: -1 })
        .limit(100); // Lấy 100 hoạt động mới nhất
    res.render('admin/logs', { title: 'Nhật ký hệ thống', logs });
});