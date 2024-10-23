import express from "express";
export const router = express.Router();
import assetCache from "../services/assetCache";
const scripts = assetCache.get("scripts");

router.get("/function", (req, res) => {
    Object.keys(scripts).forEach((key) => {
        res.json({ script: scripts[key].data, hash: scripts[key].hash });
    });
})

router.get("/function/hash", (req, res) => {
    Object.keys(scripts).forEach((key) => {
        res.json({ hash: scripts[key].hash });
    });
})

export default router;