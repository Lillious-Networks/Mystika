import express from "express";
export const router = express.Router();
import player from "../systems/player";

router.post("/login", async (req, res) => {
  // Input validation
  if (!req.body?.username) {
    res.status(403).send({ message: "Username is required" });
    return;
  }

  if (!req.body?.password) {
    res.status(403).send({ message: "Password is required" });
    return;
  }

  if (req.body.username.length < 3) {
    res.status(403).send({ message: "Invaldi credentials" });
    return;
  }

  if (req.body.username.length > 15) {
    res.status(403).send({ message: "Invalid credentials" });
    return;
  }

  if (req.body.password.length < 8) {
    res.status(403).send({ message: "Invalid credentials" });
    return;
  }

  if (req.body.password.length > 20) {
    res.status(403).send({ message: "Invalid credentials" });
    return;
  }

  const token = await player.login(req.body.username, req.body.password);
  if (!token) {
    res.status(403).send({ message: "Invalid credentials" });
    return;
  }

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  // Redirect the user to the game
  res.status(200).redirect("/game/");
});
