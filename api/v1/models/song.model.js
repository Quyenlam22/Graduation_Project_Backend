const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const songSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    cover: String,

    // Nếu có bảng Artist riêng thì dùng ref, nếu không thì giữ như dưới nhưng thêm ID
    artistId: { type: String, index: true }, // ID từ Deezer để dễ sync
    artistName: String,
    artistAvatar: String,
    
    albumId: String, // ID Album từ Deezer
    albumName: String,

    // Deezer cung cấp ID bài hát gốc, nên lưu lại để tránh trùng lặp khi cào data
    deezerId: { type: Number, unique: true }, 

    duration: Number, // Thời lượng (giây) - Rất quan trọng để hiển thị player
    
    // Thể loại: Deezer thường trả về mảng các thể loại
    genres: [{
        genreId: String,
        name: String
    }],

    like: {
        type: [String], // Mảng chứa ID của những User đã thích
        default: []
    },

    listen: {
        type: Number,
        default: 0,
        index: true // Đánh index để sắp xếp bài hát hot nhanh hơn
    },

    lyrics: { type: String, default: "" },
    audio: { type: String, required: true }, // Link stream bài hát
    
    status: { 
        type: String, 
        enum: ["active", "inactive"], 
        default: "active" 
    },

    slug: {
        type: String,
        slug: ["title", "deezerId"],
        unique: true
    },

    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
}, {
    timestamps: true
});

// Tạo index để tìm kiếm nhanh theo tên bài hát và nghệ sĩ
songSchema.index({ title: 'text', artistName: 'text' });

const Song = mongoose.model('Song', songSchema, "songs");

module.exports = Song;