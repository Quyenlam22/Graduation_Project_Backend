const Album = require("../models/album.model");
const Song = require("../models/song.model");

module.exports.search = async (req, res) => {
    try {
        // Lấy danh sách albumId duy nhất từ bảng Song
        const existingAlbumsInSongs = await Song.aggregate([
            { $match: { deleted: false, albumId: { $ne: null } } },
            {
                $group: {
                    _id: "$albumId",
                    title: { $first: "$albumName" },
                    cover: { $first: "$cover" }, // Lấy tạm cover từ bài hát
                    artistName: { $first: "$artistName" }
                }
            }
        ]);

        const upsertPromises = existingAlbumsInSongs.map(async (item) => {
            let nbTracks = 0;
            try {
                // Gọi API Deezer để lấy thông tin chi tiết album bao gồm nb_tracks
                const response = await fetch(`https://api.deezer.com/album/${item._id}`);
                const albumDetail = await response.json();
                nbTracks = albumDetail.nb_tracks || 0;
            } catch (e) {
                console.error(`Không thể lấy nb_tracks cho album ${item._id}`);
            }

            const randomLikeCount = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            const fakeLikes = Array.from({ length: randomLikeCount }, (_, i) => `fake_uid_${i}`);

            return Album.findOneAndUpdate(
                { deezerId: item._id.toString() },
                {
                    $set: {
                        title: item.title,
                        avatar: item.cover,
                        artistName: item.artistName,
                        nb_tracks: nbTracks,
                        status: "active"
                    },
                    $setOnInsert: { like: fakeLikes }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        });

        const finalAlbums = await Promise.all(upsertPromises);
        
        // 4. Trả về mảng dữ liệu thật (finalAlbums) thay vì mảng Promise
        res.status(200).json(finalAlbums);
    } catch (error) {
        res.status(500).json({ message: "Lỗi đồng bộ Album", error: error.message });
    }
}

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
        console.error("Lỗi getSongs & Refresh Link:", error);
        res.status(500).json({ 
            message: "Lỗi hệ thống", 
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

    const updatedAlbum = await Album.findByIdAndUpdate(id, dataUpdate, { new: true });
    res.status(200).json({ success: true, message: "Album update successful!", data: updatedAlbum });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/albums/delete/:id
module.exports.delete = async (req, res) => {
  try {
    await Album.findByIdAndUpdate(req.params.id, { 
        deleted: true, 
        deletedAt: new Date() 
    });
    res.status(200).json({ success: true, message: "Album deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};