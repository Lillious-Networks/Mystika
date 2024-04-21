import * as db from "../controllers/sqlitedatabase.ts";
import inventory from "./inventory.ts";
import path from "path";

const player = {
    create(name: string) {
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );

        let database = db.OpenDatabaseByName(playerPath);
        if (database) {
            database.close();
            return;
        }

        // Create the database
        database = db.CreateDatabase(playerPath);
        
        // Create the player table
        db.Query(
            database,
            `CREATE TABLE player (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT
            )`
        );

        // Insert the player's name
        db.Query(
            database,
            `INSERT INTO player (name) VALUES ('${name}')`
        );

        // Create the player's inventory table
        inventory.create(name);
        database.close();
    },
    delete(name: string) {
        // Remove the database file
        const playerPath = path.join(
            import.meta.dir,
            `..`,
            `playerdata`,
            `${name}.sqlite`
        );
        db.DeleteDatabase(playerPath);
    },
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

        // Get the player data
        const playerData = db.Query(database, `SELECT * FROM player`);
        database.close();
        return playerData;
    },
    getInventory(name: string) {
        return inventory.getData(name);
    },
}

export default player;