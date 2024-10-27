import express from "express";
export const router = express.Router();
import player from "../systems/player";

router.post("/register", async (req, res) => {
  if (!req.body?.username || !req.body?.password || !req.body?.email) {
    res.status(400).send("Missing fields");
    return;
  }

  const user = await player.register(req.body.username, req.body.password, req.body.email, req) as string;
  if (!user) {
    res.status(500).send("An error occurred while registering the user");
    return;
  }
  
  // Log the user in and get a token
  const token = await player.login(req.body.username, req.body.password);

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  // Redirect the user to the game
  res.status(200).redirect("/game/");
});

export default router;
