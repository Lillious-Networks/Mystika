import express from "express";
export const router = express.Router();

router.get("/docs", (req, res) => {
  res.redirect("/docs.html");
});

export default router;