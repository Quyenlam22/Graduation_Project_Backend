const Song = require("../models/song.model");

module.exports.search = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm." });

    try {
        // 1. Tìm trong MongoDB nội bộ (Ưu tiên hàng đầu)
        const mongoSongs = await Song.find({
            $or: [
                { title: { $regex: query, $options: "i" } },
                { artistName: { $regex: query, $options: "i" } }
            ],
            deleted: false
        }).lean();

        // 2. Gọi API Deezer Search để lấy mảng so khớp nhanh
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        const deezerData = await response.json();
        const deezerSongs = deezerData.data || [];
        const deezerMap = new Map(deezerSongs.map(item => [item.id.toString(), item]));

        // 3. Xử lý cập nhật Audio cho 100% bài từ Mongo
        const updatedMongoSongs = await Promise.all(mongoSongs.map(async (song) => {
            const deezerIdStr = song.deezerId.toString();
            
            // Trường hợp 1: Có sẵn trong kết quả Search (Nhanh)
            if (deezerMap.has(deezerIdStr)) {
                return {
                    ...song,
                    audio: deezerMap.get(deezerIdStr).preview
                };
            }

            // Trường hợp 2: Không có trong Search -> Gọi API Track chi tiết (Chắc chắn có link mới)
            try {
                const trackRes = await fetch(`https://api.deezer.com/track/${deezerIdStr}`);
                const trackData = await trackRes.json();
                if (trackData && trackData.preview) {
                    return {
                        ...song,
                        audio: trackData.preview
                    };
                }
            } catch (err) {
                console.error(`Không thể refresh bài ${song.title}:`, err.message);
            }
            
            return song; // Trả về gốc nếu mọi cách đều lỗi
        }));

        // 4. Lấy danh sách ID đã xử lý để lọc trùng với dữ liệu ngoài
        const existingIds = new Set(updatedMongoSongs.map(s => s.deezerId.toString()));

        // 5. Gom các bài hát mới hoàn toàn từ Deezer
        const externalSongs = deezerSongs
            .filter(item => !existingIds.has(item.id.toString()))
            .map(item => ({
                _id: null,
                title: item.title,
                cover: item.album.cover_xl || item.album.cover_medium,
                artistName: item.artist.name,
                artistId: item.artist.id.toString(),
                albumName: item.album.title,
                albumId: item.album.id.toString(),
                artistAvatar: item.artist.picture_medium,
                deezerId: item.id,
                duration: item.duration,
                audio: item.preview,
                status: "active",
                like: [],
                listen: 0,
                isExternal: true 
            }));

        // Trả về kết quả cuối cùng
        res.status(200).json([...updatedMongoSongs, ...externalSongs]);

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: "Lỗi khi tìm kiếm bài hát." });
    }
};

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
    const { title, artistName, albumName, duration, audio, lyrics, status, cover } = req.body;
    
    // Sau này có thể thêm check bằng dezzerId
    if (title) {
      const existSong = await Song.findOne({ title, deleted: false });
      if (existSong) return res.status(400).json({ success: false, message: "This title song already exists!" });
    }

    const newSong = new Song({
      title,
      artistName,
      albumName,
      duration,
      audio,
      lyrics,
      status,
    //   deezerId,
      cover
    });

    await newSong.save();

    res.status(201).json({
      success: true,
      message: "New song created successfully!",
      data: newSong
    });
  } catch (error) {
    console.error("Create Song Error:", error);
    res.status(500).json({
      success: false,
      message: "System error while creating song."
    });
  }
};

module.exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, artistName, albumName, duration, audio, lyrics, status, cover } = req.body;

  try {
    const updateData = { 
      title, 
      artistName, 
      albumName, 
      duration, 
      audio, 
      lyrics, 
      status 
    };

    if (cover) {
      updateData.cover = cover;
    }

    // Kiểm tra trùng tên với bài hát khác (trừ chính nó)
    if (title) {
      const existSong = await Song.findOne({ 
        title, 
        _id: { $ne: id }, 
        deleted: false 
      });
      if (existSong) {
        return res.status(400).json({ 
          success: false, 
          message: "This title song already exists!" 
        });
      }
    }

    const updatedSong = await Song.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedSong) {
      return res.status(404).json({ success: false, message: "Song not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Song updated successfully!",
      data: updatedSong
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.status(200).json({
      success: true,
      message: "Song deleted successfully!"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};