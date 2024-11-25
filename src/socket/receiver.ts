import { packetTypes } from "./types";
import log from "../modules/logger";
import player from "../systems/player";
import inventory from "../systems/inventory";
import cache from "../services/cache";
import assetCache from "../services/assetCache";
import language from "../systems/language";

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
    if (message.length > 1024 * 1024) return ws.close(1009, "Message too large");
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
        ws.send(JSON.stringify({ type: "BENCHMARK", data: data }));
        break;
      }
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
        const clientConfig = await player.getConfig(username) as any[];
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
            x: position.x,
            y: position.y,
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
            position: { x: spawnLocation.x, y: spawnLocation.y, direction: "down" },
          },
          language: clientConfig[0].language,
          ws,
          stats,
          attackDelay: 0,
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
              position.direction,
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
                direction: position.direction,
              },
              username,
              isAdmin,
              isStealth,
              stats,
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
            _player.location.position.direction = "down";
          }

          // Up
          if (axis === "y" && direction === -1) {
            tempPosition.y -= 24;
            _player.location.position.direction = "up";
          }          

          // Right
          if (axis === "x" && direction === 1) {
            tempPosition.x += 16;
            _player.location.position.direction = "right";
          }

          // Left
          if (axis === "x" && direction === -1) {
            tempPosition.x -= 16;
            _player.location.position.direction = "left";
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
            // Send the player's new position to only admins if the player is in stealth mode
            if (_player.isStealth) {
              // Get all admin players
              const playerCache = cache.list();
              const players = Object.values(playerCache).filter(
                (p) => p.isAdmin
              );
              players.forEach((player) => {
                player.ws.send(
                  JSON.stringify({
                    type: "MOVEXY",
                    data: {
                      id: ws.data.id,
                      _data: _player.location.position
                    },
                  })
                );
              });
            } else {
              // Send the player's new position to all players
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
          const players = Object.values(playerCache).filter(
            (p) => p.isAdmin
          );
          players.forEach((player) => {
            player.ws.send(
              JSON.stringify({
                type: "MOVEXY",
                data: {
                  id: ws.data.id,
                  _data: _player.location.position
                },
              })
            );
          });
        } else {
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
        break;
      }
      case "CHAT": {
        if (data.toString().length > 255) return;
        const _player = cache.get(ws.data.id) as any;
        if (!_player) return;
        if (_player.isStealth) {
          const playerCache = cache.list();
          const players = Object.values(playerCache).filter(
            (p) => p.isAdmin
          );
          players.forEach((player) => {
            player.ws.send(
              JSON.stringify({
                type: "CHAT",
                data: {
                  id: ws.data.id,
                  message: data.toString(),
                },
              })
            );
          });
        } else {
          server.publish(
            "CHAT" as Subscription["event"],
            JSON.stringify({
              type: "CHAT",
              data: {
                id: ws.data.id,
                message: data.toString(),
              },
            })
          );
        }
        break;
      }
      case "TRANSLATE": {
        const _player = cache.get(ws.data.id) as any;
        const _data = data as any;
        const translation = await language.translate(_data.text, _player.language);
        ws.send(
          JSON.stringify({
            type: "TRANSLATE",
            data: {
              id: _data.id,
              translation,
              message: _data.text,
            }
          })
        );
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
            Math.abs(p.location.position.x - Math.floor(Number(location.x))) < 25 &&
            Math.abs(p.location.position.y - Math.floor(Number(location.y))) < 25
        );


        if (!selectedPlayer) {
          ws.send(
            JSON.stringify({
              type: "SELECTPLAYER",
              data: null,
            })
          );
          break;
        } else {
          if (selectedPlayer.isStealth && !player.isAdmin) {
            ws.send(
              JSON.stringify({
                type: "SELECTPLAYER",
                data: null,
              })
            );
            break;
          }
          ws.send(
            JSON.stringify({
              type: "SELECTPLAYER",
              data: {
                id: selectedPlayer.id,
                username: selectedPlayer.username,
                isAdmin: selectedPlayer.isAdmin,
              },
            })
          );
        }
        break;
      }
      case "STEALTH": {
        const _player = cache.get(ws.data.id);
        if (!_player || !_player.isAdmin) return;
        const isStealth = await player.toggleStealth(_player.username);
        _player.isStealth = isStealth;
        server.publish(
          "STEALTH" as Subscription["event"],
          JSON.stringify({
            type: "STEALTH",
            data: {
              id: ws.data.id,
              isStealth: isStealth,
            },
          })
        );
        // Send the player's new position to all players when they toggle stealth mode off
        if (!isStealth) {
          server.publish(
            "MOVEXY" as Subscription["event"],
            JSON.stringify({
              type: "MOVEXY",
              data: {
                id: ws.data.id,
                _data: _player.location.position
              },
            })
          );
        }
        break;
      }
      case "ATTACK": {
        const _player = cache.get(ws.data.id);
        if (_player.attackDelay > Date.now()) return;
        const _data = data as any;
        const target = cache.get(_data.id);
        const _playerPos = _player.location.position;
        const targetPos = target.location.position;
        if (_player.location.map !== target.location.map) return;

        // Check if the target is in the correct direction that the player is facing and not behind them
        let distance = 0;
        if (_playerPos.direction === "down") {
          distance = Math.abs(targetPos.y - _playerPos.y);
        } else if (_playerPos.direction === "up") {
          distance = Math.abs(_playerPos.y - targetPos.y);
        }
        if (_playerPos.direction === "right") {
          distance = Math.abs(targetPos.x - _playerPos.x);
        } else if (_playerPos.direction === "left") {
          distance = Math.abs(_playerPos.x - targetPos.x);
        }
        if (distance > 60) return;
        // Check if the target is in stealth mode
        if (target.isStealth) return
        // Check if the target is in the correct direction that the player is facing and not behind them

        const damage = 5;
        target.stats.health -= damage;
        
        if (target.stats.health <= 0) {
          target.stats.health = 100;
          target.location.position = { x: 0, y: 0, direction: "down" };
          server.publish(
            "MOVEXY" as Subscription["event"],
            JSON.stringify({
              type: "MOVEXY",
              data: {
                id: target.id,
                _data: target.location.position
              },
            })
          );
          server.publish(
            "REVIVE" as Subscription["event"],
            JSON.stringify({
              type: "REVIVE",
              data: {
                id: ws.data.id,
                target: target.id,
                stats: target.stats,
              },
            })
          );
        } else {
          server.publish(
            "UPDATESTATS" as Subscription["event"],
            JSON.stringify({
              type: "UPDATESTATS",
              data: {
                id: ws.data.id,
                target: target.id,
                stats: target.stats,
              },
            })
          );
        }

        player.setStats(target.username, target.stats);
        _player.attackDelay = Date.now() + 100;
        await new Promise((resolve) => setTimeout(resolve, 100));
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
  } catch (e: any) {
    return undefined;
  }
}
