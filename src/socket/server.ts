import crypto from "crypto";
import packetReceiver from "./receiver";
export const listener = new eventEmitter();
import { event } from "../systems/events";
import eventEmitter from "node:events";
import log from "../modules/logger";
import player from "../systems/player";
import cache from "../services/cache.ts";
import packet from "../modules/packet";
import path from "node:path";
import fs from "node:fs";

const _cert = path.join(import.meta.dir, "../certs/cert.crt");
const _key = path.join(import.meta.dir, "../certs/cert.key");
const _https = process.env.WEBSRV_USESSL === "true";
let options;

if (_https) {

  if (!fs.existsSync(_cert) || !fs.existsSync(_key)) {
    log.error(`Attempted to locate certificate and key but failed`);
    log.error(`Certificate: ${_cert}`);
    log.error(`Key: ${_key}`);
    throw new Error("SSL certificate or key is missing");
  }
  try {
    options = {
      key: Bun.file(_key),
      cert: Bun.file(_cert),
    };
  } catch (e) {
    log.error(e as string);
  }
}

const RateLimitOptions: RateLimitOptions = {
  // Maximum amount of requests
  maxRequests: 2000,
  // Time in milliseconds to remove rate limiting
  time: 2000,
  // Maximum window time in milliseconds
  maxWindowTime: 1000,
};

// Set to store all connected clients
const connections = new Set<Identity>();

// Set to track the amount of requests
const ClientRateLimit = [] as ClientRateLimit[];



export const Server = Bun.serve<Packet>({
  fetch(req, Server) {
    // Upgrade the request to a WebSocket connection
    // and generate a random id for the client
    const id = crypto.randomBytes(32).toString("hex");
    const useragent = req.headers.get("user-agent");
    if (!useragent)
      return new Response("User-Agent header is missing", { status: 400 });
    const success = Server.upgrade(req, { data: { id, useragent } });
    return success
      ? undefined
      : new Response("WebSocket upgrade error", { status: 400 });
  },
  tls: options,
  websocket: {
    perMessageDeflate: true, // Enable per-message deflate compression
    maxPayloadLength: 1024 * 1024, // 1 MiB
    idleTimeout: 1, // 1 second
    async open(ws) {
      // Add the client to the set of connected clients
      if (!ws.data?.id || !ws.data?.useragent) return;
      connections.add({ id: ws.data.id, useragent: ws.data.useragent });
      // Emit the onConnection event
      listener.emit("onConnection", ws.data.id);
      // Add the client to the clientRequests array
      ClientRateLimit.push({
        id: ws.data.id,
        requests: 0,
        rateLimited: false,
        time: null,
        windowTime: 0,
      });
      // Track the clients window time and reset the requests count
      // if the window time is greater than the max window time
      setInterval(() => {
        const index = ClientRateLimit.findIndex(
          (client) => client.id === ws.data.id
        );
        if (index === -1) return;
        const client = ClientRateLimit[index];
        // Return if the client is rate limited
        if (client.rateLimited) {
          client.requests = 0;
          client.windowTime = 0;
          return;
        }
        client.windowTime += 1000;
        if (client.windowTime > RateLimitOptions.maxWindowTime) {
          client.requests = 0;
          client.windowTime = 0;
        }
      }, 1000);

      // Subscribe to the CONNECTION_COUNT event and publish the current count
      ws.subscribe("CONNECTION_COUNT" as Subscription["event"]);
      ws.subscribe("BROADCAST" as Subscription["event"]);
      ws.subscribe("LOAD_PLAYERS" as Subscription["event"]);
      ws.subscribe("SPAWN_PLAYER" as Subscription["event"]);
      ws.subscribe("MOVEXY" as Subscription["event"]);
      ws.subscribe("DISCONNECT_PLAYER" as Subscription["event"]);
      ws.subscribe("CHAT" as Subscription["event"]);
      ws.subscribe("STEALTH" as Subscription["event"]);
      ws.subscribe("UPDATESTATS" as Subscription["event"]);
      ws.subscribe("REVIVE" as Subscription["event"]);
      const _packet = {
        type: "CONNECTION_COUNT",
        data: connections.size,
      } as unknown as Packet;
      Server.publish(
        "CONNECTION_COUNT" as Subscription["event"],
        packet.encode(JSON.stringify(_packet))
      );
    },
    async close(ws) {
      // Remove the client from the set of connected clients
      if (!ws.data.id) return;
      // Find the client object in the set
      let clientToDelete;
      for (const client of connections) {
        if (client.id === ws.data.id) {
          clientToDelete = client;
          break;
        }
      }
      // Check if we found the client object
      if (clientToDelete) {
        const deleted = connections.delete(clientToDelete);
        if (deleted) {
          // Emit the onDisconnect event
          listener.emit("onDisconnect", { id: ws.data.id });

          // Publish the new connection count and unsubscribe from the event
          const _packet = {
            type: "CONNECTION_COUNT",
            data: connections.size,
          } as unknown as Packet;
          Server.publish(
            "CONNECTION_COUNT" as Subscription["event"],
            packet.encode(JSON.stringify(_packet))
          );
          ws.unsubscribe("CONNECTION_COUNT" as Subscription["event"]);
          // Unsubscribe from the BROADCAST event
          ws.unsubscribe("BROADCAST" as Subscription["event"]);
          ws.unsubscribe("SPAWN_PLAYER" as Subscription["event"]);
          ws.unsubscribe("LOAD_PLAYERS" as Subscription["event"]);
          ws.unsubscribe("MOVEXY" as Subscription["event"]);
          ws.unsubscribe("DISCONNECT_PLAYER" as Subscription["event"]);
          ws.unsubscribe("CHAT" as Subscription["event"]);
          ws.unsubscribe("STEALTH" as Subscription["event"]);
          ws.unsubscribe("UPDATESTATS" as Subscription["event"]);
          ws.unsubscribe("REVIVE" as Subscription["event"]);
          // Remove the client from clientRequests
          for (let i = 0; i < ClientRateLimit.length; i++) {
            if (ClientRateLimit[i].id === ws.data.id) {
              ClientRateLimit.splice(i, 1);
              break;
            }
          }
        }
        ws.publish(
          "DISCONNECT_PLAYER" as Subscription["event"],
          packet.encode(
            JSON.stringify({
              type: "DISCONNECT_PLAYER",
              data: ws.data.id,
            })
          )
        );
      }
    },
    // Use any because we aren't allowed to use ArrayBuffer
    async message(ws, message: any) {
      try {
        // Check if the request has an identity and a message and if the message is an ArrayBuffer
        if (!ws.data?.id || !message) return;
        // Decode the message
        message = packet.decode(message);
        for (const client of ClientRateLimit) {
          // Return if the client is rate limited
          if (client.rateLimited) return;
          if (client.id === ws.data.id) {
            // Update the client requests count +1
            client.requests++;
            // Check if the client has reached the rate limit
            if (client.requests >= RateLimitOptions.maxRequests) {
              client.rateLimited = true;
              client.time = Date.now();
              log.debug(`Client with id: ${ws.data.id} is rate limited`);
              // Output the rate limited clients
              log.debug(
                ClientRateLimit.filter(
                  (client) => client.rateLimited
                ).toString()
              );
              ws.send(
                packet.encode(
                  JSON.stringify({ type: "RATE_LIMITED", data: "Rate limited" })
                )
              );
              return;
            }
          }
        }
        packetReceiver(Server, ws, message.toString());
      } catch (e) {
        log.error(e as string);
      }
    },
  },
});

