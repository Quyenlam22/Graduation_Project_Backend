const Song = require("../models/song.model");
const Artist = require("../models/artist.model");

module.exports.search = async (req, res) => {
    try {
        // 1. Lấy danh sách artistId duy nhất từ bảng Song
        const existingArtistsInSongs = await Song.aggregate([
            { $match: { deleted: false, artistId: { $ne: null } } },
            {
                $group: {
                    _id: "$artistId",
                    name: { $first: "$artistName" },
                    avatar: { $first: "$artistAvatar" }
                }
            }
        ]);

        if (!existingArtistsInSongs.length) {
            return res.status(200).json({ message: "Không tìm thấy dữ liệu nghệ sĩ trong bảng Songs." });
        }

        const finalResults = [];

        // 2. Lặp qua từng nghệ sĩ để đồng bộ thông tin Artist và bài hát
        for (const item of existingArtistsInSongs) {
            const deezerIdStr = item._id.toString();

            // 2.1 Cập nhật thông tin Artist vào DB
            const updatedArtist = await Artist.findOneAndUpdate(
                { deezerId: deezerIdStr },
                {
                    $set: {
                        name: item.name,
                        avatar: item.avatar || "",
                        status: "active"
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            ).lean();

            // 2.2 Gọi API Deezer lấy Top 5 bài hát của nghệ sĩ này
            try {
                const response = await fetch(`https://api.deezer.com/artist/${deezerIdStr}/top?limit=5`);
                const data = await response.json();

                if (data && data.data) {
                    const songUpsertPromises = data.data.map(async (songItem) => {
                        // Khởi tạo các chỉ số ngẫu nhiên cho bài mới
                        const randomListen = Math.floor(Math.random() * 49001) + 1000;
                        const randomLike = Math.floor(Math.random() * 151) + 50;
                        const fakeLikes = Array.from({ length: randomLike }, (_, i) => `fake_uid_${i}`);

                        const songData = {
                            title: songItem.title,
                            cover: songItem.album.cover_xl || songItem.album.cover_medium,
                            artistId: deezerIdStr,
                            artistName: updatedArtist.name,
                            artistAvatar: updatedArtist.avatar,
                            albumId: songItem.album.id.toString(),
                            albumName: songItem.album.title,
                            deezerId: songItem.id,
                            duration: songItem.duration,
                            audio: songItem.preview,
                            status: "active"
                        };

                        return Song.findOneAndUpdate(
                            { deezerId: songItem.id },
                            { 
                                $set: songData,
                                // Chỉ gán lượt nghe/like ảo nếu là bài hát mới hoàn toàn
                                $setOnInsert: { listen: randomListen, like: fakeLikes } 
                            },
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        );
                    });

                    await Promise.all(songUpsertPromises);
                }
            } catch (apiError) {
                console.error(`Không thể lấy bài hát cho artist ${deezerIdStr}:`, apiError.message);
            }

            finalResults.push(updatedArtist);
        }

        // 3. Trả về danh sách nghệ sĩ đã được đồng bộ
        res.status(200).json(finalResults);

    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
};

module.exports.getSongs = async (req, res) => {
    const { id } = req.params; // id ở đây là artistId (deezerId)
    
    try {
        // Truy vấn vào DB để tìm các bài hát có artistId tương ứng
        // Chúng ta sắp xếp theo lượt nghe (listen) giảm dần để lấy các bài hay nhất
        const songs = await Song.find({
            artistId: id,
            deleted: false,
            status: "active"
        })
        .sort({ listen: -1 }) // Ưu tiên các bài hát có nhiều lượt nghe nhất
        .limit(10)            // Giới hạn 10 bài tương đương với API cũ
        .lean();              // Chuyển về Plain Object để xử lý nhanh hơn

        console.log(id);
        

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