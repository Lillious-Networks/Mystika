import express from "express";
export const router = express.Router();

router.get("/benchmark", (req, res) => {
  res.redirect("/benchmark.html");
});

export default router;
