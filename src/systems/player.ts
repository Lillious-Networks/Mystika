import query from "../controllers/sqldatabase";
import { hash, randomBytes } from "../modules/hash";
import log from "../modules/logger";
import assetCache from "../services/assetCache";

const player = {
    clear: async () => {
        // Clear all session_ids, set online to 0, and clear all tokens
        await query("UPDATE accounts SET session_id = NULL, online = 0, token = NULL;");
    },    
    register: async (username: string, password: string, email: string, req: any) => {
        if (!username || !password || !email) return;
        // Validate field lengths
        if (username.length < 5 || password.length < 5 || email.length < 5) return;

        // Validate email format
        if (!email.includes("@") || !email.includes(".")) return;

        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(email)) return;

        // Check if the user exists by username
        const usernameExists = await player.findByUsername(username) as string[];
        if (usernameExists && usernameExists.length != 0) return;

        // Check if the user exists by email
        const emailExists = await player.findByEmail(email) as string[];
        if (emailExists && emailExists.length != 0) return;

        const response = await query(
            "INSERT INTO accounts (email, username, token, password_hash, ip_address, geo_location, map, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              email,
              username,
              "", // empty token
              hash(password),
              req.ip,
              req.headers["cf-ipcountry"],
              "main",
              "0,0"
            ]
          ).catch((err) => {
            log.error(err);
            return;
          });
          if (!response) return;

        await query("INSERT INTO stats (username, health, max_health, stamina, max_stamina) VALUES (?, ?, ?, ?, ?)", [username, 100, 100, 100, 100]);
        await query("INSERT INTO clientconfig (username, fps, music_volume, effects_volume, muted) VALUES (?, ?, ?, ?, ?)", [username, 60, 100, 100, 0]);
        return username;
    },
    findByUsername: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT username FROM accounts WHERE username = ?", [username]);
        return response || [];
    },
    findByEmail: async (email: string) => {
        if (!email) return;
        const response = await query("SELECT email FROM accounts WHERE email = ?", [email]);
        return response;
    },
    getLocation: async (player: Player) => {
        const username = player.username || player.id;
        const response = await query("SELECT map, position, direction FROM accounts WHERE username = ? OR session_id = ?", [username, username]) as LocationData[];
        const map = response[0]?.map as string;
        const position: PositionData = {
            x: Number(response[0]?.position?.split(",")[0]),
            y: Number(response[0]?.position?.split(",")[1]),
            direction: response[0]?.direction || "down"
        };

        if (!map || (!position.x && position.x.toString() != '0') || (!position.y && position.y.toString() != '0')) {
            return null;
        }

        return { map, position };
    },
    setLocation: async (session_id: string, map: string, position: PositionData) => {
        if (!session_id || !map || !position) return;
        const response = await query("UPDATE accounts SET map = ?, position = ?, direction = ? WHERE session_id = ?", [map, `${position.x},${position.y}`, position.direction, session_id]);
        return response;
    },
    setSessionId: async (token: string, sessionId: string) => {
        if (!token || !sessionId) return;
        // Check if the user already has a session id
        const sessionExists = await player.getSessionId(token) as any[];
        if (sessionExists[0]?.session_id) {
            if (sessionExists[0]?.session_id != sessionId) return;
        }
        const getUsername = await player.getUsernameByToken(token) as any[];
        const username = await getUsername[0]?.username as string;
        const isBanned = await player.isBanned(username) as any[];
        const response = await query("UPDATE accounts SET session_id = ?, online = ? WHERE token = ?", [sessionId, 1, token]);
        if (isBanned[0]?.banned === 1) {
            log.debug(`User ${username} is banned`);
            await player.logout(sessionId);
            return;
        }
        return response;
    },
    getSessionId: async (token: string) => {
        if (!token) return;
        const response = await query("SELECT session_id FROM accounts WHERE token = ?", [token]);
        return response;
    },
    logout: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("UPDATE accounts SET token = NULL, online = ?, session_id = NULL WHERE session_id = ?", [0, session_id]);
        return response;
    },
    clearSessionId: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("UPDATE accounts SET session_id = NULL, online = ? WHERE session_id = ?", [0, session_id]);
        return response;
    },
    login: async (username: string, password: string) => {
        if (!username || !password) return;
        // Validate credentials
        const response = await query("SELECT username FROM accounts WHERE username = ? AND password_hash = ?", [username, hash(password)]) as string[];
        if (response.length === 0) {
            log.debug(`User ${username} failed to login`);
            return;
        }

        // Check if a token exists and use it
        const _token = await query("SELECT token FROM accounts WHERE username = ?", [username]) as any;
        // Assign a token to the user
        const token = _token[0]?.token || await player.setToken(username);

        log.debug(`User ${username} logged in`);
        // Update last_login
        await query("UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE username = ?", [username]);
        return token;
    },
    getUsernameBySession: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("SELECT username FROM accounts WHERE session_id = ?", [session_id]);
        return response;
    },
    getUsernameByToken: async (token: string) => {
        if (!token) return;
        const response = await query("SELECT username FROM accounts WHERE token = ?", [token]);
        return response;
    },
    getEmail: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("SELECT email FROM accounts WHERE session_id = ?", [session_id]);
        return response;
    },
    returnHome: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("UPDATE accounts SET map = 'main', position = '0,0' WHERE session_id = ?", [session_id]);
        return response;
    },
    setToken: async (username: string) => {
        const token = randomBytes(32);
        if (!username || !token) return;
        const response = await query("UPDATE accounts SET token = ? WHERE username = ?", [token, username]);
        if (!response) return;
        return token;
    },
    isOnline: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT online FROM accounts WHERE username = ?", [username]);
        return response;
    },
    isBanned: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT banned FROM accounts WHERE username = ?", [username]);
        return response;
    },
    getPlayers: async (map: string) => {
        const response = await query("SELECT username, session_id as id, position, map FROM accounts WHERE online = 1 and map = ?", [map]);
        return response;
    },
    getMap: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("SELECT map FROM accounts WHERE session_id = ?", [session_id]) as any;
        return response[0]?.map as string
    },
    isAdmin: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT role FROM accounts WHERE username = ?", [username]) as any;
        return response[0]?.role === 1;
    },
    isStealth: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT stealth FROM accounts WHERE username = ?", [username]) as any;
        return response[0]?.stealth === 1;
    },
    toggleStealth: async (username: string) => {
        if (!username) return;
        await query("UPDATE accounts SET stealth = !stealth WHERE username = ?", [username]) as any;
        return await player.isStealth(username);
    },
    getSession: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT session_id FROM accounts WHERE username = ?", [username]) as any;
        return response[0]?.session_id;
    },
    getStats: async (username: string) => {
        // Grab the stats from the database
        const response = await query("SELECT max_health, health, max_stamina, stamina FROM stats WHERE username = ?",
            [username]) as StatsData[];
            
        if (!response || response.length === 0) return [];
        return {
            health: response[0].health,
            max_health: response[0].max_health,
            stamina: response[0].stamina,
            max_stamina: response[0].max_stamina
        };
    },
    setStats: async (username: string, stats: StatsData) => {
        if (!stats.health || !stats.max_health || !stats.stamina || !stats.max_stamina) return;
        // Tell the database to update the stats
        const response = await query("UPDATE stats SET health = ?, max_health = ?, stamina = ?, max_stamina = ? WHERE username = ?", [stats.health, stats.max_health, stats.stamina, stats.max_stamina, username]);
        // Do the thing
        if (!response) return [];
        return response ;
    },
    getConfig: async (username: string) => {
        const response = await query("SELECT * FROM clientconfig WHERE username = ?", [username]);
        return response || [];
    },
    setConfig: async (session_id: string, data: any) => {
        if (!data.fps || !data.music_volume || !data.effects_volume || typeof data.muted != 'boolean' || !data.language) return [];
        const result = await query("SELECT username FROM accounts WHERE session_id = ?", [session_id]) as any;
        if (!result[0].username) return [];
        const response = await query("UPDATE clientconfig SET fps = ?, music_volume = ?, effects_volume = ?, muted = ?, language = ? WHERE username = ?", [data.fps, data.music_volume, data.effects_volume, data.muted, data.language, result[0].username]);
        if (!response) return [];
        return response;
    },
    checkIfWouldCollide: (map: string, position: PositionData) => {
        // Retrieve collision data for the map
        const collisionData = assetCache.get(map.replace(".json", ""));
        if (!collisionData) {
            log.error(`Collision data for map ${map} not found`);
            return false;
        }

        const data = collisionData.collision || collisionData; // Use directly if collision is not a property
        if (!data || !Array.isArray(data)) {
            log.error(`Collision data for map ${map} is invalid`);
            return false;
        }

        const tileSize = 16;
        const gridWidth = data[0];
        const gridOffset = data[0] / 2;
        const collision = data.slice(2) as any[];
    
        // Calculate the tile index based on position and tile size
        const x = Math.floor(position.x / tileSize) + gridOffset;
        const y = Math.floor(position.y / tileSize) + gridOffset;
        const targetIndex = y * gridWidth + x;
        
        let currentIndex = 0;
        let index = -1;
        for (let i = 0; i < collision.length; i += 2) {
            const value = collision[i];
            const count = collision[i + 1];
            if (currentIndex + count > targetIndex) {
                index = value;
                break;
            }
            currentIndex += count;
        }
    
        if (index !== -1) {
            return index != 0;
        } else {
            return false;
        }
    },
    kick: async (username: string, ws: WebSocket) => {
        if (!username) return;
        player.logout(username);
        ws.close();
    },
    ban: async (username: string, ws: WebSocket) => {
        if (!username) return;
        player.kick(username, ws);
        const response = await query("UPDATE accounts SET banned = 1 WHERE username = ?", [username]);
        return response;
    },
    canAttack: (self: Player, target: Player, range: number): boolean => {
        // No self or target or no range
        if (!self || !target || !range) return false;

        // Prevent attacks on self
        if (self.id === target.id) return false;

        // Ensure self is not dead
        if (!self.stats || self.stats.health <= 0) return false;

        // Check if the target is in the same map
        if (!self.location || !target.location || target.location.map !== self.location.map) return false;

        if (self.isStealth  || target.isStealth) return false;

        // Get direction and position data
        const targetPosition = target.location.position as unknown as PositionData;
        const selfPosition = self.location.position as unknown as PositionData;
        const direction = selfPosition.direction;
        
        if (direction === "up" && (selfPosition.y - targetPosition.y <= range
            && selfPosition.y - targetPosition.y >= 0)
            && (Math.abs(selfPosition.x - targetPosition.x) <= range)) return true;

        if (direction === "down" && (targetPosition.y - selfPosition.y <= range
            && targetPosition.y - selfPosition.y >= 0)
            && (Math.abs(selfPosition.x - targetPosition.x) <= range)) return true;

        if (direction === "left" && (selfPosition.x - targetPosition.x <= range
            && selfPosition.x - targetPosition.x >= 0)
            && (Math.abs(selfPosition.y - targetPosition.y) <= range)) return true;

        if (direction === "right" && (targetPosition.x - selfPosition.x <= range
            && targetPosition.x - selfPosition.x >= 0)
            && (Math.abs(selfPosition.y - targetPosition.y) <= range)) return true;
        
        if (direction === "up-left" && (selfPosition.y - targetPosition.y <= range
            && selfPosition.y - targetPosition.y >= 0)
            && (selfPosition.x - targetPosition.x <= range
            && selfPosition.x - targetPosition.x >= 0)) return true;

        if (direction === "up-right" && (selfPosition.y - targetPosition.y <= range
            && selfPosition.y - targetPosition.y >= 0)
            && (targetPosition.x - selfPosition.x <= range
            && targetPosition.x - selfPosition.x >= 0)) return true;

        if (direction === "down-left" && (targetPosition.y - selfPosition.y <= range
            && targetPosition.y - selfPosition.y >= 0)
            && (selfPosition.x - targetPosition.x <= range
            && selfPosition.x - targetPosition.x >= 0)) return true;

        if (direction === "down-right" && (targetPosition.y - selfPosition.y <= range
            && targetPosition.y - selfPosition.y >= 0)
            && (targetPosition.x - selfPosition.x <= range
            && targetPosition.x - selfPosition.x >= 0)) return true;

        return false;
    },
    findClosestPlayer: async (self: Player, players: Player[], range: number): Promise<NullablePlayer> => {
        if (!players) return null;
        if (!self.location?.position) return null;

        let closestPlayer = null;
        let closestDistance = range;
        const selfPosition = self.location.position as unknown as PositionData;
        for (const player of players) {
            if (player.location) {
                const position = player.location.position as unknown as PositionData;
                const distance = Math.sqrt(Math.pow(selfPosition.x - position.x, 2) + Math.pow(selfPosition.y - position.y, 2));
                if (player.isStealth) continue;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlayer = player;
                }                
            }
        }
        return closestPlayer;
    }
};

export default player;