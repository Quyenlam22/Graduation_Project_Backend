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

        // 2. Gọi API Deezer để tìm bài hát mới
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        const deezerData = await response.json();
        const deezerSongs = deezerData.data || [];

        // 3. Xử lý gộp dữ liệu: Ưu tiên Mongo trước, Deezer sau
        // Bước 3.1: Dùng toàn bộ kết quả từ MongoDB làm gốc của mảng
        const finalResult = [...mongoSongs];

        // Bước 3.2: Tạo một Set chứa deezerId đã có trong Mongo để lọc trùng nhanh
        const existingIds = new Set(mongoSongs.map(s => s.deezerId.toString()));

        // Bước 3.3: Duyệt kết quả Deezer, chỉ thêm bài nào CHƯA có trong Mongo
        deezerSongs.forEach(item => {
            const deezerIdStr = item.id.toString();
            
            if (!existingIds.has(deezerIdStr)) {
                finalResult.push({
                    _id: null, // Đánh dấu chưa có trong DB nội bộ
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
                    isExternal: true // Flag để FE phân biệt dữ liệu ngoài
                });
            }
        });

        // 4. Trả về mảng: [Dữ liệu Mongo] tiếp nối là [Dữ liệu Deezer mới]
        res.status(200).json(finalResult);

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: "Lỗi khi tìm kiếm bài hát." });
    }
};