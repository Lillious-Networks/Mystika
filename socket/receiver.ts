import { PacketTypes } from "./server";
import { GetMaps } from "../modules/assetloader";
import log from "../modules/logger";
import player from "../systems/player";
const maps = GetMaps();
Object.freeze(maps);

export default async function PacketReceiver(ws: any, message: string) {
  try {
    if (!message) return;
    if (message.length > 512) return ws.close(1009, "Message too large");
    const parsedMessage: Packet = tryParsePacket(message) as Packet;
    if (!parsedMessage) return;

    const type = parsedMessage.type;
    const data = parsedMessage.data;
    const index = Object.values(PacketTypes).indexOf(type as string);
    if (index === -1) return;

    switch (PacketTypes[index]) {
      // PING
      case PacketTypes[0]: {
        ws.send(JSON.stringify({ type: PacketTypes[1], data: data }));
        // Send TIME_SYNC packet
        ws.send(
          JSON.stringify({
            type: PacketTypes[8],
            data: Date.now(),
          })
        );
        break;
      }
      // PONG
      case PacketTypes[1]: {
        ws.send(JSON.stringify({ type: PacketTypes[0], data: data }));
        break;
      }
      // LOGIN
      case PacketTypes[4]: {
        log.success(`Client with id: ${ws.data.id} logged in`);
        // Send a message to the client to load the main map
        ws.send(
          JSON.stringify({ type: PacketTypes[5], data: ws.data.id })
        );
        break;
      }
      case PacketTypes[8]: {
        // Calculate latency
        const latency = Date.now() - Number(data) - 5000;
        if (latency >= 3000) {
          log.error(`Client with id: ${ws.data.id} has high latency: ${latency}ms and will be disconnected`);
          ws.close(1001, "High latency");
        }
        const ServerTime = Date.now();
        ws.send(
          JSON.stringify({
            type: PacketTypes[8],
            data: ServerTime,
          })
        );
        break;
      }
      // AUTH
      case PacketTypes[10]: {
        // Set the session id for the player
        await player.setSessionId(data.toString(), ws.data.id);
        const getUsername = await player.getUsername(ws.data.id) as any[];
        const username = getUsername[0]?.username as string;
        const location = await player.getLocation({ name: username }) as LocationData | null;
        const position = location?.position as unknown as PositionData;
        
        if (!location || (!position?.x && position.x.toString() != '0') || (!position?.y && position.y.toString() != '0')) {
          log.error("Malformed location data, spawning player at main (0, 0)");
          const map = (maps as any[]).find(
            (map: MapData) => map.name === "main.json"
          );
          if (!map) return;

          ws.send(
            JSON.stringify({
              type: PacketTypes[7],
              data: [map.data, map.hash, map.name, 0, 0],
            })
          );
          await player.setLocation({ name: username }, "main", { x: 0, y: 0 });
          return;
        }

        // Send the player's location
        const map = (maps as any[]).find(
          (map: MapData) => map.name === `${location?.map}.json`
        );

        // Send default map if the player's location is not found
        if (!map) {
          log.error(`Unable to load map: ${location?.map}`);
          const defaultMap = (maps as any[]).find(
            (map: MapData) => map.name === "main.json"
          );

          if (!defaultMap) {
            log.error("Default map not found");
            return;
          }

          ws.send(
            JSON.stringify({
              type: PacketTypes[7],
              data: [defaultMap.data, defaultMap.hash, "main.json", 0, 0],
            })
          );

          log.debug(`Spawning player ${username} at main (0, 0)`);
          return;
        }

        // If the player's location is found, send the map data
        log.debug(`Spawning player ${username} at ${location?.map} (${position.x}, ${position.y})`)
        ws.send(
          JSON.stringify({
            type: PacketTypes[7],
            data: [map?.data, map?.hash, `${location?.map}.json`, position.x, position.y],
          })
        );
        break;
      }
      // Logout
      case PacketTypes[11]: {
        await player.logout(ws.data.id);
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

Object.freeze(PacketReceiver);

function tryParsePacket(data: any) {
  try {
    return JSON.parse(data.toString());
  } catch (e) {
    return null;
  }
}

Object.freeze(tryParsePacket);
