import express from "express";
export const router = express.Router();
import query from "../controllers/sqldatabase";
import { hash, randomBytes } from "../modules/hash";
import log from "../modules/logger";

router.post("/login", async (req, res) => {
  if (!req.body?.username || !req.body?.password) {
    res.status(403).redirect("back");
    return;
  }

  // Check if the user exists
  try {
    let result = (await query("SELECT * FROM accounts WHERE username = ?", [
      req.body.username,
    ])) as any;
    if (result.length === 0) {
      log.debug(`User ${req.body.username} does not exist`);
      res.status(403).redirect("back");
      return;
    }
  } catch (err: any) {
    log.error(err);
    res.status(500).send("Database error");
    return;
  }

  // Validate credentials
  try {
    let result = (await query(
      "SELECT * FROM accounts WHERE username = ? AND password_hash = ?",
      [req.body.username, hash(req.body.password)]
    )) as any;
    if (result.length === 0) {
      log.debug(`User ${req.body.username} failed to login`);
      res.status(403).redirect("back");
      return;
    }
  } catch (err: any) {
    log.error(err);
    res.status(500).send("Database error");
    return;
  }

  // Update the token and redirect to the game
  try {
    const token = randomBytes(32);
    let result = (await query(
      "UPDATE accounts SET token = ? WHERE username = ?",
      [token, req.body.username]
    )) as any;

    if (result.affectedRows === 0) {
      log.error(`Failed to update token for ${req.body.username}`);
      res.status(500).send("Database error");
      return;
    } else {
      log.debug(`User ${req.body.username} logged in`);
      res.cookie("token", token, {
        maxAge: 900000,
        httpOnly: true,
      });
      res.status(200).redirect("/game/");
    }
  } catch (err: any) {
    log.error(err);
    res.status(500).send("Database error");
    return;
  }
});
