const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

mongoose.plugin(slug);

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    avatar: String,

    deezerId: { type: String, unique: true, sparse: true },

    like: {
        type: [String],
        default: []
    },

    nb_fan: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },

    slug: {
        type: String,
        slug: ["name", "deezerId"],
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

artistSchema.index({ name: 'text' });

const Artist = mongoose.model('Artist', artistSchema, "artists");

module.exports = Artist;