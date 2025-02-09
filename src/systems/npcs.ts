import query from "../controllers/sqldatabase";
import assetCache from "../services/assetCache";

const npcs = {
  async add(npc: Npc) {
    if (!npc || !npc?.map || !npc?.position) return;
    const last_updated = Date.now();
    const hidden = npc.hidden ? 1 : 0;
    const x = npc.position.x || 0;
    const y = npc.position.y || 0;
    const direction = npc.position.direction || "down";

    const response = await query(
      "INSERT INTO npcs (last_updated, map, position, direction, hidden, script, dialog) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        last_updated,
        npc.map,
        `${x},${y}`,
        direction,
        hidden,
        npc.script || null,
        npc.dialog || null,
      ]
    );

    // Update asset cache
    assetCache.set("npcs", response);

    return response;
  },

  async remove(npc: Npc) {
    if (!npc?.id) return;
    const response = await query("DELETE FROM npcs WHERE id = ?", [npc.id]);

    // Update asset cache
    assetCache.set("npcs", response);

    return response;
  },

  async list() {
    const response = (await query("SELECT * FROM npcs")) as any[];
    const map = response[0]?.map as string;
    const position: PositionData = {
      x: Number(response[0]?.position?.split(",")[0]),
      y: Number(response[0]?.position?.split(",")[1]),
      direction: response[0]?.direction || "down",
    };
    const hidden = response[0]?.hidden as number;
    const script = response[0]?.script as string;

    const npcs: Npc[] = [
      {
        id: response[0]?.id as number,
        last_updated: (response[0]?.last_updated as number) || null,
        map,
        position,
        hidden: hidden === 1 ? true : false,
        script,
        dialog: response[0]?.dialog as string,
      },
    ];

    return npcs;
  },

  async find(npc: Npc) {
    if (!npc?.id) return;
    const response = await query("SELECT * FROM npcs WHERE id = ?", [npc.id]);

    // Update asset cache
    assetCache.set("npcs", response);

    return response;
  },

  async update(npc: Npc) {
    if (!npc?.id || !npc?.map || !npc?.position) return;
    const last_updated = Date.now();
    const hidden = npc.hidden ? 1 : 0;
    const x = npc.position.x || 0;
    const y = npc.position.y || 0;
    const direction = npc.position.direction;

    const response = await query(
      "UPDATE npcs SET last_updated = ?, map = ?, position = ?, direction = ?, hidden = ?, script = ?, dialog = ? WHERE id = ?",
      [
        last_updated,
        npc.map,
        `${x},${y}`,
        direction,
        hidden,
        npc.script,
        npc.dialog,
        npc.id,
      ]
    );

    // Update asset cache
    assetCache.set("npcs", response);

    return response;
  },

  async move(npc: Npc) {
    if (!npc?.id || !npc?.position) return;
    const last_updated = Date.now();

    const response = await query(
      "UPDATE npcs SET last_updated = ?, position = ? WHERE id = ?",
      [last_updated, JSON.stringify(npc.position), npc.id]
    );

    // Update asset cache
    assetCache.set("npcs", response);

    return response;
  },
};

export default npcs;
