import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/ice", async (req, res) => {
  try {
    const ident = process.env.XIRSYS_IDENT;
    const secret = process.env.XIRSYS_SECRET;
    const channel = "Vibra";

    if (!ident || !secret) {
      console.error("❌ Missing XIRSYS credentials");
      return res.status(500).json({ iceServers: [] });
    }

    // console.log("🔄 Fetching ICE from Xirsys...");

    const response = await fetch(
      `https://global.xirsys.net/_turn/${encodeURIComponent(channel)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${ident}:${secret}`).toString("base64"),
        },
        body: JSON.stringify({ format: "urls" }),
      }
    );

    const data = await response.json();
    // console.log("📡 Xirsys response:", JSON.stringify(data, null, 2));

    // ✅ Parse Xirsys response correctly
    let iceServers = [];

    if (data.s === "ok" && data.v?.iceServers) {
      const server = data.v.iceServers;
      
      if (server.urls && Array.isArray(server.urls)) {
        // Separate STUN and TURN URLs
        const stunUrls = server.urls.filter(url => url.startsWith('stun:'));
        const turnUrls = server.urls.filter(url => url.startsWith('turn:') || url.startsWith('turns:'));
        
        // Add STUN servers (no auth)
        if (stunUrls.length > 0) {
          iceServers.push({ urls: stunUrls });
        }
        
        // Add TURN servers (with auth)
        if (turnUrls.length > 0 && server.username && server.credential) {
          iceServers.push({
            urls: turnUrls,
            username: server.username,
            credential: server.credential,
          });
        }
        
        // console.log("✅ Formatted ICE servers:", JSON.stringify(iceServers, null, 2));
      }
    }

    // Fallback to public servers if Xirsys fails
    if (iceServers.length === 0) {
      console.warn("⚠️ Xirsys parsing failed, using fallback servers");
      iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ];
    }

    res.json({ iceServers });
  } catch (error) {
    console.error("❌ Error fetching ICE servers:", error);
    res.status(500).json({ iceServers: [] });
  }
});

// Test endpoint
router.get("/ice/test", async (req, res) => {
  try {
    const ident = process.env.XIRSYS_IDENT;
    const secret = process.env.XIRSYS_SECRET;
    const channel = "Vibra";

    const response = await fetch(
      `https://global.xirsys.net/_turn/${encodeURIComponent(channel)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${ident}:${secret}`).toString("base64"),
        },
        body: JSON.stringify({ format: "urls" }),
      }
    );

    const data = await response.json();
    
    // Parse and format
    let formattedServers = [];
    if (data.s === "ok" && data.v?.iceServers) {
      const server = data.v.iceServers;
      const stunUrls = server.urls.filter(url => url.startsWith('stun:'));
      const turnUrls = server.urls.filter(url => url.startsWith('turn:') || url.startsWith('turns:'));
      
      if (stunUrls.length > 0) {
        formattedServers.push({ urls: stunUrls });
      }
      if (turnUrls.length > 0) {
        formattedServers.push({
          urls: turnUrls,
          username: server.username,
          credential: server.credential,
        });
      }
    }
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      rawResponse: data,
      parsedServers: data.v?.iceServers || {},
      formattedForWebRTC: formattedServers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;