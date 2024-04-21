import path from "path";
import * as db from "../controllers/sqlitedatabase";
const inventory = {
    getData(name: string) {
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );
        let database = db.OpenDatabaseByName(playerPath);
        // Return an empty array if the database doesn't exist
        if (!database) return [];
        
        // Get the player's inventory
        const inventory = db.Query(
            database,
            `SELECT * FROM inventory`
        );
        database.close();
        return inventory;
    },
    addItem(name: string, item: InventoryItem) {
        if (!name || !item?.id || !item?.item || !item?.quantity || !item?.description) return;
        // Prevent negative quantities
        if (Number(item.quantity) <= 0) return;
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );
        let database = db.OpenDatabaseByName(playerPath);
        // Return an empty array if the database doesn't exist
        if (!database) return [];
        
        // Check if the item already exists in the player's inventory and quantity
        const inventory = db.Query(
            database,
            `SELECT * FROM inventory WHERE id = '${item.id}'`
        );

        // If the item doesn't exist, insert it
        if (inventory.length === 0) {
            db.Query(
                database,
                `INSERT INTO inventory (id, item, quantity, description) VALUES ('${item.id}', '${item.item}', '${item.quantity}', '${item.description}')`
            );
        } else {
            // If the item exists, update the quantity
            db.Query(
                database,
                `UPDATE inventory SET quantity = '${(Number(inventory[0].quantity) + Number(item.quantity))}' WHERE id = '${item.id}'`
            );
        }
        database.close();
    },
    removeItem(name: string, item: InventoryItem) {
        if (!name || !item.id || !item.quantity) return;
        // Prevent negative quantities
        if (Number(item.quantity) <= 0) return;
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );
        let database = db.OpenDatabaseByName(playerPath);
        // Return an empty array if the database doesn't exist
        if (!database) return [];
        
        // Check if the item already exists in the player's inventory and quantity
        const inventory = db.Query(
            database,
            `SELECT * FROM inventory WHERE id = '${item.id}'`
        );

        // If the item doesn't exist, insert it
        if (inventory.length != 0) {
            // Get the quantity of the item being removed and the quantity in the inventory and check if it's 0
            const quantity = Number(item.quantity);
            const inventoryQuantity = Number(inventory[0].quantity);
            if (inventoryQuantity - quantity <= 0) {
                // If the quantity is 0, remove the item from the inventory
                db.Query(
                    database,
                    `DELETE FROM inventory WHERE id = '${item.id}'`
                );
            } else {
                // If the quantity is greater than 0, update the quantity
                db.Query(
                    database,
                    `UPDATE inventory SET quantity = '${(inventoryQuantity - quantity)}' WHERE id = '${item.id}'`
                );
            }
        }
        database.close();
    },
    create(name: string) {
        if (!name) return;
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );
        let database = db.OpenDatabaseByName(playerPath);
        // Return an empty array if the database doesn't exist
        if (!database) return [];
        
        // Create the player's inventory table
        db.Query(
            database,
            `CREATE TABLE IF NOT EXISTS inventory (id TEXT UNIQUE, item TEXT, quantity TEXT, description TEXT)`
        );
        database.close();
    }
}

export default inventory;
