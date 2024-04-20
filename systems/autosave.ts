import * as db from "../controllers/sqlitedatabase.ts";
import log from "../modules/logger.ts";
import path from "node:path";
import fs from "node:fs";

// Create the playerdata directory if it doesn't exist
const playerDataPath = path.join(import.meta.dir, `..`, `playerdata`);
if (!fs.existsSync(playerDataPath)) {
  fs.mkdirSync(playerDataPath);
}

export function saveAll(players: any) {
  // Timer
  const start = Date.now();
  for (const player in players) {
    const playerPath = path.join(
      import.meta.dir,
      `..`,
      `playerdata`,
      `${players[player].id}.sqlite`
    );
    let database = db.OpenDatabaseByName(playerPath);
    if (!database) {
      db.CreateDatabase(playerPath);
      database = db.OpenDatabaseByName(playerPath);
    }

    // Create player table if it doesn't exist
    db.Query(
      database,
      `CREATE TABLE IF NOT EXISTS player (id TEXT UNIQUE, name TEXT)`
    );

    // Create inventory table if it doesn't exist
    db.Query(
      database,
      `CREATE TABLE IF NOT EXISTS inventory (id TEXT UNIQUE, item TEXT, quantity TEXT, description TEXT)`
    );

    // Insert the player if they don't exist
    const playerExists = db.Query(
      database,
      `SELECT * FROM player WHERE id = '${players[player].id}'`
    );
    if (playerExists.length === 0) {
      // Insert the player
      db.Query(
        database,
        `INSERT INTO player (id, name) VALUES ('${players[player].id}', '${players[player].name}')`
      );
      // Insert the player's inventory
      for (const item in players[player].inventory) {
        db.Query(
          database,
          `INSERT INTO inventory (id, item, quantity, description) VALUES ('${players[player].inventory[item].id}', '${players[player].inventory[item].item}', '${players[player].inventory[item].quantity}', '${players[player].inventory[item].description}')`
        );
      }
    } else {
      // Update the player
      db.Query(
        database,
        `UPDATE player SET name = '${players[player].name}' WHERE id = '${players[player].id}'`
      );
      const items = db.Query(
        database,
        `SELECT * FROM inventory`
      );
      // Insert every item that doesn't already exist otherwise update the quantity
      for (const item in players[player].inventory) {
        const itemExists = items.filter((i: any) => i.id === players[player].inventory[item].id);
        if (itemExists.length === 0) {
          db.Query(
            database,
            `INSERT INTO inventory (id, item, quantity, description) VALUES ('${players[player].inventory[item].id}', '${players[player].inventory[item].item}', '${players[player].inventory[item].quantity}', '${players[player].inventory[item].description}')`
          );
        } else {
          db.Query(
            database,
            `UPDATE inventory SET quantity = '${players[player].inventory[item].quantity}' WHERE id = '${players[player].inventory[item].id}'`
          );
        }
      }
    }

    // Close the connection
    database.close();
  }
  const end = Date.now();
  log.debug(`Saved ${players.length} players in ${end - start}ms`);
}

export function save(player: Player) {
  const playerPath = path.join(
    import.meta.dir,
    `..`,
    `playerdata`,
    `${player.id}.sqlite`
  );
  let database = db.OpenDatabaseByName(playerPath);
  if (!database) {
    db.CreateDatabase(playerPath);
    database = db.OpenDatabaseByName(playerPath);
  }

  // Insert the player if they don't exist
  db.Query(database, `CREATE TABLE IF NOT EXISTS player (id TEXT UNIQUE, name TEXT)`);

  // Create inventory table if it doesn't exist
  db.Query(
    database,
    `CREATE TABLE IF NOT EXISTS inventory (id TEXT UNIQUE, item TEXT, quantity TEXT, description TEXT)`
  );
  // Insert the player if they don't exist
  const playerExists = db.Query(
    database,
    `SELECT * FROM player WHERE id = '${player.id}'`
  );
  if (playerExists.length === 0) {
    // Insert the player
    db.Query(
      database,
      `INSERT INTO player (id, name) VALUES ('${player.id}', '${player.name}')`
    );
    // insert the player's inventory
    for (const item in player.inventory) {
      db.Query(
        database,
        `INSERT INTO inventory (id, item, quantity, description) VALUES ('${player.inventory[item].id}', '${player.inventory[item].item}', '${player.inventory[item].quantity}', '${player.inventory[item].description}')`
      );
    }
  } else {
    // Update the player
    db.Query(
      database,
      `UPDATE player SET name = '${player.name}' WHERE id = '${player.id}'`
    );
    const items = db.Query(
      database,
      `SELECT * FROM inventory`
    );
    // Insert every item that doesn't already exist otherwise update the quantity
    for (const item in player.inventory) {
      const itemExists = items.filter((i: any) => i.id === player.inventory[item].id);
      if (itemExists.length === 0) {
        db.Query(
          database,
          `INSERT INTO inventory (id, item, quantity, description) VALUES ('${player.inventory[item].id}', '${player.inventory[item].item}', '${player.inventory[item].quantity}', '${player.inventory[item].description}')`
        );
      } else {
        db.Query(
          database,
          `UPDATE inventory SET quantity = '${player.inventory[item].quantity}' WHERE id = '${player.inventory[item].id}'`
        );
      }
    }
  }

  // Close the connection
  database.close();
}
