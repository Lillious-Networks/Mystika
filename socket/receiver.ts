import { PacketTypes } from "./server";
import { GetMaps } from "../modules/assetloader";
import log from "../modules/logger";
import player from "../systems/player";
const maps = GetMaps();

export default async function PacketReceiver(ws: any, message: string) {
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
    if (!type || (!data && data != null)) return ws.close(1007, "Malformed message");
    // Check if the packet type is valid
    if (Object.values(PacketTypes).indexOf(parsedMessage?.type as string) === -1) ws.close(1007, "Invalid packet type");

    // Handle the packet
    switch (type) {
      case 'PING': {
        ws.send(JSON.stringify({ type: 'PONG', data: data }));
        ws.send(
          JSON.stringify({
            type: 'TIME_SYNC',
            data: Date.now(),
          })
        );
        break;
      }
      case 'PONG': {
        ws.send(JSON.stringify({ type: 'PING', data: data }));
        break;
      }
      case 'LOGIN': {
        log.success(`Client with id: ${ws.data.id} logged in`);
        ws.send(JSON.stringify({ type: 'LOGIN_SUCCESS', data: ws.data.id }));
        break;
      }
      case 'TIME_SYNC': {
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
            type: 'TIME_SYNC',
            data: ServerTime,
          })
        );
        break;
      }
      case 'AUTH': {
        // Set the session id for the player
        await player.setSessionId(data.toString(), ws.data.id);
        const getUsername = (await player.getUsername(ws.data.id)) as any[];
        const username = getUsername[0]?.username as string;
        const location = (await player.getLocation({
          name: username,
        })) as LocationData | null;
        const position = location?.position as unknown as PositionData;

        if (
          !location ||
          (!position?.x && position.x.toString() != "0") ||
          (!position?.y && position.y.toString() != "0")
        ) {
          log.error("Malformed location data, spawning player at main (0, 0)");
          const map = (maps as any[]).find(
            (map: MapData) => map.name === "main.json"
          );
          if (!map) return;

          ws.send(
            JSON.stringify({
              type: 'LOAD_MAP',
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
              type: 'LOAD_MAP',
              data: [defaultMap.data, defaultMap.hash, "main.json", 0, 0],
            })
          );

          log.debug(`Spawning player ${username} at main (0, 0)`);
          return;
        }

        // If the player's location is found, send the map data
        log.debug(
          `Spawning player ${username} at ${location?.map} (${position.x}, ${position.y})`
        );
        ws.send(
          JSON.stringify({
            type: 'LOAD_MAP',
            data: [
              map?.data,
              map?.hash,
              `${location?.map}.json`,
              position.x,
              position.y,
            ],
          })
        );
        break;
      }
      case 'LOGOUT': {
        await player.logout(ws.data.id);
        break;
      }
      case 'DISCONNECT': {
        await player.clearSessionId(ws.data.id);
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
  } catch (e) {
    return null;
  }
}
