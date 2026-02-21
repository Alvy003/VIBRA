// controller/savedItem.controller.js
import { SavedItem } from "../models/savedItem.model.js";

export const saveItem = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { type, source, externalId, title, artist, description, imageUrl, year, language, songCount } = req.body;

    if (!type || !source || !externalId || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Upsert to avoid duplicates
    const item = await SavedItem.findOneAndUpdate(
      { userId, externalId },
      {
        userId,
        type,
        source,
        externalId,
        title,
        artist: artist || "",
        description: description || "",
        imageUrl: imageUrl || "",
        year: year || null,
        language: language || null,
        songCount: songCount || 0,
      },
      { upsert: true, new: true }
    );

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: "Already saved" });
    }
    next(err);
  }
};

export const unsaveItem = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { externalId } = req.params;

    const result = await SavedItem.findOneAndDelete({ userId, externalId });
    if (!result) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Removed from library" });
  } catch (err) {
    next(err);
  }
};

export const getSavedItems = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { type } = req.query;

    const filter = { userId };
    if (type) filter.type = type;

    const items = await SavedItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const checkSaved = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { externalId } = req.params;

    const exists = await SavedItem.exists({ userId, externalId });
    res.json({ isSaved: !!exists });
  } catch (err) {
    next(err);
  }
};