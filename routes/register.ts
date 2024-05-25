import express from "express";
export const router = express.Router();
import player from "../systems/player";
import log from "../modules/logger";

router.post("/register", async (req, res) => {
  if (!req.body?.username || !req.body?.password || !req.body?.email) {
    res.status(400).send("Missing fields");
    return;
  }

  const user = await player.register(req.body.username, req.body.password, req.body.email, req) as string;
  if (!user) {
    res.status(500).send("Database error");
    return;
  }
  
  const token = await player.setToken(user);
  if (!token) {
    res.status(500).send("Database error");
    return;
  }

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  log.debug(`User ${req.body.username} registered`);
  // Redirect the user to the game
  res.status(200).redirect("/game/");
});

export default router;
