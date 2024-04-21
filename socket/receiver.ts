import { PacketTypes } from "./server";
import { GetMaps } from "../modules/assetloader";
import log from "../modules/logger";
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
        //console.log("Received PING");
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
        //console.log("Received PONG");
        ws.send(JSON.stringify({ type: PacketTypes[0], data: data }));
        break;
      }
      // LOGIN
      case PacketTypes[4]: {
        log.success(`Client with id: ${ws.data.id} logged in`);
        // Send a message to the client to load the main map
        ws.send(
          JSON.stringify({ type: PacketTypes[5], data: "Login successful" })
        );
        // Get the map named main.json from the maps array
        const map = (maps as any[]).find(
          (map: MapData) => map.name === "main.json"
        );
        if (!map) return;
        // Send the map data to the client
        ws.send(
          JSON.stringify({
            type: PacketTypes[7],
            data: [map.data, map.hash, map.name],
          })
        );
        break;
      }
      case PacketTypes[8]: {
        // Calculate latency
        const latency = Date.now() - Number(data) - 5000;
        if (latency >= 100) {
          console.log(`Client with id: ${ws.data.id} has high latency: ${latency}ms and will be disconnected`);
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
      // Unknown packet type
      default: {
        //console.log("Unknown packet type");
        break;
      }
    }
  } catch (e) {
    console.error(e);
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