// Awake event
listener.on("onAwake", async () => {
  // Clean up the player session ids, set them to offline, and clear all tokens
  await player.clear();
});

// Start event
listener.on("onStart", async () => {});

// Register the Server as online
event.emit("online", Server);

// Fixed update loop
listener.on("onUpdate", async () => {});

// Fixed update loop
listener.on("onFixedUpdate", async () => {
  {
    if (ClientRateLimit.length < 1) return;
    const timestamp = Date.now();
    for (let i = 0; i < ClientRateLimit.length; i++) {
      const client = ClientRateLimit[i];
      if (client.rateLimited && client.time) {
        if (timestamp - client.time! > RateLimitOptions.time) {
          client.rateLimited = false;
          client.requests = 0;
          client.time = null;
          log.debug(`Client with id: ${client.id} is no longer rate limited`);
        }
      }
    }
  }
});

// On new connection
listener.on("onConnection", (data) => {
  if (!data) return;
  log.debug(`New connection: ${data}`);
});

// On disconnect
listener.on("onDisconnect", async (data) => {
  if (!data) return;
  const playerData = cache.get(data.id);
  if (!playerData?.id || !playerData?.location) {
    log.error(`Player data not found: ${data.id}`);
    return;
  }
  await player.setLocation(playerData.id, playerData.location.map, playerData.location.position);
  cache.remove(playerData.id);
  await player.clearSessionId(playerData.id);
  log.debug(`Disconnected: ${playerData.id}`);
});

// Save loop
listener.on("onSave", async () => {
  const playerCache = cache.list();
  for (const p in playerCache) {
    await player.setLocation(
      p,
      playerCache[p].location.map,
      playerCache[p].location.position,
    );
  }
});

// Exported Server events
export const events = {
  GetOnlineCount() {
    return connections.size;
  },
  GetOnlineData() {
    return connections;
  },
  Broadcast(_packet: string) {
    log.debug(`Broadcasting packet: ${_packet}`);
    Server.publish(
      "BROADCAST" as Subscription["event"],
      packet.encode(JSON.stringify(_packet))
    );
  },
  GetClientRequests() {
    return ClientRateLimit;
  },
  GetRateLimitedClients() {
    return ClientRateLimit.filter((client) => client.rateLimited);
  },
};
