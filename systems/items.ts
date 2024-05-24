import query from "../controllers/sqldatabase";

const items = {
  async add(item: Item) {
    if (!item?.name || !item?.quality || !item?.description) return;
    return await query(
      "INSERT IGNORE INTO items (name, quality, description) VALUES (?, ?, ?)",
      [item.name, item.quality, item.description]
    );
  },
  async remove(item: Item) {
    if (!item?.name) return;
    return await query("DELETE FROM items WHERE name = ?", [item.name]);
  },
  async list() {
    return await query("SELECT * FROM items");
  },
  async find(item: Item) {
    if (!item?.name) return;
    const response = await query("SELECT * FROM items WHERE name = ?", [item.name]);
    return response;
  }
};

export default items;
