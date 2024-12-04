import { packetTypes } from "./types";
import log from "../modules/logger";
import player from "../systems/player";
import inventory from "../systems/inventory";
import cache from "../services/cache";
import assetCache from "../services/assetCache";
import language from "../systems/language";
import packet from "../modules/packet";

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
    if (message.length > 1024 * 1024)
      return ws.close(1009, "Message too large");
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
      case "BENCHMARK": {
        ws.send(
          packet.encode(JSON.stringify({ type: "BENCHMARK", data: data }))
        );
        break;
      }
      case "PING": {
        ws.send(packet.encode(JSON.stringify({ type: "PONG", data: data })));
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "TIME_SYNC",
              data: Date.now(),
            })
          )
        );
        break;
      }
      case "PONG": {
        ws.send(packet.encode(JSON.stringify({ type: "PING", data: data })));
        break;
      }
      case "LOGIN": {
        ws.send(
          packet.encode(
            JSON.stringify({ type: "LOGIN_SUCCESS", data: ws.data.id })
          )
        );
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
          packet.encode(
            JSON.stringify({
              type: "TIME_SYNC",
              data: ServerTime,
            })
          )
        );
        break;
      }
      case "AUTH": {
        // Set the session id for the player
        const auth = await player.setSessionId(data.toString(), ws.data.id);
        if (!auth) {
          ws.send(
            packet.encode(JSON.stringify({ type: "LOGIN_FAILED", data: null }))
          );
          ws.close(1008, "Already logged in");
          break;
        }
        const getUsername = (await player.getUsernameBySession(
          ws.data.id
        )) as any[];
        const username = getUsername[0]?.username as string;
        // Retrieve the player's inventory
        const items = (await inventory.get(username)) || [];
        if (items.length > 30) {
          items.length = 30;
        }
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "INVENTORY",
              data: items,
              slots: 30,
            })
          )
        );
        // Get the player's stats
        const stats = await player.getStats(username);
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "STATS",
              data: stats,
            })
          )
        );
        // Get client configuration
        const clientConfig = (await player.getConfig(username)) as any[];
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "CLIENTCONFIG",
              data: clientConfig,
            })
          )
        );
        const location = (await player.getLocation({
          username: username,
        })) as LocationData | null;
        const isAdmin = await player.isAdmin(username);
        let isStealth = await player.isStealth(username);
        // Turn off stealth mode if the player is not an admin and is in stealth mode
        if (!isAdmin && isStealth) {
          await player.toggleStealth(username);
          isStealth = false;
        }

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
            x: position.x || 0,
            y: position.y || 0,
            direction: position.direction,
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
          { x: spawnLocation.x, y: spawnLocation.y, direction: "down" }
        );

        cache.add(ws.data.id, {
          username,
          isAdmin,
          isStealth,
          id: ws.data.id,
          location: {
            map: spawnLocation.map.replace(".json", ""),
            position: {
              x: spawnLocation.x || 0,
              y: spawnLocation.y || 0,
              direction: "down",
            },
          },
          language: clientConfig[0].language,
          ws,
          stats,
          attackDelay: 0,
          lastMovementPacket: null,
        });
        log.debug(
          `Spawn location for ${username}: ${spawnLocation.map.replace(
            ".json",
            ""
          )} at ${spawnLocation.x},${spawnLocation.y}`
        );
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "LOAD_MAP",
              data: [
                map?.compressed,
                map?.hash,
                spawnLocation?.map,
                position.x || 0,
                position.y || 0,
                position.direction,
              ],
            })
          )
        );

        const playerCache = cache.list();
        // Load players for the current map only
        const players = Object.values(playerCache).filter(
          (p) =>
            p.location.map.replaceAll(".json", "") ===
            spawnLocation.map.replaceAll(".json", "")
        );

        const playerData = [] as any[];

        players.forEach((player) => {
          player.ws.send(
            packet.encode(
              JSON.stringify({
                type: "SPAWN_PLAYER",
                data: {
                  id: ws.data.id,
                  location: {
                    map: spawnLocation.map,
                    x: position.x || 0,
                    y: position.y || 0,
                    direction: position.direction,
                  },
                  username,
                  isAdmin,
                  isStealth,
                  stats,
                },
              })
            )
          );
        });

        players.forEach((player) => {
          const location = player.location;
          const data = {
            id: player.id,
            location: {
              map: location.map,
              x: location.position.x || 0,
              y: location.position.y || 0,
              direction: location.position.direction,
            },
            username: player.username,
            isAdmin: player.isAdmin,
            isStealth: player.isStealth,
            stats: player.stats,
          };
          playerData.push(data);
        });
        ws.send(
          packet.encode(
            JSON.stringify({
              type: "LOAD_PLAYERS",
              data: playerData,
            })
          )
        );
        break;
      }
      case "LOGOUT": {
        const _player = cache.get(ws.data.id) as any;
        await player.setLocation(_player.id, _player.location.map, _player.location.position);
        await player.logout(_player.id);
        break;
      }
      case "DISCONNECT": {
        const _player = cache.get(ws.data.id) as any;
        await player.setLocation(_player.id, _player.location.map, _player.location.position);
        await player.clearSessionId(_player.id);
        break;
      }
      case "MOVEXY": {
        const direction = data.toString().toLowerCase() as keyof typeof directionAdjustments;
        // Only allow the player to move in these directions
        const directions = ["up", "down", "left", "right", "upleft", "upright", "downleft", "downright"];
        if (!directions.includes(direction)) return;

        const speed = 2;
        const _player = cache.get(ws.data.id) as any;
        const time = performance.now();
        if (!_player.lastMovementPacket) {
          _player.lastMovementPacket = time;
        }
        /*
          Check if the player is moving too fast and ignore the packet.
          
          Due to the packet being dropped, the player will move at the normally
          enforced speed without the need to kick them.
        */
        if (time - _player.lastMovementPacket < 8 && time - _player.lastMovementPacket !== 0) return;

        _player.lastMovementPacket = time;

        const tempPosition = { ..._player.location.position };
        const collisionPosition = { ..._player.location.position };
        const tileSize = 16;
        // Center of the player
        const playerHeight = 48;
        const playerWidth = 32;
        collisionPosition.x += playerWidth / 2;
        collisionPosition.y += playerHeight / 2;

        const directionAdjustments = {
          up: {
              tempX: 0,
              tempY: -speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x + (tileSize * 2) / 2,
              collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          down: {
              tempX: 0,
              tempY: speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x + tileSize,
              collisionY: (tempPosition: PositionData) => tempPosition.y + tileSize * 2 + tileSize,
          },
          left: {
              tempX: -speed,
              tempY: 0,
              collisionX: (tempPosition: PositionData) => tempPosition.x,
              collisionY: (tempPosition: PositionData) => tempPosition.y + tileSize * 2 + tileSize / 2,
          },
          right: {
              tempX: speed,
              tempY: 0,
              collisionX: (tempPosition: PositionData) => tempPosition.x + tileSize * 2,
              collisionY: (tempPosition: PositionData) => tempPosition.y + tileSize * 2 + tileSize / 2,
          },
          upleft: {
              tempX: -speed,
              tempY: -speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x,
              collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          upright: {
              tempX: speed,
              tempY: -speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x + tileSize * 2,
              collisionY: (tempPosition: PositionData) => tempPosition.y,
          },
          downleft: {
              tempX: -speed,
              tempY: speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x,
              collisionY: (tempPosition: PositionData) => tempPosition.y + tileSize * 2 + tileSize,
          },
          downright: {
              tempX: speed,
              tempY: speed,
              collisionX: (tempPosition: PositionData) => tempPosition.x + tileSize * 2,
              collisionY: (tempPosition: PositionData) => tempPosition.y + tileSize * 2 + tileSize,
          },
      };

      if (!directionAdjustments[direction]) return;
      
        const adjustment = directionAdjustments[direction];
        tempPosition.x += adjustment.tempX;
        tempPosition.y += adjustment.tempY;
        collisionPosition.x = adjustment.collisionX(tempPosition);
        collisionPosition.y = adjustment.collisionY(tempPosition);


        const collision = player.checkIfWouldCollide(_player.location.map, collisionPosition);
        if (collision) return;

        _player.location.position = tempPosition;
        const playerCache = cache.list();
        if (_player.isStealth) {
          const players = Object.values(playerCache).filter(
            (p) =>
              p.isAdmin &&
              p.location.map.replaceAll(".json", "") ===
                _player.location.map.replaceAll(".json", "")
          );
          players.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: _player.location.position,
                  },
                })
              )
            );
          });
        } else {
          const players = Object.values(playerCache).filter(
            (p) =>
              p.location.map.replaceAll(".json", "") ===
              _player.location.map.replaceAll(".json", "")
          );
          players.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: _player.location.position,
                  },
                })
              )
            );
          });
        }
        break;
      }
      case "TELEPORTXY": {
        const _player = cache.get(ws.data.id) as any;
        if (!_player.isAdmin) return;
        _player.location.position = data;
        _player.location.position.direction = "down";
        if (_player.isStealth) {
          const playerCache = cache.list();
          const players = Object.values(playerCache).filter((p) => p.isAdmin);
          _player.location.position.x = Math.floor(Number(_player.location.position.x));
          _player.location.position.y = Math.floor(Number(_player.location.position.y));
          players.forEach((player) => {
            player.ws.send(
              packet.encode(
                JSON.stringify({
                  type: "MOVEXY",
                  data: {
                    id: ws.data.id,
                    _data: _player.location.position,
                  },
                })
              )
            );
          });
        } else {
          server.publish(
            "MOVEXY" as Subscription["event"],
            packet.encode(
              JSON.stringify({
                type: "MOVEXY",
                data: {
                  id: ws.data.id,
                  _data: _player.location.position,
                },
              })
            )
          );
        }
        break;
      }
      case "CHAT": {
        if (data.toString().length > 255) return;

        const _player = cache.get(ws.data.id) as any;
        if (!_player) return;

        // Send message to the sender
        const sendMessageToPlayer = (playerWs: any, message: string) => {
          playerWs.send(
            packet.encode(
              JSON.stringify({
                type: "CHAT",
                data: {
                  id: ws.data.id,
                  message,
                },
              })
            )
          );
        };

        sendMessageToPlayer(ws, data.toString());

        const playerCache = cache.list();
        let playersInMap = Object.values(playerCache).filter(
          (p) => p.location.map === _player.location.map && p.id !== ws.data.id
        );

        if (_player.isStealth) {
          // Filter only admins in the same map
          playersInMap = playersInMap.filter((p) => p.isAdmin);
        }

        const translations: Record<string, string> = {};

        playersInMap.forEach(async (player) => {
          if (!translations[player.language]) {
            translations[player.language] = await language.translate(
              data.toString(),
              player.language
            );
          }

          sendMessageToPlayer(player.ws, translations[player.language]);
        });

        break;
      }

      case "CLIENTCONFIG": {
        const _player = cache.get(ws.data.id) as any;
        const _data = data as any;
        _player.language = _data.language;
        await player.setConfig(ws.data.id, data);
        break;
      }
      case "SELECTPLAYER": {
        const location = data as unknown as LocationData;
        const playerCache = cache.list();
        // Get current player data from cache
        const player = cache.get(ws.data.id) as any;
        // only get players that are in the same map
        const players = Object.values(playerCache).filter(
          (p) => p.location.map === player.location.map
        );
        // Find the first player that is closest to the selected location within a 25px radius
        const selectedPlayer = players.find(
          (p) =>
            Math.abs(p.location.position.x - Math.floor(Number(location.x))) <
              25 &&
            Math.abs(p.location.position.y - Math.floor(Number(location.y))) <
              25
        );

        if (!selectedPlayer) {
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "SELECTPLAYER",
                data: null,
              })
            )
          );
          break;
        } else {
          if (selectedPlayer.isStealth && !player.isAdmin) {
            ws.send(
              packet.encode(
                JSON.stringify({
                  type: "SELECTPLAYER",
                  data: null,
                })
              )
            );
            break;
          }
          ws.send(
            packet.encode(
              JSON.stringify({
                type: "SELECTPLAYER",
                data: {
                  id: selectedPlayer.id,
                  username: selectedPlayer.username,
                  stats: selectedPlayer.stats,
                },
              })
            )
          );
        }
        break;
      }
      case "TARGETCLOSEST": {
        const playerCache = cache.list();
        const _player = cache.get(ws.data.id) as any;
        const players = Object.values(playerCache).filter(
          (p) => p.location.map === _player.location.map && p.id !== ws.data.id
        );
        const closestPlayer = await player.findClosestPlayer(
          _player,
          players,
          500
        );

        ws.send(
          packet.encode(
            JSON.stringify({
              type: "SELECTPLAYER",
              data: {
                id: closestPlayer?.id || null,
                username: closestPlayer?.username || null,
                stats: closestPlayer?.stats || null,
              },
            })
          )
        );
        break;
      }
      case "STEALTH": {
        const _player = cache.get(ws.data.id);
        if (!_player || !_player.isAdmin) return;
        const isStealth = await player.toggleStealth(_player.username);
        _player.isStealth = isStealth;
        server.publish(
          "STEALTH" as Subscription["event"],
          packet.encode(
            JSON.stringify({
              type: "STEALTH",
              data: {
                id: ws.data.id,
                isStealth: isStealth,
              },
            })
          )
        );
        // Send the player's new position to all players when they toggle stealth mode off
        if (!isStealth) {
          server.publish(
            "MOVEXY" as Subscription["event"],
            packet.encode(
              JSON.stringify({
                type: "MOVEXY",
                data: {
                  id: ws.data.id,
                  _data: _player.location.position,
                },
              })
            )
          );
        }
        break;
      }
      case "ATTACK": {
        const _player = cache.get(ws.data.id);
        if (_player.attackDelay > Date.now()) return;
        const _data = data as any;
        const target = cache.get(_data.id);
        if (!target) return;
        // Check if the player can attack
        if (!(await player.canAttack(_player, target, 60))) return;

        const damage = 5;
        target.stats.health -= damage;

        if (target.stats.health <= 0) {
          target.stats.health = 100;
          target.location.position = { x: 0, y: 0, direction: "down" };
          server.publish(
            "MOVEXY" as Subscription["event"],
            packet.encode(
              JSON.stringify({
                type: "MOVEXY",
                data: {
                  id: target.id,
                  _data: target.location.position,
                },
              })
            )
          );
          server.publish(
            "REVIVE" as Subscription["event"],
            packet.encode(
              JSON.stringify({
                type: "REVIVE",
                data: {
                  id: ws.data.id,
                  target: target.id,
                  stats: target.stats,
                },
              })
            )
          );
        } else {
          server.publish(
            "UPDATESTATS" as Subscription["event"],
            packet.encode(
              JSON.stringify({
                type: "UPDATESTATS",
                data: {
                  id: ws.data.id,
                  target: target.id,
                  stats: target.stats,
                },
              })
            )
          );
        }

        player.setStats(target.username, target.stats);
        _player.attackDelay = Date.now() + 1000;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        _player.attackDelay = 0;

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
    log.error(e as string);
    return undefined;
  }
}
