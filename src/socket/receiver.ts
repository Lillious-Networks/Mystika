import { packetTypes } from "./types";
import log from "../modules/logger";
import player from "../systems/player";
import inventory from "../systems/inventory";
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
    ) {
      ws.close(1007, "Invalid packet type");
    }

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
        // Retrieve the player's inventory
        const items = await inventory.get(username) || [];
        if (items.length > 30) {
          items.length = 30;
        }
        ws.send(
          JSON.stringify({
            type: "INVENTORY",
            data: items,
            slots: 30,
          })
        );
        // Get the player's stats
        const stats = await player.getStats(username);
        ws.send(
          JSON.stringify({
            type: "STATS",
            data: stats,
          })
        );
        // Get client configuration
        const clientConfig = await player.getConfig(username);
        ws.send(
          JSON.stringify({
            type: "CLIENTCONFIG",
            data: clientConfig,
          })
        );
        const location = (await player.getLocation({
          username: username,
        })) as LocationData | null;
        const isAdmin = await player.isAdmin(username);
        const position = location?.position as unknown as PositionData;
        let spawnLocation;
        if (
          !location ||
          (!position?.x && position.x.toString() != "0") ||
          (!position?.y && position.y.toString() != "0")
        ) {
          spawnLocation = { map: "main.json", x: 0, y: 0 };
        } else {
          spawnLocation = {
            map: `${location.map}.json`,
            x: position.x,
            y: position.y,
          };
        }
        const map =
          (maps as any[]).find(
            (map: MapData) => map.name === spawnLocation?.map
          ) || (maps as any[]).find((map: MapData) => map.name === "main.json");

        if (!map) return;

        spawnLocation.map = map.name;
        await player.setLocation(
          ws.data.id,
          spawnLocation.map.replace(".json", ""),
          { x: spawnLocation.x, y: spawnLocation.y }
        );
        cache.add(ws.data.id, {
          username: username,
          isAdmin: isAdmin,
          id: ws.data.id,
          location: {
            map: spawnLocation.map.replace(".json", ""),
            position: { x: spawnLocation.x, y: spawnLocation.y },
          },
        });
        log.debug(
          `Spawn location for ${username}: ${spawnLocation.map.replace(
            ".json",
            ""
          )} at ${spawnLocation.x},${spawnLocation.y}`
        );
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
        const _player = cache.get(ws.data.id) as any;
      
        const movePlayer = (axis: "x" | "y", direction: number) => {
          const tempPosition = { ..._player.location.position };
          tempPosition[axis] += speed * direction;
          // Player border box
          tempPosition.x += 16;
          tempPosition.y += 24;
          
          // Down
          if (axis === "y" && direction === 1) {
            tempPosition.y += 24;
          }

          // Up
          if (axis === "y" && direction === -1) {
            tempPosition.y -= 24;
          }          

          // Right
          if (axis === "x" && direction === 1) {
            tempPosition.x += 16;
          }

          // Left
          if (axis === "x" && direction === -1) {
            tempPosition.x -= 16;
          }
      
          if (player.checkIfWouldCollide(_player.location.map, tempPosition)) {
            return false;
          }
      
          _player.location.position[axis] += speed * direction;
          return true;
        };
      
        const moveDirections: Record<string, () => boolean> = {
          up: () => movePlayer("y", -1),
          down: () => movePlayer("y", 1),
          left: () => movePlayer("x", -1),
          right: () => movePlayer("x", 1),
        };
      
        if (data.toString().toLowerCase() in moveDirections) {
          const didMove = moveDirections[data.toString().toLowerCase()]();
          if (didMove) {
            server.publish(
              "MOVEXY" as Subscription["event"],
              JSON.stringify({
                type: "MOVEXY",
                data: {
                  id: ws.data.id,
                  _data: _player.location.position,
                },
              })
            );
          }
        }
        break;
      }      
      case "CHAT": {
        if (data.toString().length > 255) return;
        server.publish(
          "CHAT" as Subscription["event"],
          JSON.stringify({
            type: "CHAT",
            data: {
              id: ws.data.id,
              message: data,
            },
          })
        );
        break;
      }
      case "CLIENTCONFIG": {
        await player.setConfig(ws.data.id, data);
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
