const Album = require("../models/album.model");
const Song = require("../models/song.model");

module.exports.getSongs = async (req, res) => {
    const { id } = req.params; // albumId hoặc artistId (deezerId)

    try {
        // 1. Lấy danh sách bài hát hiện có trong DB nội bộ
        const localSongs = await Song.find({
            $or: [{ albumId: id }, { artistId: id }], // Linh hoạt cho cả Album và Artist
            deleted: false,
            status: "active"
        })
        .sort({ listen: -1 })
        .limit(20) // Bạn có thể tăng giới hạn nếu muốn
        .lean();

        if (localSongs.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Gọi API Deezer để lấy thông tin "tươi" nhất (đặc biệt là link audio)
        // Lưu ý: Tùy vào route bạn gọi là artist hay album mà endpoint sẽ khác nhau
        // Ở đây giả định bạn đang gọi theo Album
        const response = await fetch(`https://api.deezer.com/album/${id}/tracks`);
        const deezerData = await response.json();
        const deezerTracks = deezerData.data || [];

        // 3. Map link audio mới từ Deezer vào dữ liệu local
        // Đồng thời cập nhật link mới vào DB để dùng cho các lần sau (background update)
        const updatedSongs = await Promise.all(localSongs.map(async (localSong) => {
            // Tìm bài hát tương ứng trong danh sách vừa lấy từ Deezer
            const matchTrack = deezerTracks.find(t => t.id == localSong.deezerId);
            
            if (matchTrack && matchTrack.preview) {
                // Nếu link audio cũ khác link mới (đã hết hạn), cập nhật DB
                if (localSong.audio !== matchTrack.preview) {
                    await Song.updateOne(
                        { _id: localSong._id },
                        { $set: { audio: matchTrack.preview } }
                    );
                    localSong.audio = matchTrack.preview; // Cập nhật luôn vào object trả về
                }
            }
            return localSong;
        }));

        // 4. Trả về dữ liệu đã có link audio mới nhất
        res.status(200).json(updatedSongs);

    } catch (error) {
        console.error("Error getSongs & Refresh Link:", error);
        res.status(500).json({ 
            message: "System error", 
            error: error.message 
        });
    }
};

// [GET] /api/albums
module.exports.getAllAlbums = async (req, res) => {
  try {
    const albums = await Album.find({ deleted: false }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: albums
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/albums/create
module.exports.create = async (req, res) => {
  try {
    const newAlbum = new Album(req.body);

    await newAlbum.save();
    res.status(201).json({ success: true, message: "Album created successfully!", data: newAlbum });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PATCH] /api/albums/update/:id
module.exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const dataUpdate = { ...req.body };

    // 1. Cập nhật thông tin Album gốc
    const updatedAlbum = await Album.findByIdAndUpdate(id, dataUpdate, { new: true });

    if (!updatedAlbum) {
      return res.status(404).json({ success: false, message: "No album found!" });
    }

    // 2. LOGIC CẬP NHẬT ĐỒNG BỘ SANG SONG
    await Song.updateMany(
      { albumId: id }, 
      { 
        $set: { 
          albumName: updatedAlbum.title 
        } 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Album and related songs updated successfully!", 
      data: updatedAlbum 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/albums/delete/:id
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    // 1. Thực hiện xóa mềm Album
    const deletedAlbum = await Album.findByIdAndUpdate(
        id, 
        { 
            deleted: true, 
            deletedAt: now 
        },
        { new: true }
    );

    if (!deletedAlbum) {
        return res.status(404).json({ success: false, message: "Album not found!" });
    }

    // 2. GIỮ LẠI BÀI HÁT: Chỉ cập nhật albumId và albumName về null/trống
    await Song.updateMany(
        { albumId: id },
        { 
            $set: { 
                albumId: null,
                albumName: "" 
            } 
        }
    );

    res.status(200).json({ 
        success: true, 
        message: "Album deleted successfully. Related songs are now independent (Singles)!" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.getAlbumsByIds = async (req, res) => {
    try {
        const { ids } = req.body;
        const albums = await Album.find({
            _id: { $in: ids },
            deleted: false
        });
        res.json({ success: true, data: albums });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error retrieving album list!" });
    }
};