import query from "../controllers/sqldatabase";
import express from "express";
export const router = express.Router();

router.get("/verify", async (req, res) => {
    const email = req.query.email as string;
    const token = req.query.token as string;
    const code = req.query.code as string;

    if (!token || !code || !email) {
        res.status(403).send({ message: "Invalid request" });
        return;
    }

    // Check if the token exists
    const result = await query("SELECT * FROM accounts WHERE token = ? AND email = ? AND verification_code = ? LIMIT 1", [token, email, code]) as any;
    if (result.length === 0) {
        res.status(403).send({ message: "Invalid request" });
        return;
    }

    // Update the account to verified
    await query("UPDATE accounts SET verified = 1 WHERE token = ?", [token]);

    // Remove the code
    await query("UPDATE accounts SET verification_code = NULL WHERE token = ?", [token]);

    res.status(200).redirect("/game");

});