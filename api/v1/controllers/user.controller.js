const Song = require("../models/song.model");
const Album = require("../models/album.model");
const Artist = require("../models/artist.model");
const Playlist = require("../models/playlist.model");
const User = require("../models/user.model");
const admin = require('firebase-admin');

module.exports.register = async (req, res) => {
  const { uid, email, displayName, photoURL, provider, role } = req.body;

  try {
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
            albums: [],
            artists: []
          }
        },
        state: 'online',
        lastSeen: new Date()
      },
      { new: true, upsert: true }
    );

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "MongoDB synchronization error", error: error.message });
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
    const userId = req.user.uid;

    const updatedUser = await User.findOneAndUpdate(
      { uid: userId },
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
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email already exists in the system!"
      });
    }

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true,
    });

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

module.exports.updateUser = async (req, res) => {
  const { uid } = req.params;
  const { displayName, role } = req.body;

  try {
    const updateData = { displayName, role };

    if (req.body.photoURL) {
      updateData.photoURL = req.body.photoURL;
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid: uid },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found in Database!" });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully!",
      data: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.deleteUser = async (req, res) => {
  const { uid } = req.params;

  try {
    try {
      await admin.auth().deleteUser(uid);
    } catch (fbError) {
      console.error("Firebase Delete Error (User might not exist on FB):", fbError.message);
    }

    const deletedUser = await User.findOneAndDelete({ uid: uid });

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found in Database!" });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully!"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.toggleFavorite = async (req, res) => {
  const { uid, type, itemId } = req.body;

  try {
    const validTypes = ['songs', 'albums', 'playlists', 'artists'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid favorite type" });
    }

    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: "The user does not exist." });

    const favoriteList = user.favorites[type];
    const index = favoriteList.indexOf(itemId);

    const isExternal = String(itemId).startsWith('dz_');

    if (index > -1) {
      favoriteList.splice(index, 1);

      if (type === 'songs' && !isExternal) {
        await Song.findByIdAndUpdate(itemId, {
          $pull: { like: user._id }
        });
      } else if (type !== 'songs') {
        let TargetModel = type === 'albums' ? Album : (type === 'artists' ? Artist : Playlist);
        if (TargetModel) {
          await TargetModel.findByIdAndUpdate(itemId, { $pull: { like: user._id } });
        }
      }
    } else {
      favoriteList.push(itemId);

      if (type === 'songs' && !isExternal) {
        await Song.findByIdAndUpdate(itemId, {
          $addToSet: { like: user._id }
        });
      } else if (type !== 'songs') {
        let TargetModel = type === 'albums' ? Album : (type === 'artists' ? Artist : Playlist);
        if (TargetModel) {
          await TargetModel.findByIdAndUpdate(itemId, { $addToSet: { like: user._id } });
        }
      }
    }

    user.markModified('favorites');
    await user.save();

    res.status(200).json({
      success: true,
      updatedFavorites: user.favorites[type]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};