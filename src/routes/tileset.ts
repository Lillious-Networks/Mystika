import express from "express";
export const router = express.Router();
import assetCache from "../services/assetCache";
const tilesets = assetCache.get("tilesets");

// Get tileset hash
router.get("/tileset/hash", (req, res) => {
  Object.keys(tilesets).forEach((key) => {
    if (tilesets[key].name === req.query.name) {
      res.json({ hash: tilesets[key].hash });
    }
  });
});

// Get tileset as base64 encoded image
router.get("/tileset", (req, res) => {
  Object.keys(tilesets).forEach((key) => {
    if (tilesets[key].name === req.query.name) {
      res.json({ tileset: tilesets[key] });
    }
  });
});

export default router;