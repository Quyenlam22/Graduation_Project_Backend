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

    if (oldAlbumId !== newAlbumId) {

      if (oldAlbumId) {
        await Album.findByIdAndUpdate(oldAlbumId, { $inc: { nb_tracks: -1 } });
      }

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

    if (mongoose.Types.ObjectId.isValid(idStr) && !idStr.startsWith('dz_')) {
      const song = await Song.findById(idStr);

      if (song && song.audio) {
        return res.json({
          success: true,
          preview: song.audio,
          source: 'local'
        });
      }
    }

    const cleanId = idStr.replace('dz_', '');
    const isPureNumber = /^\d+$/.test(cleanId);

    if (idStr.startsWith('dz_') || isPureNumber) {
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
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const localIds = ids.filter(id => !String(id).startsWith('dz_'));
    const deezerIds = ids
      .filter(id => String(id).startsWith('dz_'))
      .map(id => id.replace('dz_', ''));

    const localSongs = await Song.find({
      _id: { $in: localIds },
      deleted: false
    }).lean();

    const formattedLocal = localSongs.map(s => ({ ...s, source: 'local' }));

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