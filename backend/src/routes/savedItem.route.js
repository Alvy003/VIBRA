// routes/savedItem.route.js
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { saveItem, unsaveItem, getSavedItems, checkSaved } from "../controller/savedItem.controller.js";

const router = Router();

router.use(protectRoute);

router.get("/", getSavedItems);
router.post("/", saveItem);
router.get("/check/:externalId", checkSaved);
router.delete("/:externalId", unsaveItem);

export default router;