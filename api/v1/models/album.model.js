const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    avatar: String, // Ảnh bìa album (cover)
    description: String,
    
    // ID từ Deezer để đồng bộ
    deezerId: { type: Number, unique: true, sparse: true }, 
    
    // Thông tin nghệ sĩ sở hữu album
    artistName: String,
    artistId: String,

    // Số lượng bài hát trong album
    nb_tracks: { type: Number, default: 0 },

    // Mảng lưu ID người dùng thích album này
    like: {
        type: [String],
        default: []
    },

    status: { 
        type: String, 
        enum: ["active", "inactive"], 
        default: "active" 
    },
    
    slug: {
        type: String,
        slug: ["title", "deezerId"], // Kết hợp để đảm bảo duy nhất
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

const Album = mongoose.model('Album', albumSchema, "albums");

module.exports = Album;