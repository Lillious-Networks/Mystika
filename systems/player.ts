import query from "../controllers/sqldatabase";
import { hash, randomBytes } from "../modules/hash";

const player = {
    register: async (username: string, password: string, email: string, req: any) => {
        if (!username || !password || !email) return;

        // Validate field lengths
        if (username.length < 5 || password.length < 5 || email.length < 5) return;

        // Validate email format
        if (!email.includes("@") || !email.includes(".")) return;

        // Check if the user exists by username
        const usernameExists = await player.findByUsername(username);
        if (usernameExists) return;

        // Check if the user exists by email
        const emailExists = await player.findByEmail(email);
        if (emailExists) return;

        const response = await query(
            "INSERT INTO accounts (email, username, password_hash, ip_address, geo_location) VALUES (?, ?, ?, ?, ?)",
            [
              email,
              username,
              hash(password),
              req.ip,
              req.headers["cf-ipcountry"],
            ]
          )

          if (!response) return;
          return username;
    },
    findByUsername: async (username: string) => {
        if (!username) return;
        const response = await query("SELECT username FROM accounts WHERE username = ?", [username]);
        return response;
    },
    findByEmail: async (email: string) => {
        if (!email) return;
        const response = await query("SELECT email FROM accounts WHERE email = ?", [email]);
        return response;
    },
    getLocation: async (player: Player) => {
        if (!player?.name) return;
        const response = await query("SELECT map, position FROM accounts WHERE username = ?", [player.name]) as LocationData[];
        const map = response[0]?.map as string;
        const position = {
            x: Number(response[0]?.position?.split(",")[0]),
            y: Number(response[0]?.position?.split(",")[1]),
        } as PositionData;

        if (!map || (!position.x && position.x.toString() != '0') || (!position.y && position.y.toString() != '0')) {
            return null;
        }

        return { map, position };
    },
    setLocation: async (player: Player, map: string, position: PositionData) => {
        if (!player?.name || !map || !position) return;
        const response = await query("UPDATE accounts SET map = ?, position = ? WHERE username = ?", [map, `${position.x},${position.y}`, player.name]);
        return response;
    },
    setSessionId: async (token: string, sessionId: string) => {
        if (!token || !sessionId) return;
        const response = await query("UPDATE accounts SET session_id = ? WHERE token = ?", [sessionId, token]);
        return response;
    },
    getSessionId: async (token: string) => {
        if (!token) return;
        const response = await query("SELECT session_id FROM accounts WHERE token = ?", [token]);
        return response;
    },
    logout: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("UPDATE accounts SET token = NULL WHERE session_id = ?", [session_id]);
        return response;
    },
    clearSessionId: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("UPDATE accounts SET session_id = NULL WHERE session_id = ?", [session_id]);
        return response;
    },
    login: async (username: string, password: string) => {
        if (!username || !password) return;
        // Validate credentials
        const response = await query("SELECT username FROM accounts WHERE username = ? AND password_hash = ?", [username, hash(password)]);
        return response;
    },
    getUsername: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("SELECT username FROM accounts WHERE session_id = ?", [session_id]);
        return response;
    },
    setToken: async (username: string) => {
        const token = randomBytes(32);
        if (!username || !token) return;
        const response = await query("UPDATE accounts SET token = ? WHERE username = ?", [token, username]);
        if (!response) return;
        return token;
    },
};

export default player;