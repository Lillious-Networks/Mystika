import crypto from "crypto";
import PacketReceiver from "./receiver";
export const Listener = new EventEmitter();
import { Event } from "../systems/events";
import EventEmitter from 'node:events';
import log from "../modules/logger";

const RateLimitOptions: RateLimitOptions = {
  // Maximum amount of requests
  maxRequests: 100,
  // Time in milliseconds to remove rate limiting
  time: 5000,
  // Maximum window time in milliseconds
  maxWindowTime: 4000,
};

Object.freeze(RateLimitOptions);

export const PacketTypes: PacketType = {
  0: "PING",
  1: "PONG",
  2: "CONNECTION_COUNT",
  3: "RATE_LIMITED",
  4: "LOGIN",
  5: "LOGIN_SUCCESS",
  6: "LOGIN_FAILED",
  7: "LOAD_MAP",
  8: "SAVE_PLAYER",
};

Object.freeze(PacketTypes);

// Set to store all connected clients
const connections = new Set<Identity>();
Object.freeze(connections);

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
  websocket: {
    perMessageDeflate: true, // Enable per-message deflate compression
    maxPayloadLength: (1024 * 1024) / 2, // 0.5 MB
    idleTimeout: 30, // 30 seconds
    open(ws) {
      // Add the client to the set of connected clients
      if (!ws.data.id || !ws.data.useragent) return;
      connections.add({ id: ws.data.id, useragent: ws.data.useragent });
      log.debug(`Client connected with id: ${ws.data.id}`);
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
        // console.log(`Client with id: ${client.id} has ${client.requests} requests in ${client.windowTime}ms`);
        client.windowTime += 1000;
        if (client.windowTime > RateLimitOptions.maxWindowTime) {
          client.requests = 0;
          client.windowTime = 0;
        }
      }, 1000);

      // Subscribe to the CONNECTION_COUNT event and publish the current count
      ws.subscribe("CONNECTION_COUNT" as Subscription["event"]);
      const packet = {
        type: PacketTypes[2],
        data: connections.size,
      } as unknown as Packet;
      Server.publish(
        "CONNECTION_COUNT" as Subscription["event"],
        JSON.stringify(packet)
      );
      // Subscribe to the BROADCAST event
      ws.subscribe("BROADCAST" as Subscription["event"]);
    },
    close(ws) {
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
          log.debug(`Client disconnected with id: ${ws.data.id}`);
          // Publish the new connection count and unsubscribe from the event
          const packet = {
            type: PacketTypes[2],
            data: connections.size,
          } as unknown as Packet;
          Server.publish(
            "CONNECTION_COUNT" as Subscription["event"],
            JSON.stringify(packet)
          );
          ws.unsubscribe("CONNECTION_COUNT" as Subscription["event"]);
          // Unsubscribe from the BROADCAST event
          ws.unsubscribe("BROADCAST" as Subscription["event"]);
          // Remove the client from clientRequests
          for (let i = 0; i < ClientRateLimit.length; i++) {
            if (ClientRateLimit[i].id === ws.data.id) {
              ClientRateLimit.splice(i, 1);
              break;
            }
          }
        }
      }
    },
    async message(ws, message: string | Buffer) {
      try {
        // Check if the request has an identity
        if (!ws.data.id) return;
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
                ClientRateLimit.filter((client) => client.rateLimited).toString()
              );
              ws.send(
                JSON.stringify({ type: PacketTypes[3], data: "Rate limited" })
              );
              return;
            }
          }
        }
        PacketReceiver(ws, message.toString());
      } catch (e) {
        log.error(e as string);
      }
    },
  },
});

Object.freeze(Server);

// Awake event
Listener.on("onAwake", () => {
  
});

// Start event
Listener.on('onStart', () => {
  
});

// Register the Server as online
Event.emit("online", Server);

// Fixed update loop
Listener.on('onUpdate', () => {
  
});

// Fixed update loop
Listener.on('onFixedUpdate', () => {
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

// Save loop
Listener.on('onSave', () => {

});

// Exported Server events
export const Events = {
  GetOnlineCount() {
    return connections.size;
  },
  GetOnlineData() {
    return connections;
  },
  Broadcast(packet: string) {
    log.debug(`Broadcasting packet: ${packet}`);
    Server.publish("BROADCAST" as Subscription["event"], packet);
  },
  GetClientRequests() {
    return ClientRateLimit;
  },
  GetRateLimitedClients() {
    return ClientRateLimit.filter((client) => client.rateLimited);
  },
};

Object.freeze(Events);