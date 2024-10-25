import log from "../modules/logger";
import * as mysql from "mysql2";
import * as sqlite from "bun:sqlite";
import fs from "fs";
import path from "path";


const _databaseEngine = process.env.DATABASE_ENGINE || "mysql"

function getSqlCert() {
  if (process.env.SQL_SSL_MODE === "DISABLED") {
    return false;
  }
  return {
    ca: fs.readFileSync(
      path.join(import.meta.dirname, "..", "certs", "ca-certificate.crt")
    ),
  }
}

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  waitForConnections: true,
  database: process.env.DATABASE_NAME,
  ssl: getSqlCert(),
} as mysql.PoolOptions);

const query = (sql: string, values?: any[]) => {
  log.trace(`Executing query: ${sql}`);
  return new Promise((resolve, reject) => {
    if (_databaseEngine === "sqlite") {
      const _db = new sqlite.Database("database.sqlite");
      const _query = _db.query(sql);
      const _rows = _query.all(values);
      log.trace(`[SQLite.Query] Query: ${JSON.stringify(_query)}`);
      log.trace(`[SQLite.Query] Rows Returned: ${JSON.stringify(_rows)}`);
      resolve(_rows);
    }
    else {
      pool.getConnection((err, connection) => {
        try {
          if (err) {
            reject(err);
          }
          connection.query(mysql.format(sql, values), (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
            connection.release();
          });
        } catch (err) {
          reject(err);
        }
      });
    }
  });
};

export default query;