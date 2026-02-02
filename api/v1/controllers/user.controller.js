const User = require("../models/user.model");

module.exports.register = async (req, res) => {
  const { uid, email, displayName, photoURL, role } = req.body;

  try {
    // Upsert: Nếu user tồn tại thì cập nhật, chưa có thì tạo mới
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        email, 
        displayName, 
        photoURL,
        $setOnInsert: { role: role || 'user' }, // Chỉ set role khi tạo mới
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
    const { displayName, photoURL } = req.body;
    const userId = req.user.id; // Lấy từ middleware verifyToken (decode từ UID Firebase)

    const updatedUser = await User.findOneAndUpdate(
      { uid: userId }, // Tìm theo UID của Firebase
      { displayName, photoURL },
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