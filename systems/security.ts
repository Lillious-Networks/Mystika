import log from "../modules/logger";
import * as authentication from "../services/authentication";
import query from "../controllers/sqldatabase";
import { service } from "../services/ip";
const w_ips = service.getWhitelistedIPs();
const b_ips = service.getBlacklistedIPs();
import { NullRoutingService } from "../services/nullrouting";
import { checkSecurityRule } from "../services/security";
import path from "path";
let requests = 0;

// Calculate requests per second to the website to determine if the website is under attack
setInterval(() => {
  if (requests > 100) {
    if (!NullRoutingService.isEnabled()) {
      log.error(`[DDOS DETECTED] - Requests per second: ${requests}`);
      // Enable null routing
      NullRoutingService.enable();
    }
  } else {
    if (NullRoutingService.isEnabled()) {
      // Disable null routing
      NullRoutingService.disable();
    }
  }
  requests = 0;
}, 1000);

// Get all blocked IPs from the database and store them in memory for faster access
query("SELECT * FROM blocked_ips", [])
  .then((result: any) => {
    result.forEach((element: any) => {
      service.blacklistAdd(element.ip);
    });
  })
  .catch((err: any) => {
    if (err) {
      // Do nothing, we don't want to spam the console with errors
    }
  });

// Get all allowed IPs from the database and store them in memory for faster access
query("SELECT * FROM allowed_ips", [])
  .then((result: any) => {
    result.forEach((element: any) => {
      service.whitelistAdd(element.ip);
    });
  })
  .catch((err: any) => {
    if (err) {
      // Do nothing, we don't want to spam the console with errors
    }
  });

export default function filter(req: any, res: any, next: any, ip: any): void {
  requests++;
  if (w_ips.includes(ip)) return next(); // Check if IP is whitelisted and if so, allow the request
  // Check if the user is banned and if so, block the request
  if (req.cookies.email) {
    authentication
      .checkAccess(req.cookies.email)
      .then((results: any) => {
        if (results === -1) {
          res.clearCookie("email");
          res.clearCookie("session");
          res.status(403);
          res.sendFile(
            path.join(import.meta.dir, "../../www/public/errors/403.html")
          );
          return;
        } else {
          checkAccess(req, res, next, ip);
        }
      })
      .catch((err: any) => {
        log.error(err);
      });
  } else {
    checkAccess(req, res, next, ip);
  }
}

function checkAccess(req: any, res: any, next: any, ip: any) {
  // Check if null routing is enabled and if so, block the request
  if (NullRoutingService.isEnabled()) return;
  if (b_ips.includes(ip)) {
    res.status(403);
    return;
  }
  checkSecurityRule(req.url)
    .then(() => {
      query("INSERT IGNORE INTO blocked_ips (ip) VALUES (?)", [ip])
        .then(() => {
          log.info(`[BLOCKED] - ${ip} - ${req.url}`);
          service.blacklistAdd(ip);
        })
        .catch((err: any) => {
          log.error(err);
        });
      res.status(418);
      return;
    })
    .catch((err: any) => {
      if (err === "NOT_FOUND") next();
    });
}
