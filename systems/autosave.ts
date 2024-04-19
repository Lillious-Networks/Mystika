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
    db.Query(
      database,
      `CREATE TABLE IF NOT EXISTS player (id TEXT, name TEXT)`
    );
    // Insert the player if they don't exist
    const playerExists = db.Query(
      database,
      `SELECT * FROM player WHERE id = '${players[player].id}'`
    );
    if (playerExists.length === 0) {
      db.Query(
        database,
        `INSERT INTO player (id, name) VALUES ('${players[player].id}', '${players[player].name}')`
      );
    } else {
      db.Query(
        database,
        `UPDATE player SET name = '${players[player].name}' WHERE id = '${players[player].id}'`
      );
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

  // Insert the player
  db.Query(database, `CREATE TABLE IF NOT EXISTS player (id TEXT, name TEXT)`);
  // Insert the player if they don't exist
  const playerExists = db.Query(
    database,
    `SELECT * FROM player WHERE id = '${player.id}'`
  );
  if (playerExists.length === 0) {
    db.Query(
      database,
      `INSERT INTO player (id, name) VALUES ('${player.id}', '${player.name}')`
    );
  } else {
    db.Query(
      database,
      `UPDATE player SET name = '${player.name}' WHERE id = '${player.id}'`
    );
  }

  // Close the connection
  database.close();
}
