import express from "express";
export const router = express.Router();
import { GetMaps } from "../modules/assetloader";

const maps = GetMaps();
Object.freeze(maps);

// Get map hash
router.get("/map/hash", (req, res) => {
  const mapName = req?.query?.name?.toString();
  if (!mapName) return res.json({ hash: null });
  try {
    const map = (maps as any[]).find((map: any) => map.name === mapName);
    if (!map) return res.json({ hash: null });
    res.json({ hash: map.hash });
  } catch (e) {
    res.json({ hash: null });
  }
});

export default router;