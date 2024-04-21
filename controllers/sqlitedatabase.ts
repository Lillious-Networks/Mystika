import { Database } from "bun:sqlite";
import fs from "fs";

export const OpenDatabaseByName = (databaseName: string) : Database | false => {
  if (!fs.existsSync(databaseName)) return false;
  return new Database(databaseName) as Database;
};

export const CreateDatabase = (databaseName: string) => {
  return new Database(databaseName, { create: true }) as Database;
};

export const CreateTable = (
  db: Database,
  tableName: string,
  tableColumns: string
) => {
  using q = Query(db, `CREATE TABLE IF NOT EXISTS ${tableName} (${tableColumns})`);
  console.log(q);
  return q;
};

export const DeleteDatabase = (path: string) => {
  // Make sure we are only deleting sqlite files
  if (!path.endsWith(".sqlite")) return;
  fs.unlinkSync(path);
};

export const closeDatabase = (db: Database) => {
  db.close();
}

export const Query = (db: Database, query: string) => {
  try {
    return db.query(query).all();
  } catch (error: any) {
    return error.code;
  }
};
