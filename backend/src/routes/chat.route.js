import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendMessage, deleteMessage, quickReply, addReaction, removeReaction } from "../controller/chat.controller.js";
import { uploadVoice } from "../controller/voice.controller.js";
import { updateMessageDuration } from "../controller/chat.controller.js";
import { uploadFiles } from "../controller/file.controller.js";

const router = Router();

router.get("/messages/:userId", protectRoute); // (your controller elsewhere)
router.post("/send", protectRoute, sendMessage);
router.post("/voice/upload", protectRoute, uploadVoice);
router.post("/files/upload", protectRoute, uploadFiles);
router.post("/quick-reply", protectRoute, quickReply);
router.patch("/messages/:messageId/duration", protectRoute, updateMessageDuration);
router.delete("/messages/:messageId", protectRoute, deleteMessage);
router.post("/messages/:messageId/reactions", protectRoute, addReaction);
router.delete("/messages/:messageId/reactions", protectRoute, removeReaction);

export default router;