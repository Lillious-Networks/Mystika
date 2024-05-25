import express from "express";
export const router = express.Router();
import player from "../systems/player";

router.post("/login", async (req, res) => {
  if (!req.body?.username || !req.body?.password) {
    res.status(403).redirect("back");
    return;
  }

  // Check if the user exists
  const exists = await player.findByUsername(req.body.username) as string[];
  if (exists?.length === 0) {
    res.status(403).redirect("back");
    return;
  }

  // Validate credentials
  const token = await player.login(req.body.username, req.body.password);

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  // Redirect the user to the game
  res.status(200).redirect("/game/");
});
