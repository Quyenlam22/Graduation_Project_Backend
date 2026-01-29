module.exports.search = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Please enter the album name." });
    try {
        const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const formattedAlbums = data.data.map(album => ({
            id: album.id,
            title: album.title,
            cover: album.cover_medium,
            artist: album.artist.name,
            nb_tracks: album.nb_tracks
        }));
        res.status(200).json(formattedAlbums);
    } catch (error) { res.status(500).json({ message: "Album search error" }); }
}

module.exports.getSongs = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await fetch(`https://api.deezer.com/album/${id}/tracks`);
        const data = await response.json();
        res.status(200).json(data.data);
    } catch (error) { res.status(500).json({ message: "Error in using album's song" }); }
}