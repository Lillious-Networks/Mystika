import express from "express";
export const router = express.Router();
import { GetScripts } from "../modules/assetloader";
const scripts = GetScripts();
Object.freeze(scripts);

router.get("/function", (req, res) => {
    const scriptName = `${req?.query?.name?.toString()}.js`;
    if (!scriptName) return res.json({ data: null });
    const script = (scripts as any[]).find((script: any) => script.name === scriptName);
    if (!script) return res.json({ data: null });
    res.json({ script: script.data, hash: script.hash});
})

router.get("/function/hash", (req, res) => {
    const scriptName = `${req?.query?.name?.toString()}.js`;
    if (!scriptName) return res.json({ hash: null });
    const script = (scripts as any[]).find((script: any) => script.name === scriptName);
    if (!script) return res.json({ hash: null });
    res.json({ hash: script.hash });
})

export default router;