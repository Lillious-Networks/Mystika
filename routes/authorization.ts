import express from "express";
export const router = express.Router();
import query from "../controllers/sqldatabase";

router.use((req, res, next) => {
    const token = readCookieValue(req, "token");
    if (!token) {
        res.status(403).redirect("/");
        return;
    }
    // Check if the token is valid
    query("SELECT * FROM accounts WHERE token = ?", [token])
    .then((result: any) => {
        if (result.length === 0) {
            res.status(403).redirect("/");
            return;
        }
        next();
    })
});

function readCookieValue(req: any, key: string) {
    const rawCookie = req.headers?.cookie?.split(";").find((c: string) => c.startsWith(key)) || null;
    if (!rawCookie) return null;
    return rawCookie.split("=")[1];
}