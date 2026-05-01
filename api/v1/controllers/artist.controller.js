const Song = require("../models/song.model");
const Artist = require("../models/artist.model");
const Album = require("../models/album.model");
const Playlist = require("../models/playlist.model");

// [GET] /api/artists
module.exports.getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find({ deleted: false }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: artists
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};

// [POST] /api/artists/create
module.exports.create = async (req, res) => {
  try {
    const { name, deezerId, nb_fan, status, avatar } = req.body;

    const existArtist = await Artist.findOne({ name, deleted: false });
    if (existArtist) {
      return res.status(400).json({ success: false, message: "This artist has existed!" });
    }

    const newArtist = new Artist({
      name,
      deezerId,
      nb_fan,
      status,
      avatar
    });

    await newArtist.save();

    res.status(201).json({
      success: true,
      message: "Another successful artist!",
      data: newArtist
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PATCH] /api/artists/update/:id
module.exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const updatedArtist = await Artist.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedArtist) {
      return res.status(404).json({ success: false, message: "No artist found!" });
    }

    await Song.updateMany(
      { artistId: id },
      {
        $set: {
          artistName: updatedArtist.name,
          artistAvatar: updatedArtist.avatar
        }
      }
    );

    await Album.updateMany(
      { artistId: id },
      {
        $set: {
          artistName: updatedArtist.name
        }
      }
    );

    res.status(200).json({
      success: true,
      message: "Update artist and related songs successfully!",
      data: updatedArtist
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/artists/delete/:id
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const deletedArtist = await Artist.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: now
    });

    if (!deletedArtist) {
      return res.status(404).json({ success: false, message: "No artist found!" });
    }

    const songsOfArtist = await Song.find({ artistId: id, deleted: false }).select("_id");
    const songIds = songsOfArtist.map(song => song._id);

    await Song.updateMany(
      { artistId: id },
      { $set: { deleted: true, deletedAt: now } }
    );

    await Album.updateMany(
      { artistId: id },
      { $set: { deleted: true, deletedAt: now } }
    );

    if (songIds.length > 0) {
      await Playlist.updateMany(
        { songs: { $in: songIds } },
        {
          $pull: { songs: { $in: songIds } }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Artist, related albums, songs removed and Playlists updated successfully!"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.getArtistsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    const artists = await Artist.find({
      _id: { $in: ids },
      deleted: false
    });
    res.json({ success: true, data: artists });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error retrieving artist list!" });
  }
};