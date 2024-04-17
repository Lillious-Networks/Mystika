import express from "express";
import * as ws from "../socket/server";
import path from "path";
const port = 80;

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable x-powered-by header
app.disable("x-powered-by");

// Static files
app.use("/", express.static(path.join(import.meta.dirname, "www/public")));

// Routes
import { router as mapRouter } from "../routes/map";
app.use(mapRouter);
Object.freeze(mapRouter);
import { router as tilesetRouter } from "../routes/tileset";
app.use(tilesetRouter);
Object.freeze(tilesetRouter);
import { router as functionRouter } from "../routes/functions";
app.use(functionRouter);
Object.freeze(functionRouter);

// Start the server
app.listen(port, () => {
  console.log(`Web server is listening on localhost:${port}`);
});

console.log(`Socket server is listening on ${ws.Server.hostname}:${ws.Server.port}`);