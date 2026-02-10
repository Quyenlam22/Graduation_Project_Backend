const User = require("../models/user.model");
const admin = require('firebase-admin');

module.exports.register = async (req, res) => {
  const { uid, email, displayName, photoURL, provider, role } = req.body;

  try {
    // Upsert: Nếu user tồn tại thì cập nhật, chưa có thì tạo mới
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        email, 
        displayName, 
        photoURL,
        provider,
        $setOnInsert: { 
          role: role || 'user',
          favorites: {
            songs: [],
            artists: [],
            albums: []
          }
        }, // Chỉ set role khi tạo mới
        state: 'online', 
        lastSeen: new Date() 
      },
      { new: true, upsert: true } 
    );
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi đồng bộ MongoDB", error: error.message });
  }
}

module.exports.getInfo = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports.changeStatus = async (req, res) => {
  const { uid, state } = req.body;
  try {
    await User.findOneAndUpdate(
      { uid: uid },
      { 
        state: state, 
        lastSeen: new Date() 
      }
    );
    res.status(200).json({ message: "Status updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports.updateProfile = async (req, res) => {
  try {    
    // photoURL lúc này đã được middleware uploadCloud gán link Cloudinary vào
    const { displayName, photoURL } = req.body; 
    const userId = req.user.uid;
    
    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
      { displayName, photoURL }, // Cập nhật trực tiếp vì photoURL giờ là string link
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select("-favorites");
    
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving user list!",
      error: error.message
    });
  }
};

module.exports.createAdmin = async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    // 1. KIỂM TRA USER ĐÃ TỒN TẠI TRÊN MONGODB CHƯA
    // Kiểm tra email trước để tránh gọi Firebase vô ích
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email already exists in the system!"
      });
    }

    // 2. TẠO TÀI KHOẢN TRÊN FIREBASE AUTH
    // Firebase Admin SDK cũng có cơ chế check email trùng tự động và sẽ quăng lỗi 'auth/email-already-exists'
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true, 
    });

    // 3. LƯU THÔNG TIN VÀO MONGODB
    // Sử dụng UID từ Firebase trả về để đảm bảo tính đồng bộ
    const newUser = new User({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      provider: 'password',
      state: 'offline'
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully!",
      data: {
        uid: newUser.uid,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error(">>> Error When Creating Admin:", error.message);

    // Xử lý trường hợp email đã tồn tại trên Firebase nhưng chưa có trong MongoDB (nếu có lỗi logic trước đó)
    if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({
          success: false,
          message: "This email address has already been used on Firebase Auth!"
        });
    }

    return res.status(400).json({
      success: false,
      message: "System error when creating Admin",
      error: error.message
    });
  }
};