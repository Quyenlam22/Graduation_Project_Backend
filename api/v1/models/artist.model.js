const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    avatar: String,
    
    // ID từ Deezer để tránh trùng lặp khi cào data
    deezerId: { type: Number, unique: true, sparse: true },
    
    // Mảng lưu ID của những người dùng nhấn Like/Follow nghệ sĩ này
    like: {
        type: [String],
        default: []
    },

    // Số fan lấy từ Deezer (có thể dùng để sắp xếp nghệ sĩ nổi bật)
    nb_fan: { type: Number, default: 0 },

    status: { 
        type: String, 
        enum: ["active", "inactive"], 
        default: "active" 
    },
    
    slug: {
        type: String,
        slug: ["name", "deezerId"], // Sửa lại thành name vì Artist không có trường title
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

// Index để tìm kiếm tên nghệ sĩ nhanh hơn
artistSchema.index({ name: 'text' });

const Artist = mongoose.model('Artist', artistSchema, "artists");

module.exports = Artist;