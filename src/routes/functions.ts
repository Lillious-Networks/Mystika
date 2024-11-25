import express from "express";
export const router = express.Router();
import assetCache from "../services/assetCache";
const scripts = assetCache.get("scripts");

router.get("/function", (req, res) => {
    Object.keys(scripts).forEach((key) => {
        const scriptname = scripts[key].name.replaceAll(".js", "");
        if (scriptname === req.query.name) {
            res.status(200).json({ name: scriptname, script: scripts[key].data, hash: scripts[key].hash });
        }
    });
})

router.get("/function/hash", (req, res) => {
    Object.keys(scripts).forEach((key) => {
        const scriptname = scripts[key].name.replaceAll(".js", "");
        if (scriptname === req.query.name) {
            res.status(200).json({ hash: scripts[key].hash });
        }
    });
})

export default router;