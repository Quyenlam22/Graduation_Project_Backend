module.exports.search = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Please enter the artist name." });
    try {
        const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const formattedArtists = data.data.map(artist => ({
            id: artist.id,
            name: artist.name,
            picture: artist.picture_medium,
            nb_fan: artist.nb_fan
        }));
        res.status(200).json(formattedArtists);
    } catch (error) { res.status(500).json({ message: "Artist search error" }); }
}

module.exports.getSongs = async (req, res) => {
    const { id } = req.params;
    try {
        const response = await fetch(`https://api.deezer.com/artist/${id}/top?limit=10`);
        const data = await response.json();
        res.status(200).json(data.data);
    } catch (error) { res.status(500).json({ message: "Error in using artist's song" }); }
}