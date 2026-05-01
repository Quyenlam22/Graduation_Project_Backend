const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const songSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    cover: String,

    artistId: { type: String, index: true },
    artistName: String,
    artistAvatar: String,

    albumId: String,
    albumName: String,

    deezerId: { type: Number, unique: true, sparse: true },

    duration: Number,

    genres: [{
        genreId: String,
        name: String
    }],

    like: {
        type: [String],
        default: []
    },

    listen: {
        type: Number,
        default: 0,
        index: true
    },

    lyrics: { type: String, default: "" },
    audio: { type: String, required: true },

    mood: [{
        en: { type: String, trim: true },
        vi: { type: String, trim: true }
    }],

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

songSchema.index({ title: 'text', artistName: 'text' });

const Song = mongoose.model('Song', songSchema, "songs");

module.exports = Song;