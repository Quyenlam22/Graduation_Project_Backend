// api/v1/middleware/checkAdmin.js

const admin = require('firebase-admin');
const User = require('../models/user.model');

/* =========================
   Firebase Admin Init
========================= */
if (!admin.apps.length) {
  try {
    const rawBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || "";
    
    // 1. Làm sạch chuỗi Base64: Loại bỏ khoảng trắng và xuống dòng
    const cleanBase64 = rawBase64.replace(/\s/g, ''); 
    
    if (!cleanBase64) {
      throw new Error("Biến môi trường GOOGLE_SERVICE_ACCOUNT_BASE64 đang trống!");
    }

    const decodedServiceAccount = Buffer.from(cleanBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    // LOG QUAN TRỌNG: Để bạn đối soát Project ID trên Render Logs
    console.log(">>> Đang khởi tạo Firebase Admin cho Project:", serviceAccount.project_id);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log(">>> Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error(">>> Firebase Admin Init Error:", error.message);
  }
}

/* =========================
   Verify Firebase Token
========================= */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực!' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Xác thực Token và kiểm tra trạng thái thu hồi
    // Tham số 'true' giúp kiểm tra checkRevoked và xử lý lệch múi giờ nhẹ
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    // Gán thông tin user vào request để dùng cho các bước sau
    req.user = decodedToken;
    next();
  } catch (error) {
    // LOG CHI TIẾT LỖI: Để biết chính xác tại sao Signature bị sai
    console.error('>>> Lỗi Verify Token:', error.code, error.message);
    
    // Trả về thông báo lỗi cụ thể để Debug trên Postman dễ hơn
    let errorMessage = 'Token không hợp lệ hoặc lỗi cấu hình server!';
    
    if (error.code === 'auth/id-token-expired') {
        errorMessage = 'Token đã hết hạn, vui lòng đăng nhập lại!';
    } else if (error.code === 'auth/argument-error') {
        errorMessage = 'Cấu hình Firebase (Private Key) không khớp với Token gửi lên!';
    }

    return res.status(403).json({ 
        message: errorMessage,
        debug_info: error.message, // Hiện lỗi gốc của Firebase (VD: Invalid Signature)
        code: error.code 
    });
  }
};

/* =========================
   Check Admin Role
========================= */
const isAdmin = async (req, res, next) => {
  try {
    // 3. Truy vấn User từ MongoDB bằng UID đã được Firebase xác thực
    const user = await User.findOne({ uid: req.user.uid });

    if (user && user.role === 'admin') {
      return next();
    }

    // Nếu không phải Admin thì chặn lại ngay
    return res.status(403).json({
      message: 'Quyền truy cập bị từ chối. Bạn không phải Admin.',
    });
  } catch (error) {
    console.error('>>> Lỗi kiểm tra quyền admin:', error.message);
    return res.status(500).json({ message: 'Lỗi hệ thống khi kiểm tra quyền hạn.' });
  }
};

module.exports = { verifyToken, isAdmin };