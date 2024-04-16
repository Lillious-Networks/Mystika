import express from "express";
export const router = express.Router();
import { GetTilesets } from "../modules/assetloader";

const tilesets = GetTilesets();
// Get tileset hash
router.get("/tileset/hash", (req, res) => {
  const tilesetName = req?.query?.name?.toString();
  if (!tilesetName) return res.json({ hash: null });
  try {
    const tileset = (tilesets as any[]).find(
      (tileset: any) => tileset.name === tilesetName
    );
    if (!tileset) return res.json({ hash: null });
    res.json({ hash: tileset.hash });
  } catch (e) {
    res.json({ hash: null });
  }
});

// Get tileset as base64 encoded image
router.get("/tileset", (req, res) => {
  const tilesetName = req?.query?.name?.toString();
  if (!tilesetName) return res.json({ data: null });
  try {
    const tileset = (tilesets as any[]).find(
      (tileset: any) => tileset.name === tilesetName
    );
    if (!tileset) return res.json({ tileset: null });
    // Send blob base64 encoded
    res.json({ tileset });
  } catch (e) {
    res.json({ tileset: null });
  }
});

export default router;