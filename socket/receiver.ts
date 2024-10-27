import { packetTypes } from "./types";
import log from "../modules/logger";
import player from "../systems/player";
import cache from "../services/cache";
import assetCache from "../services/assetCache";

const maps = assetCache.get("maps");

export default async function packetReceiver(
  server: any,
  ws: any,
  message: string
) {
  try {
    // Check if the message is empty
    if (!message) return ws.close(1008, "Empty message");
    // Check if the message is too large
    if (message.length > 512) return ws.close(1009, "Message too large");
    const parsedMessage: Packet = tryParsePacket(message) as Packet;
    // Check if the packet is malformed
    if (!parsedMessage) return ws.close(1007, "Malformed message");
    const data = parsedMessage?.data;
    const type = parsedMessage?.type;
    // Check if the packet has a type and data
    if (!type || (!data && data != null))
      return ws.close(1007, "Malformed message");
    // Check if the packet type is valid
    if (
      Object.values(packetTypes).indexOf(parsedMessage?.type as string) === -1
    )
      ws.close(1007, "Invalid packet type");

    // Handle the packet
    switch (type) {
      case "PING": {
        ws.send(JSON.stringify({ type: "PONG", data: data }));
        ws.send(
          JSON.stringify({
            type: "TIME_SYNC",
            data: Date.now(),
          })
        );
        break;
      }
      case "PONG": {
        ws.send(JSON.stringify({ type: "PING", data: data }));
        break;
      }
      case "LOGIN": {
        ws.send(JSON.stringify({ type: "LOGIN_SUCCESS", data: ws.data.id }));
        break;
      }
      case "TIME_SYNC": {
        // Calculate latency
        const latency = Date.now() - Number(data) - 5000;
        if (latency >= 3000) {
          log.error(
            `Client with id: ${ws.data.id} has high latency: ${latency}ms and will be disconnected`
          );
          ws.close(1001, "High latency");
        }
        const ServerTime = Date.now();
        ws.send(
          JSON.stringify({
            type: "TIME_SYNC",
            data: ServerTime,
          })
        );
        break;
      }
      case "AUTH": {
        // Set the session id for the player
        const auth = await player.setSessionId(data.toString(), ws.data.id);
        if (!auth) {
          ws.send(JSON.stringify({ type: "LOGIN_FAILED", data: null }));
          ws.close(1008, "Already logged in");
          break;
        }
        const getUsername = (await player.getUsernameBySession(
          ws.data.id
        )) as any[];
        const username = getUsername[0]?.username as string;
        const location = (await player.getLocation({
          username: username,
        })) as LocationData | null;
        const isAdmin = await player.isAdmin(username);
        const position = location?.position as unknown as PositionData;
        let spawnLocation;
        if (!location || (!position?.x && position.x.toString() != "0") || (!position?.y && position.y.toString() != "0")) {
          spawnLocation = { map: "main.json", x: 0, y: 0 };
        } else {
          spawnLocation = { map: `${location.map}.json`, x: position.x, y: position.y };
        }
        const map = (maps as any[]).find(
          (map: MapData) => map.name === spawnLocation?.map
        ) || (maps as any[]).find((map: MapData) => map.name === "main.json");

        if (!map) return;

        spawnLocation.map = map.name;
        await player.setLocation(ws.data.id, spawnLocation.map.replace(".json", ""), {x: spawnLocation.x, y: spawnLocation.y});
        cache.add(ws.data.id, { username: username, isAdmin: isAdmin, id: ws.data.id, location: { map: spawnLocation.map.replace(".json", ""), position: { x: spawnLocation.x, y: spawnLocation.y } } });
        log.debug(`Spawn location for ${username}: ${spawnLocation.map.replace(".json", "")} at ${spawnLocation.x},${spawnLocation.y}`);
        ws.send(
          JSON.stringify({
            type: "LOAD_MAP",
            data: [
              map?.data,
              map?.hash,
              spawnLocation?.map,
              position.x,
              position.y,
            ],
          })
        );

        server.publish(
          "SPAWN_PLAYER" as Subscription["event"],
          JSON.stringify({
            type: "SPAWN_PLAYER",
            data: {
              id: ws.data.id,
              location: {
                map: spawnLocation?.map,
                x: position.x,
                y: position.y,
              },
              username,
              isAdmin,
            },
          })
        );

        const playerCache = cache.list();
        const players = Object.values(playerCache);
        
        const playerData = [] as any[];

        players.forEach((player) => {
          const location = player.location;
          const data = {
            id: player.id,
            location: {
              map: location.map,
              x: location.position.x,
              y: location.position.y,
            },
            username: player.username,
            isAdmin: player.isAdmin,
          };
          playerData.push(data);
        });
        ws.send(
          JSON.stringify({
            type: "LOAD_PLAYERS",
            data: playerData,
          })
        );
        break;
      }
      case "LOGOUT": {
        await player.logout(ws.data.id);
        break;
      }
      case "DISCONNECT": {
        await player.clearSessionId(ws.data.id);
        break;
      }
      case "MOVEXY": {
        const speed = 1;
        // Get the player's location from the cache
        const player = cache.get(ws.data.id) as any;
        // Update the player's location in the cache
        switch (data.toString().toLowerCase()) {
          case "up": {
            player.location.position.y -= speed;
            break;
          }
          case "down": {
            player.location.position.y += speed;
            break;
          }
          case "left": {
            player.location.position.x -= speed;
            break;
          }
          case "right": {
            player.location.position.x += speed;
            break;
          }
          default: {
            break;
          }
        }

        // Send the updated location to all clients
        server.publish(
          "MOVEXY" as Subscription["event"],
          JSON.stringify({
            type: packetTypes[9],
            data: {
              id: ws.data.id,
              _data: player.location.position,
            },
          })
        );
        break;
      }
      // Unknown packet type
      default: {
        break;
      }
    }
  } catch (e) {
    log.error(e as string);
  }
}

// Try to parse the packet data
function tryParsePacket(data: any) {
  try {
    return JSON.parse(data.toString());
  } catch (e: any) {
    log.error(e);
    return null;
  }
}