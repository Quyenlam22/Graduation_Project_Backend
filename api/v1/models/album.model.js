const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    avatar: String,
    description: String,

    deezerId: { type: String, unique: true, sparse: true },

    artistName: String,
    artistId: String,

    nb_tracks: { type: Number, default: 0 },

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

const Album = mongoose.model('Album', albumSchema, "albums");

module.exports = Album;