import express from "express";
export const router = express.Router();
import player from "../systems/player";
import log from "../modules/logger";

router.post("/login", async (req, res) => {
  if (!req.body?.username || !req.body?.password) {
    res.status(403).redirect("back");
    return;
  }

  // Check if the user exists
  const exists = await player.findByUsername(req.body.username) as string[];
  if (exists?.length === 0) {
    log.debug(`User ${req.body.username} failed to login`);
    res.status(403).redirect("back");
    return;
  }

  // Validate credentials
  const login = await player.login(req.body.username, req.body.password) as string[];
  if (login?.length === 0) {
    log.debug(`User ${req.body.username} failed to login`);
    res.status(403).redirect("back");
    return;
  }

  // Assign a token to the user
  const token = await player.setToken(req.body.username);
  if (!token) {
    res.status(500).send("Database error");
    return;
  }

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  log.debug(`User ${req.body.username} logged in`);

  // Redirect the user to the game
  res.status(200).redirect("/game/");
});
