module.exports.external = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ data: [] });

        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        res.json(data); 
        
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Error when calling Deezer API", details: error.message });
    }
}