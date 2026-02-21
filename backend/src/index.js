import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";

import { initializeSocket } from "./lib/socket.js";

import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import pushSubscriptionRoutes from "./routes/pushSubscription.route.js";
import chatRoutes from "./routes/chat.route.js";
import miscRoutes from "./routes/misc.route.js";
import historyRoutes from "./routes/history.route.js";
import streamRoutes from "./routes/stream.route.js";
import savedItemRoutes from "./routes/savedItem.route.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT;

const httpServer = createServer(app);
initializeSocket(httpServer);

// CORS (dev: allow all; tighten for prod)
app.use(
cors({
origin: (origin, cb) => cb(null, true),
credentials: true,
})
);

app.use(express.json());
app.use(clerkMiddleware());

// File upload
app.use(
fileUpload({
useTempFiles: true,
tempFileDir: path.join(__dirname, "tmp"),
createParentPath: true,
limits: { fileSize: 15 * 1024 * 1024 },
})
);

// Serve general file uploads with proper headers (do this BEFORE routes and SPA fallback)
app.use(
	"/uploads/files",
	cors({ origin: (origin, cb) => cb(null, true) }),
	express.static(path.join(process.cwd(), "uploads", "files"), {
	  setHeaders(res, filePath) {
		const ext = path.extname(filePath).toLowerCase();
		
		// Set proper content types
		const mimeTypes = {
		  '.jpg': 'image/jpeg',
		  '.jpeg': 'image/jpeg',
		  '.png': 'image/png',
		  '.gif': 'image/gif',
		  '.webp': 'image/webp',
		  '.pdf': 'application/pdf',
		  '.doc': 'application/msword',
		  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		  '.xls': 'application/vnd.ms-excel',
		  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		  '.txt': 'text/plain',
		  '.mp3': 'audio/mpeg',
		  '.wav': 'audio/wav',
		  '.ogg': 'audio/ogg',
		  '.webm': 'video/webm',
		  '.mp4': 'video/mp4',
		  '.mov': 'video/quicktime',
		};
		
		if (mimeTypes[ext]) {
		  res.setHeader('Content-Type', mimeTypes[ext]);
		}
		
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
	  },
	})
  );

// Serve voice uploads with proper headers (do this BEFORE routes and SPA fallback)
app.use(
	"/uploads/voice",
	cors({ origin: (origin, cb) => cb(null, true) }),
	express.static(path.join(process.cwd(), "uploads", "voice"), {
	setHeaders(res, filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === ".webm") res.setHeader("Content-Type", "audio/webm;codecs=opus");
	if (ext === ".ogg") res.setHeader("Content-Type", "audio/ogg;codecs=opus");
	if (ext === ".m4a" || ext === ".mp4") res.setHeader("Content-Type", "audio/mp4");
	res.setHeader("Accept-Ranges", "bytes");
	res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
	res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
	},
	})
);

// (optional) serve other /uploads assets if you have any
app.use(
	"/uploads",
	cors({ origin: (origin, cb) => cb(null, true) }),
	express.static(path.join(process.cwd(), "uploads"))
);

// cron jobs
const tempDir = path.join(process.cwd(), "tmp");
cron.schedule("0 * * * *", () => {
if (fs.existsSync(tempDir)) {
fs.readdir(tempDir, (err, files) => {
if (err) return;
for (const file of files) {
fs.unlink(path.join(tempDir, file), () => {});
}
});
}
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/push", pushSubscriptionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/misc", miscRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/library/saved", savedItemRoutes);

// Production static (place AFTER /uploads so SPA doesn’t eat /uploads/voice)
if (process.env.NODE_ENV === "production") {
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*", (req, res) => {
res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
});
}

// error handler
app.use((err, req, res, next) => {
res.status(500).json({
message:
process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
});
});

httpServer.listen(PORT, () => {
// console.log("Server is running on port " + PORT);
connectDB();
});