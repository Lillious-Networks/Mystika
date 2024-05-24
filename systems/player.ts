import query from "../controllers/sqldatabase";

const player = {
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
        const response = await query("UPDATE accounts SET session_id = NULL, token = NULL WHERE session_id = ?", [session_id]);
        return response;
    },
    getUsername: async (session_id: string) => {
        if (!session_id) return;
        const response = await query("SELECT username FROM accounts WHERE session_id = ?", [session_id]);
        return response;
    },
};

export default player;