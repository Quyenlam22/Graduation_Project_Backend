const Playlist = require("../models/playlist.model");
const Song = require("../models/song.model");

module.exports.syncPlaylists = async (req, res) => {
    try {
        // Ví dụ: Gom các bài hát theo ArtistName để tạo Playlist theo nghệ sĩ
        const topArtists = await Song.aggregate([
            { $group: { _id: "$artistName", songs: { $push: "$_id" }, cover: { $first: "$cover" } } },
            { $limit: 5 }
        ]);

        const upsertPromises = topArtists.map(artist => {
            return Playlist.findOneAndUpdate(
                { title: `Best songs of ${artist._id}` },
                {
                    $set: {
                        title: `Best of ${artist._id}`,
                        avatar: artist.cover,
                        description: `The best songs of ${artist._id}`,
                        songs: artist.songs.slice(0, 10) // Lấy tối đa 10 bài
                    }
                },
                { upsert: true, new: true }
            );
        });

        const results = await Promise.all(upsertPromises);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "Playlist sync error" });
    }
};