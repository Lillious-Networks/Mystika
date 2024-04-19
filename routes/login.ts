import express from "express";
export const router = express.Router();
import query from "../controllers/sqldatabase";
import { hash, randomBytes } from "../modules/hash";
import log from "../modules/logger";

router.post("/login", (req, res) => {
  if (!req.body?.username || !req.body?.password || !req.body?.email) {
    res.status(400).send("Missing fields");
    return;
  }

  // Check if account exists
  query("SELECT * FROM accounts WHERE email = ?", [req.body.email])
    .then((result: any) => {
      if ((result.length = 0)) {
        res.status(400).send("Account does not exist");
        return;
      }
    })
    .catch((err: Error) => {
      log.error(err.message);
      res.status(500).send("Database error");
      return;
    });

  // Check if password is correct for the account
  query("SELECT * FROM accounts WHERE email = ? AND password_hash = ?", [
    req.body.email,
    hash(req.body.password),
  ]).then((result: any) => {
    if (result.length === 0) {
      res.status(400).send("Incorrect password");
      return;
    }
  });

  // Generate a new token
  const token = randomBytes(32);
  query("UPDATE accounts SET token = ? WHERE email = ?", [
    token,
    req.body.email,
  ])
    .then(() => {
      res.cookie("token", token, {
        maxAge: 900000,
        httpOnly: true,
      });
      res.status(200).redirect("/game/");
    })
    .catch((err: Error) => {
      log.error(err.message);
      res.status(500).send("Database error");
      return;
    });
});
