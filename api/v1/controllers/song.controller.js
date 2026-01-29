
module.exports.search = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Please enter the song name." });
    try {
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const formattedSongs = data.data.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist.name,
            cover: song.album.cover_medium,
            preview: song.preview
        }));
        res.status(200).json(formattedSongs);
    } catch (error) { res.status(500).json({ message: "Song search error" }); }
}