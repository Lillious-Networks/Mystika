const now = performance.now();
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
import log from "../../src/modules/logger";
import "../../src/services/security";

// Load assets
import "../../src/modules/assetloader";

/* SSL Certificate Setup */
const _cert = path.join(import.meta.dir, "../certs/cert.crt");
const _key = path.join(import.meta.dir, "../certs/cert.key");
const _https = process.env.WEBSRV_USESSL === "true" && fs.existsSync(_cert) && fs.existsSync(_key);

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
  windowMs: 5 * 60 * 1000,
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
import filter from "../../src/systems/security";
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
import { router as ReigisterRouter } from "../../src/routes/register";
app.use(ReigisterRouter);

// Verify Routes
import { router as VerifyRouter } from "../../src/routes/verify";
app.use(VerifyRouter);

// Benchmark Routes
import { router as BenchmarkRouter } from "../../src/routes/benchmark";
app.use(BenchmarkRouter);

// Documentation Routes
import { router as DocumentationRouter } from "../../src/routes/documentation";
app.use(DocumentationRouter);

import { router as LoginRouter } from "../../src/routes/login";
app.use(LoginRouter);

// Authorization Middleware
import { router as AuthorizationRouter } from "../../src/routes/authorization";
app.use(AuthorizationRouter);

// Static files
app.use("/game", express.static(path.join(import.meta.dirname, "www/game")));
import { router as mapRouter } from "../../src/routes/map";
app.use(mapRouter);
import { router as tilesetRouter } from "../../src/routes/tileset";
app.use(tilesetRouter);
import { router as functionRouter } from "../../src/routes/functions";
app.use(functionRouter);

const server = http.createServer(app);

if (_https) {
  try {
    const cert = _https ? fs.readFileSync(_cert, "utf8") : "";
    const key = _https ? fs.readFileSync(_key, "utf8") : "";
  
    https.createServer({
      cert: cert,
      key: key,
    }, app).listen(sslport, () => {
      log.success(`HTTPS server is listening on localhost:${sslport} - Ready in ${(performance.now() - now).toFixed(2)}ms`);
    });
  } catch (e: any) {
    log.error(`Error starting HTTPS server: ${e.message}`);
  }
}

server.listen(port, async () => {
  log.success(`HTTP server is listening on localhost:${port} - Ready in ${(performance.now() - now).toFixed(2)}ms`);
  await import("../../src/socket/server");
});

// Wait for connections to close gracefully
server.on("stop", () => {
  log.info("Server is stopping...");
  server.close(() => {
    log.info("Server stopped.");
  });
});

export default app;