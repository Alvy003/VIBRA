import fs from "fs";
import path from "path";

export async function uploadVoice(req, res) {
try {
if (!req.files || !req.files.audio) {
return res.status(400).json({ error: "No audio file provided" });
}
const audio = req.files.audio; // express-fileupload
const duration = Number(req.body.duration || 0);
// Ensure uploads/voice exists
// Save under project root: /uploads/voice
const voiceDir = path.join(process.cwd(), "uploads", "voice");
if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

// Decide extension from the uploaded file name or mime
const inferExt = () => {
  const nameExt = path.extname(audio.name || "");
  if (nameExt) return nameExt;
  const mime = audio.mimetype || "";
  if (mime.includes("webm")) return ".webm";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("mp4") || mime.includes("m4a")) return ".m4a";
  return ".webm";
};
const ext = inferExt();
const fname = `v_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
const destPath = path.join(voiceDir, fname);

await audio.mv(destPath);

// Build absolute backend URL (so frontend origin 3000 won’t intercept)
const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
const publicUrl = `${base}/uploads/voice/${fname}`;

return res.json({ url: publicUrl, duration: Math.max(0, Math.round(duration)) });
} catch (err) {
    console.error("Voice upload error:", err);
    res.status(500).json({ error: "Upload failed" });
}
}