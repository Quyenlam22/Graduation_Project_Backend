// const Stream = require("../models/stream.model");
const Song = require("../models/song.model");
const User = require("../models/user.model");
const Artist = require("../models/artist.model");
const Album = require("../models/album.model");
const Playlist = require("../models/playlist.model");

module.exports.getStats = async (req, res) => {
    try {
        const [totalSongs, totalUsers, totalArtists, totalAlbums, totalPlaylists, topLikedSongs, userGrowth] = await Promise.all([
            Song.countDocuments({}), 
            User.countDocuments({}),
            Artist.countDocuments({}),
            Album.countDocuments({}),
            Playlist.countDocuments({}), 

            // --- THỐNG KÊ TOP 5 BÀI HÁT TỪ BẢNG SONGS ---
            Song.aggregate([
                { $match: { deleted: false } }, // Chỉ lấy nhạc chưa xóa
                {
                    $project: {
                        title: 1,
                        cover: 1,
                        // Tính toán số lượng like dựa trên độ dài mảng like
                        count: { $size: { $ifNull: ["$like", []] } }, 
                        listen: 1
                    }
                },
                { $sort: { count: -1 } }, // Sắp xếp theo lượt Like giảm dần
                { $limit: 5 }
            ]),

            // Thống kê User theo tháng (Giữ nguyên)
            User.aggregate([
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                counts: { 
                    totalSongs: totalSongs || 0, 
                    totalUsers: totalUsers || 0, 
                    totalArtists: totalArtists || 0, 
                    totalAlbums: totalAlbums || 0, 
                    totalPlaylists: totalPlaylists || 0 
                },
                // Dữ liệu Top Liked Songs lúc này đã có đầy đủ title và cover từ bảng Song
                topLikedSongs: topLikedSongs.map(item => ({
                    _id: item._id,
                    count: item.count,
                    title: item.title,
                    cover: item.cover || "https://static.thenounproject.com/png/17849-200.png"
                })),
                userGrowth
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};