import express from "express";
export const router = express.Router();
import player from "../systems/player";
import verify from "../services/verification";

router.get("/register", (req, res) => {
  res.redirect("/register.html");
});

router.post("/register", async (req, res) => {
  if (!req.body?.username || !req.body?.password || !req.body?.email || !req.body?.password2) {
    res.status(400).send({ message: "All fields are required" });
    return;
  }
  
  // Input validation
  if (req.body.password != req.body.password2) {
    res.status(400).send({ message: "Passwords do not match" });
    return;
  }

  if (req.body.password.length < 8) {
    res.status(400).send({ message: "Password must be at least 8 characters" });
    return;
  }

  if (req.body.password.length > 20) {
    res.status(400).send({ message: "Password must be at most 20 characters" });
    return;
  }

  if (req.body.username.length < 3) {
    res.status(400).send({ message: "Username must be at least 3 characters" });
    return;
  }

  if (req.body.username.length > 15) {
    res.status(400).send({ message: "Username must be at most 15 characters" });
    return;
  }

  if (req.body.email.length < 5) {
    res.status(400).send({ message: "Email must be at least 5 characters" });
    return;
  }

  if (req.body.email.length > 50) {
    res.status(400).send({ message: "Email must be at most 50 characters" });
    return;
  }

  if (!req.body.email.includes("@") || !req.body.email.includes(".")) {
    res.status(400).send({ message: "Invalid email" });
    return;
  }

  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(req.body.email)) {
    res.status(400).send({ message: "Invalid email" });
    return;
  }

  const user = await player.register(req.body.username, req.body.password, req.body.email, req) as any;
  if (!user) {
    res.status(500).send('An unexpected error occurred');
    return;
  }

  if (user.error) {
    res.status(400).send({ message: user.error });
    return;
  }
  
  // Log the user in and get a token
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

  // Send the verification email
  const result = await verify(token, req.body.email, req.body.username) as any;
  if (result instanceof Error) {
    res.status(500).send({ message: "An unexpected error occurred" });
    return;
  }

  res.status(200).send({ message: "Please check your email to verify your account" });
});

export default router;
