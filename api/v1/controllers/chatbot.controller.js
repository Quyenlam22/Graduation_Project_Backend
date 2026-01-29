const Chat = require("../models/chatbot.model");

module.exports.chatbot = async (req, res) => {
  try {
    
    const { role, text, image } = req.body;
    if (!text?.trim() && !image) {
      return res.status(400).json({ error: "Message required" });
    }

    console.log(req.body);
    

    const chatHistory = await Chat.find({})
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    // Chuẩn bị dữ liệu gửi cho Gemini
    const contents = [
      ...chatHistory.map(msg => ({
        role: msg.role,
        parts: [
          ...(msg.text ? [{ text: msg.text }] : []),
          ...(msg.image ? [{ text: `Image URL: ${msg.image}` }] : [])
        ]
      })),
      {
        role: role || "user",
        parts: [
          ...(text ? [{ text }] : []),
          ...(image ? [{ text: `Image URL: ${image}` }] : [])
        ]
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );
    
    if (!response.ok) {
      const errData = await response.text();
      console.error("Gemini API HTTP error:", response.status, errData);
      return res.status(response.status).json({ error: "Gemini API HTTP error", raw: errData });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("Gemini empty reply:", data);
      return res.status(500).json({ error: "Gemini don't reply", raw: data });
    }

    const content = await Chat.insertMany([
      { role: "user", text, imageUrl: image },
      { role: "model", text: reply }
    ]);

    const count = await Chat.countDocuments();
    if (count > 100) {
      const excess = count - 100;
      const oldMessages = await Chat.find()
        .sort({ createdAt: 1 })
        .limit(excess)
        .select("_id");
      const ids = oldMessages.map(msg => msg._id);
      await Chat.deleteMany({ _id: { $in: ids } });
    }


    res.json(content);
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Gemini API failed", details: error.message });
  }
};