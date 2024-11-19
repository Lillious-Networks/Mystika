import query from "../controllers/sqldatabase";
import items from "./items";

const inventory = {
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
    if (!(await items.find({ name: item.name } as unknown as Item))) return;
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
    if (!(await items.find({ name: item.name } as unknown as Item))) return;
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
  async get(name: string) {
    if (!name) return [];
    
    // Fetch items for the user
    const items = await query("SELECT * FROM inventory WHERE username = ?", [name]) as any[];
    
    if (!items || items.length === 0) return []; // Return if no items found
  
    // Sanitize items by removing the username and id
    items.filter((item: any) => {
      delete item.username;
      delete item.id;
    });
  
    // Fetch and process details for each item
    const details = await Promise.all(
      items.map(async (item: any) => {
        // Fetch item details
        const [itemDetails] = await query("SELECT quality, description FROM items WHERE name = ?", [item.item]) as any[];
        
        // Merge item data with its details
        return {
          ...item,
          ...itemDetails,
        };
      })
    );
    return details;
  }
};

export default inventory;
