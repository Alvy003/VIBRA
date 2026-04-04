// controller/recognizeSong.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stream/recognize-song
//
// Accepts a multipart audio file (m4a, mp3, wav, aac, ogg, webm).
// Converts it to raw 16kHz/16-bit mono PCM via ffmpeg, then fingerprints it
// using the Shazam unofficial API (shazam-api package).
//
// shazam.recognizeSong() returns:
//   { title, artist, album, year }  — on success
//   null                            — on no match
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { Shazam, s16LEToSamplesArray } from "shazam-api";

// Point fluent-ffmpeg at the bundled static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

const unlinkAsync = promisify(fs.unlink);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert any audio file to raw 16kHz / 16-bit LE / mono PCM.
 * Returns path to the generated .pcm file in os.tmpdir().
 */
function convertToPcm(inputPath) {
    const outputPath = path.join(
        os.tmpdir(),
        `shazam_${Date.now()}_${Math.random().toString(36).slice(2)}.pcm`
    );

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioCodec("pcm_s16le")
            .format("s16le")
            .on("error", (err) => {
                console.error("[RecognizeSong] ffmpeg conversion error:", err.message);
                reject(err);
            })
            .on("end", () => resolve(outputPath))
            .save(outputPath);
    });
}

/**
 * Safely delete a file (swallows errors — temp cleanup should never crash).
 */
async function safeUnlink(filePath) {
    if (!filePath) return;
    try {
        await unlinkAsync(filePath);
    } catch (_) {
        // ignore
    }
}

// ── Controller ───────────────────────────────────────────────────────────────

export const recognizeSong = async (req, res) => {
    // console.log("[RecognizeSong] Request received. Files:", Object.keys(req.files || {}));

    // express-fileupload stores temp files at req.files.<fieldName>.tempFilePath
    const audioFile = req.files?.audio;

    if (!audioFile) {
        console.warn("[RecognizeSong] No 'audio' field in request.");
        return res.status(400).json({ success: false, message: "No audio file provided." });
    }

    // console.log("[RecognizeSong] File:", audioFile.name, "size:", audioFile.size, "mime:", audioFile.mimetype);

    // Validate size (5 MB hard limit)
    const MAX_BYTES = 5 * 1024 * 1024;
    if (audioFile.size > MAX_BYTES) {
        await safeUnlink(audioFile.tempFilePath);
        return res.status(400).json({ success: false, message: "Audio file too large (max 5 MB)." });
    }

    const inputPath = audioFile.tempFilePath;
    let pcmPath = null;

    try {
        // Step 1 — Convert to raw PCM (16kHz / 16-bit / mono)
        // console.log("[RecognizeSong] Converting to PCM from:", inputPath);
        pcmPath = await convertToPcm(inputPath);
        // console.log("[RecognizeSong] PCM ready:", pcmPath);

        // Step 2 — Read PCM + build samples array
        const pcmBuffer = fs.readFileSync(pcmPath);
        // console.log("[RecognizeSong] PCM buffer size:", pcmBuffer.length, "bytes");

        if (pcmBuffer.length < 1000) {
            console.warn("[RecognizeSong] PCM too small — audio likely too short or empty.");
            return res.json({ success: false, message: "Recording too short. Hold near the speaker for longer." });
        }

        const samples = s16LEToSamplesArray(pcmBuffer);
        // console.log("[RecognizeSong] Samples array length:", samples.length);

        // Step 3 — Shazam recognition
        // recognizeSong() returns { title, artist, album, year } or null
        const shazam = new Shazam();
        // console.log("[RecognizeSong] Sending to Shazam...");
        const result = await shazam.recognizeSong(samples);
        console.log("[RecognizeSong] Shazam result:", JSON.stringify(result));

        if (!result || !result.title) {
            return res.json({ success: false, message: "Song not recognized. Try holding the phone closer to the speaker." });
        }

        return res.json({
            success: true,
            title: result.title,
            artist: result.artist || "Unknown Artist",
            album: result.album || null,
            year: result.year || null,
        });
    } catch (err) {
        console.error("[RecognizeSong] Error:", err.message || err);
        return res.status(500).json({ success: false, message: "Recognition failed. Please try again." });
    } finally {
        // Always clean up temp files
        await safeUnlink(inputPath);
        await safeUnlink(pcmPath);
    }
};
