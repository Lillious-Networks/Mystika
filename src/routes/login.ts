import express from "express";
export const router = express.Router();
import player from "../systems/player";
import verify from "../services/verification";

router.post("/login", async (req, res) => {

  // Check if the user is already logged in
  if (req.cookies.token) {
    // Try to verify the token
    const token = req.cookies.token;
    const username = await player.getUsernameByToken(token) as any | undefined;
    if (username.length) {
      if (username[0].username) {
        res.status(301).send({ message: "Player is already verified and logged in" });
        return;
      }
    }
  }

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

  // Send 2fa email to the user

  const useremail = await player.getEmail(req.body.username) as string;
  if (!useremail) {
    res.status(403).send({ message: "Invalid credentials" });
    return;
  }

  // Set the token in a cookie
  res.cookie("token", token, {
    maxAge: 900000,
    httpOnly: false,
  });

  // Send the verification email
  const result = await verify(token, useremail, req.body.username) as any;
  if (result instanceof Error) {
    res.status(403).send({ message: "Failed to send verification email" });
    return;
  }

  res.status(200).send({ message: "Verification email sent" });
});