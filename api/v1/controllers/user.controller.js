const User = require("../models/user.model");

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