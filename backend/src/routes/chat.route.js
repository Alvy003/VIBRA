import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendMessage, deleteMessage } from "../controller/chat.controller.js";
import { uploadVoice } from "../controller/voice.controller.js";
import { updateMessageDuration } from "../controller/chat.controller.js"; // Add this import

const router = Router();

router.get("/messages/:userId", protectRoute); // (your controller elsewhere)
router.post("/send", protectRoute, sendMessage);
router.post("/voice/upload", protectRoute, uploadVoice);
router.patch("/messages/:messageId/duration", protectRoute, updateMessageDuration);
router.delete("/messages/:messageId", protectRoute, deleteMessage);

export default router;