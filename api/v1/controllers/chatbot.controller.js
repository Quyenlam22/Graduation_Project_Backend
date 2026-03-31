const Chat = require("../models/chatbot.model");
const Song = require("../models/song.model");

module.exports.chatbot = async (req, res) => {
  try {
    const { role, text, image } = req.body;
    if (!text?.trim() && !image) {
      return res.status(400).json({ error: "Message required" });
    }

    // --- PHẦN MỚI: XỬ LÝ MOOD ---
    const moodKeywords = [
      { key: "buồn", en: "sad" },
      { key: "vui", en: "happy" },
      { key: "thư giãn", en: "chill" },
      { key: "sôi động", en: "energetic" },
      { key: "tập trung", en: "focus" },
      { key: "lãng mạn", en: "romantic" },
      { key: "sâu lắng", en: "deep" }
    ];

    let moodContext = "";
    const lowerText = text ? text.toLowerCase() : "";

    const detectedMood = moodKeywords.find(m => lowerText.includes(m.key) || lowerText.includes(m.en));

    if (detectedMood) {
      const suggestedSongs = await Song.find({
        $or: [
          { "mood.vi": new RegExp(detectedMood.key, 'i') },
          { "mood.en": new RegExp(detectedMood.en, 'i') }
        ],
        deleted: false,
        status: "active"
      })
        .limit(5)
        .select("title artistName cover _id deezerId"); // QUAN TRỌNG: Lấy thêm _id và deezerId

      if (suggestedSongs.length > 0) {
        const songsMetadata = suggestedSongs.map((s, index) => JSON.stringify({
          type: "song_link",
          index: index + 1,
          title: s.title,
          artist: s.artistName,
          cover: s.cover,
          _id: s._id,
          deezerId: s.deezerId
        }));

        moodContext = `\n[Dữ liệu hệ thống - Metadata]:\n${songsMetadata.join("\n")}`;
      }
    }

    const systemPrompt = `Bạn là Muzia AI Assistant.
QUY TẮC BẮT BUỘC:
1. Khi có danh sách trong [Dữ liệu hệ thống - Metadata], bạn PHẢI liệt kê ĐẦY ĐỦ tất cả các bài hát có trong đó, không được bỏ sót bất kỳ bài nào.Tuyệt đối không được tự ý đưa ra các bài hát khác (như Happy của Pharrell Williams, v.v.) dù bạn biết chúng.
2. Với mỗi bài hát, hãy copy nguyên văn dòng JSON (VD: {"type": "song_link", ...}) sang một dòng mới trong câu trả lời.
3. Tuyệt đối không được thay đổi nội dung bên trong các dấu ngoặc nhọn {}.
4. Luôn bắt đầu bằng một lời dẫn thân thiện và kết thúc bằng một câu hỏi gợi mở.`;
    // --- HẾT PHẦN MOOD ---

    // Giữ nguyên logic lấy lịch sử của bạn
    const chatHistory = await Chat.find({})
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    // Chuẩn bị dữ liệu gửi cho Gemini (Giữ nguyên cấu trúc cũ, chèn systemPrompt vào đầu)
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt + moodContext }]
      },
      ...chatHistory.map(msg => ({
        role: msg.role === "model" ? "model" : "user", // Đảm bảo role đúng chuẩn Gemini
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

    // Giữ nguyên logic lưu và xóa tin nhắn cũ của bạn
    const content = await Chat.insertMany([
      { role: "user", text, image: image }, // Lưu image vào field image như cũ
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