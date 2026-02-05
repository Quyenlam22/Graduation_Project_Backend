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
    const { id } = req.params; // id ở đây là albumId (deezerId)
    
    try {
        // Truy vấn vào DB để tìm các bài hát có albumId tương ứng
        // Chúng ta sắp xếp theo lượt nghe (listen) giảm dần để lấy các bài hay nhất
        const songs = await Song.find({
            albumId: id,
            deleted: false,
            status: "active"
        })
        .sort({ listen: -1 }) // Ưu tiên các bài hát có nhiều lượt nghe nhất
        .limit(10)            // Giới hạn 10 bài tương đương với API cũ
        .lean();              // Chuyển về Plain Object để xử lý nhanh hơn

        // Trả về kết quả cho Frontend
        // Lưu ý: Chúng ta trả về mảng rỗng [] nếu không tìm thấy, tránh crash FE
        res.status(200).json(songs);

    } catch (error) {
        console.error("Lỗi lấy bài hát từ DB:", error);
        res.status(500).json({ 
            message: "Lỗi khi truy xuất danh sách bài hát nội bộ", 
            error: error.message 
        });
    }
}