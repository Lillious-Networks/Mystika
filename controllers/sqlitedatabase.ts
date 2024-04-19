import { Database } from "bun:sqlite";

export const OpenDatabaseByName = (databaseName: string) => {
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
  return q;
};

export const Query = (db: Database, query: string) => {
  try {
    return db.query(query).all();
  } catch (error: any) {
    return error.code;
  }
};
