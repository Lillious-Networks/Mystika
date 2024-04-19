import express from "express";
export const router = express.Router();
import query from "../controllers/sqldatabase";
import { hash, randomBytes } from "../modules/hash";
import log from "../modules/logger";

router.post("/register", (req, res) => {
  if (!req.body?.username || !req.body?.password || !req.body?.email) {
    res.status(400).send("Missing fields");
    return;
  }

  // Check if email is already in use
  query("SELECT * FROM accounts WHERE email = ?", [req.body.email])
    .then((result: any) => {
      if (result.length > 0) {
        res.status(400).send("Email already in use");
        return;
      }
    })
    .catch((err: Error) => {
      log.error(err.message);
      res.status(500).send("Database error");
      return;
    });

  const token = randomBytes(32);
  query(
    "INSERT INTO accounts (email, username, password_hash, ip_address, geo_location, token) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.body.email,
      req.body.username,
      hash(req.body.password),
      req.ip,
      req.headers["cf-ipcountry"],
      token,
    ]
  )
    .then(() => {
      res.cookie("token", token, {
        maxAge: 900000,
        httpOnly: true,
      });
      res.status(200).send("Account created");
    })
    .catch((err: Error) => {
      log.error(err.message);
      res.status(500).send("Database error");
      return;
    });
});
export default router;
