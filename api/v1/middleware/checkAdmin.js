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
      throw new Error("The environment variable GOOGLE_SERVICE_ACCOUNT BASE64 is empty!");
    }

    const decodedServiceAccount = Buffer.from(cleanBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    // LOG QUAN TRỌNG: Để bạn đối soát Project ID trên Render Logs
    console.log(">>> Initializing Firebase Admin for the Project:", serviceAccount.project_id);

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
    return res.status(401).json({ message: 'No authentication token found!' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Xác thực Token và kiểm tra trạng thái thu hồi
    // Tham số 'true' giúp kiểm tra checkRevoked và xử lý lệch múi giờ nhẹ
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    // Gán thông tin user vào request để dùng cho các bước sau
    req.user = {
      ...decodedToken,
      id: decodedToken.uid 
    };
    next();
  } catch (error) {
    // LOG CHI TIẾT LỖI: Để biết chính xác tại sao Signature bị sai
    console.error('>>> Token Verification Error:', error.code, error.message);
    
    // Trả về thông báo lỗi cụ thể để Debug trên Postman dễ hơn
    let errorMessage = 'Invalid token or server configuration error!';
    
    if (error.code === 'auth/id-token-expired') {
        errorMessage = 'Your token has expired, please log in again!';
    } else if (error.code === 'auth/argument-error') {
        errorMessage = 'The Firebase configuration (Private Key) does not match the token submitted!';
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
    // Đảm bảo req.user đã tồn tại (do verifyToken gán vào)
    if (!req.user || !req.user.uid) {
        return res.status(401).json({ message: 'The verification information is incomplete!' });
    }

    const user = await User.findOne({ uid: req.user.uid }).select('role'); // Chỉ lấy field role để tối ưu tốc độ

    if (user && user.role === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: 'Access denied. Your account does not have administrator privileges.',
    });
  } catch (error) {
    console.error('>>> Admin privilege check error:', error.message);
    return res.status(500).json({ message: 'System error while checking permissions.' });
  }
};

module.exports = { verifyToken, isAdmin };