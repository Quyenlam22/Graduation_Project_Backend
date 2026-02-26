const Playlist = require("../models/playlist.model");

// [GET] /api/playlists
module.exports.getAllPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({ deleted: false })
            .populate('songs') 
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: playlists
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [POST] /api/playlists/create
module.exports.create = async (req, res) => {
    try {
        const data = req.body;

        // Xử lý Parse mảng songs từ String sang Array
        if (data.songs) {
            data.songs = JSON.parse(data.songs);
        }

        const newPlaylist = new Playlist(data);
        await newPlaylist.save();

        res.status(201).json({
            success: true,
            message: "Playlist created successfully!",
            data: newPlaylist
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [PATCH] /api/playlists/update/:id
module.exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Xử lý Parse mảng songs từ String sang Array tương tự create
        if (updateData.songs) {
            updateData.songs = JSON.parse(updateData.songs);
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedPlaylist) {
            return res.status(404).json({ success: false, message: "Playlist not found!" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Update successful!", 
            data: updatedPlaylist 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [DELETE] /api/playlists/delete/:id
module.exports.delete = async (req, res) => {
    try {
        const deletedPlaylist = await Playlist.findByIdAndUpdate(
            req.params.id, 
            { deleted: true, deletedAt: new Date() }, // Nên thêm deletedAt để đối soát
            { new: true }
        );

        if (!deletedPlaylist) {
            return res.status(404).json({ success: false, message: "Playlist not found!" });
        }

        res.status(200).json({ success: true, message: "Playlist deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};