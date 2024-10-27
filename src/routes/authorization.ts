import express from "express";
export const router = express.Router();
import query from "../controllers/sqldatabase";
// Get all root directories in webserver/www and return them as an array
import fs from "fs";
import path from "path";
const directories = fs.readdirSync(path.join(import.meta.dir, "..", "webserver", "www"));

router.use((req, res, next) => {
    // Reduce unnecessary checks by checking if the path is a root directory
    // This will prevent the middleware from running on every request
    const match = directories.find((dir: string) => dir === req.path.split("/")[1]);
    if (!match) {
        next();
        return;
    }
    const token = readCookieValue(req, "token");
    if (!token) {
        res.status(403).redirect("/");
        return;
    }
    // Check if the token is valid
    query("SELECT token FROM accounts WHERE token = ? LIMIT 1", [token])
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