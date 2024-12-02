import express from "express";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
const port = process.env.WEBSRV_PORT || 80;
const sslport = process.env.WEBSRV_PORTSSL || 443;
const app = express();
app.use(compression());
import log from "../modules/logger";
import "../services/security";

// Load assets
import "../modules/assetloader";

/* SSL Certificate Setup */
const _cert = path.join(import.meta.dir, "../certs/cert.crt");
const _ca = path.join(import.meta.dir, "../certs/cert.ca-bundle");
const _key = path.join(import.meta.dir, "../certs/cert.key");
let _https = false;

if (fs.existsSync(_cert) && fs.existsSync(_ca) && fs.existsSync(_key)) {
  _https = true;
}

const cert = _https ? fs.readFileSync(_cert, "utf8") : "";
const ca = _https ? fs.readFileSync(_ca, "utf8") : "";
const key = _https ? fs.readFileSync(_key, "utf8") : "";

const credentials = {
  cert: cert,
  ca: ca,
  key: key,
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
    domain: "*.*",
    keys: [process.env.SESSION_KEY || "secret"],
  })
);

// Disable x-powered-by header
app.disable("x-powered-by");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
  validate: false,
});
app.use(limiter);

// Redirect to HTTPS
if (_https) {
  app.use((req: any, res: any, next: any) => {
    if (!req.secure) {
      res.redirect("https://" + req.headers.host + req.url);
    } else {
      next();
    }
  });
}

// Filter
import filter from "../systems/security";
app.use(function (req: any, res: any, next: any) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token"
  );
  res.setHeader("Cache-Control", "public, max-age=2.88e+7");
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  filter(req, res, next, ip);
});

// Sanitize the URL
app.use(function (req: any, res: any, next: any) {
  let url = req.url;
  if (url.match(/\/{2,}$/)) {
    // Remove repeating slashes at the end of the domain
    url = url.replace(/\/{2,}$/g, "/");
    // Redirect to the new url
    res.redirect(
      `${req.headers["x-forwarded-proto"] || req.protocol}://${
        req.headers.host
      }${url}`
    );
  } else {
    next();
  }
});

// Static files
app.use("/", express.static(path.join(import.meta.dirname, "www/public")));

// Unauthenticated Routes
import { router as ReigisterRouter } from "../routes/register";
app.use(ReigisterRouter);

// Benchmark Routes
import { router as BenchmarkRouter } from "../routes/benchmark";
app.use(BenchmarkRouter);

// Documentation Routes
import { router as DocumentationRouter } from "../routes/documentation";
app.use(DocumentationRouter);

import { router as LoginRouter } from "../routes/login";
app.use(LoginRouter);

// Authorization Middleware
import { router as AuthorizationRouter } from "../routes/authorization";
app.use(AuthorizationRouter);

// Static files
app.use("/game", express.static(path.join(import.meta.dirname, "www/game")));
import { router as mapRouter } from "../routes/map";
app.use(mapRouter);
import { router as tilesetRouter } from "../routes/tileset";
app.use(tilesetRouter);
import { router as functionRouter } from "../routes/functions";
app.use(functionRouter);

const server = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

if (_https) {
  httpsServer.listen(sslport, async () => {
    log.info(`HTTPS server is listening on localhost:${sslport}`);
  });
}

server.listen(port, async () => {
  log.info(`HTTP server is listening on localhost:${port}`);
  await import("../socket/server");
});

export default app;