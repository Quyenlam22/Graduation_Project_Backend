const mongoose = require("mongoose");
const Album = require("../models/album.model");
const Song = require("../models/song.model");
const Playlist = require("../models/playlist.model");

// const moodList = [
//     { en: "Chill", vi: "Thư giãn" },
//     { en: "Sad", vi: "Buồn" },
//     { en: "Energetic", vi: "Sôi động" },
//     { en: "Romantic", vi: "Lãng mạn" },
//     { en: "Happy", vi: "Vui vẻ" },
//     { en: "Focus", vi: "Tập trung" },
//     { en: "Deep", vi: "Sâu lắng" }
// ];

module.exports.getAllSongs = async (req, res) => {
  try {
    const songs = await Song.find({ deleted: false }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Get the playlist of successful songs!",
      data: songs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Err0r Server: " + error.message
    });
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.deezerId) {
      delete data.deezerId;
    }

    if (data.title) {
      const existSong = await Song.findOne({ title: data.title, deleted: false });
      if (existSong) {
        return res.status(400).json({
          success: false,
          message: "This title song already exists!"
        });
      }
    }

    const newSong = new Song(data);
    await newSong.save();

    // --- LOGIC CẬP NHẬT ALBUM ---
    if (newSong.albumId) {
      await Album.findByIdAndUpdate(newSong.albumId, {
        $inc: { nb_tracks: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: "New song created successfully!",
      data: newSong
    });
  } catch (error) {
    console.error("Create Song Error:", error);
    res.status(500).json({
      success: false,
      message: "System error: " + error.message
    });
  }
};

module.exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    artistName,
    artistId,
    albumName,
    albumId,
    duration,
    audio,
    lyrics,
    status,
    cover,
    deezerId
  } = req.body;

  try {
    // 1. Tìm thông tin bài hát hiện tại trước khi update để lấy albumId cũ
    const currentSong = await Song.findById(id);
    if (!currentSong) {
      return res.status(404).json({ success: false, message: "Song not found!" });
    }

    const oldAlbumId = currentSong.albumId;
    const newAlbumId = albumId;

    const updateData = {
      title,
      artistName,
      artistId,
      albumName,
      albumId,
      duration,
      audio,
      lyrics,
      status,
      deezerId
    };

    if (cover) {
      updateData.cover = cover;
    }

    if (title) {
      const existSong = await Song.findOne({
        title,
        _id: { $ne: id },
        deleted: false
      });
      if (existSong) {
        return res.status(400).json({ success: false, message: "This title song already exists!" });
      }
    }

    const updatedSong = await Song.findByIdAndUpdate(id, updateData, { new: true });

    // 3. LOGIC CẬP NHẬT SỐ LƯỢNG TRACK TRONG ALBUM
    if (oldAlbumId !== newAlbumId) {

      // Giảm số track ở Album cũ (nếu trước đó bài hát có thuộc album)
      if (oldAlbumId) {
        await Album.findByIdAndUpdate(oldAlbumId, { $inc: { nb_tracks: -1 } });
      }

      // Tăng số track ở Album mới (nếu bài hát mới được gán vào album)
      if (newAlbumId) {
        await Album.findByIdAndUpdate(newAlbumId, { $inc: { nb_tracks: 1 } });
      }
    }

    res.status(200).json({
      success: true,
      message: "Song updated and album tracks synced!",
      data: updatedSong
    });

  } catch (error) {
    console.error("Update Song Error:", error);
    res.status(500).json({ success: false, message: "Err0r Server: " + error.message });
  }
};

module.exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Thực hiện xóa mềm bài hát
    const deletedSong = await Song.findByIdAndUpdate(
      id,
      {
        deleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!deletedSong) {
      return res.status(404).json({ success: false, message: "Song not found!" });
    }

    // --- LOGIC CẬP NHẬT ALBUM ---
    if (deletedSong.albumId) {
      await Album.findByIdAndUpdate(deletedSong.albumId, {
        $inc: { nb_tracks: -1 }
      });
    }

    await Playlist.updateMany(
      { songs: id },
      {
        $pull: { songs: id }
      }
    );

    res.status(200).json({
      success: true,
      message: "Song deleted successfully and album tracks updated!"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.getPreview = async (req, res) => {
  try {
    const { deezerId } = req.params;
    if (!deezerId) return res.status(400).json({ success: false, message: "Missing ID" });

    const idStr = String(deezerId);

    // 1. ƯU TIÊN KIỂM TRA NHẠC NỘI BỘ (LOCAL) TRƯỚC
    // Nếu là một mã ObjectId hợp lệ của MongoDB
    if (mongoose.Types.ObjectId.isValid(idStr) && !idStr.startsWith('dz_')) {
      const song = await Song.findById(idStr);

      // SỬA TẠI ĐÂY: Dùng song.audio thay vì song.src
      if (song && song.audio) {
        return res.json({
          success: true,
          preview: song.audio,
          source: 'local'
        });
      }
    }

    // 2. TRƯỜNG HỢP NHẠC NGOẠI (DEEZER)
    // Nếu bắt đầu bằng dz_ hoặc là một dãy số thuần túy (deezerId)
    const cleanId = idStr.replace('dz_', '');
    const isPureNumber = /^\d+$/.test(cleanId);

    if (idStr.startsWith('dz_') || isPureNumber) {
      // Gọi API Deezer với User-Agent để tránh bị chặn (lỗi HTML <!DOCTYPE)
      const response = await fetch(`https://api.deezer.com/track/${cleanId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const data = await response.json();

      if (data && data.preview) {
        return res.json({
          success: true,
          preview: data.preview,
          source: 'deezer'
        });
      }
    }

    res.status(404).json({ success: false, message: "Không tìm thấy nguồn nhạc hợp lệ." });

  } catch (error) {
    console.error("Preview Error:", error);
    res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
  }
};

module.exports.getFavorites = async (req, res) => {
  try {
    const { ids } = req.body; // ids: ["65abc...", "dz_141339819", ...]
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    // 1. Phân loại ID
    const localIds = ids.filter(id => !String(id).startsWith('dz_'));
    const deezerIds = ids
      .filter(id => String(id).startsWith('dz_'))
      .map(id => id.replace('dz_', ''));

    // 2. Lấy nhạc Local từ Database của bạn
    const localSongs = await Song.find({
      _id: { $in: localIds },
      deleted: false
    }).lean(); // Dùng .lean() để dễ dàng thêm trường 'source'

    // Gắn thêm flag source để Frontend nhận biết
    const formattedLocal = localSongs.map(s => ({ ...s, source: 'local' }));

    // 3. Gọi trực tiếp API Deezer cho các bài nhạc ngoại
    // Dùng Promise.all để gọi tất cả các ID Deezer cùng lúc (tối ưu tốc độ)
    const deezerPromises = deezerIds.map(async (id) => {
      try {
        const response = await fetch(`https://api.deezer.com/track/${id}`);
        const data = await response.json();

        if (data && !data.error) {
          return {
            _id: `dz_${data.id}`,
            title: data.title,
            artistName: data.artist.name,
            cover: data.album.cover_medium,
            src: data.preview,
            duration: data.duration,
            source: 'deezer'
          };
        }
        return null;
      } catch (err) {
        console.error(`Error fetching Deezer ID ${id}:`, err);
        return null;
      }
    });

    const deezerResults = await Promise.all(deezerPromises);
    const formattedDeezer = deezerResults.filter(s => s !== null);

    res.json({
      success: true,
      data: [...formattedLocal, ...formattedDeezer]
    });

  } catch (error) {
    console.error("Get Favorites Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};