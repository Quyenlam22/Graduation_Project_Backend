const Album = require("../models/album.model");
const Song = require("../models/song.model");

// [GET] /api/albums
module.exports.getAllAlbums = async (req, res) => {
  try {
    const albums = await Album.find({ deleted: false }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: albums
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/albums/create
module.exports.create = async (req, res) => {
  try {
    const newAlbum = new Album(req.body);

    await newAlbum.save();
    res.status(201).json({ success: true, message: "Album created successfully!", data: newAlbum });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PATCH] /api/albums/update/:id
module.exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const dataUpdate = { ...req.body };

    const updatedAlbum = await Album.findByIdAndUpdate(id, dataUpdate, { new: true });

    if (!updatedAlbum) {
      return res.status(404).json({ success: false, message: "No album found!" });
    }

    await Song.updateMany(
      { albumId: id },
      {
        $set: {
          albumName: updatedAlbum.title
        }
      }
    );

    res.status(200).json({
      success: true,
      message: "Album and related songs updated successfully!",
      data: updatedAlbum
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/albums/delete/:id
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const deletedAlbum = await Album.findByIdAndUpdate(
      id,
      {
        deleted: true,
        deletedAt: now
      },
      { new: true }
    );

    if (!deletedAlbum) {
      return res.status(404).json({ success: false, message: "Album not found!" });
    }

    await Song.updateMany(
      { albumId: id },
      {
        $set: {
          albumId: null,
          albumName: ""
        }
      }
    );

    res.status(200).json({
      success: true,
      message: "Album deleted successfully. Related songs are now independent (Singles)!"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.getAlbumsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    const albums = await Album.find({
      _id: { $in: ids },
      deleted: false
    });
    res.json({ success: true, data: albums });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error retrieving album list!" });
  }
};