import query from "../controllers/sqldatabase";
import items from "./items";

const inventory = {
  // Check if the player has an item in their inventory by name
  async find(name: string, item: InventoryItem) {
    if (!name || !item.name) return;
    return await query(
      "SELECT * FROM inventory WHERE item = ? AND username = ?",
      [item.name, name]
    );
  },
  async add(name: string, item: InventoryItem) {
    if (!name || !item?.quantity || !item?.name) return;
    if (Number(item.quantity) <= 0) return;
    if (!await items.find({ name: item.name } as unknown as Item)) return;
    const response = (await inventory.find(name, item)) as InventoryItem[];
    
    if (response.length === 0)
      return await query(
        "INSERT IGNORE INTO inventory (username, item, quantity) VALUES (?, ?, ?)",
        [name, item.name, Number(item.quantity)]
      );
    return await query(
      "UPDATE inventory SET quantity = ? WHERE item = ? AND username = ?",
      [
        (Number(response[0].quantity) + Number(item.quantity)).toString(),
        item.name,
        name,
      ]
    );
  },
  async remove(name: string, item: InventoryItem) {
    if (!name || !item?.quantity || !item?.name) return;
    if (Number(item.quantity) <= 0) return;
    if (!await items.find({ name: item.name } as unknown as Item)) return;
    const response = (await inventory.find(name, item)) as InventoryItem[];
    if (response.length === 0) return;
    if (Number(item.quantity) >= Number(response[0].quantity))
      return await query(
        "DELETE FROM inventory WHERE item = ? AND username = ?",
        [item.name, name]
      );
    return await query(
      "UPDATE inventory SET quantity = ? WHERE item = ? AND username = ?",
      [
        (Number(response[0].quantity) - Number(item.quantity)).toString(),
        item.name,
        name,
      ]
    );
  },
  async delete(name: string, item: InventoryItem) {
    if (!name || !item.name) return;
    return await query(
      "DELETE FROM inventory WHERE item = ? AND username = ?",
      [item.name, name]
    );
  },
};

export default inventory;
