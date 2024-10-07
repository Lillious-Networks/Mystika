import log from "../modules/logger";
import * as mysql from "mysql2";
import fs from "fs";
import path from "path";

function mode() {
  if (process.env.SQL_SSL_MODE === "DISABLED") {
    return false;
  } else {
    return {
      ca: fs.readFileSync(
        path.join(import.meta.dirname, "..", "certs", "ca-certificate.crt")
      ),
    }
  }
}

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  waitForConnections: true,
  ssl: mode(),
} as mysql.PoolOptions);

const query = (sql: string, values?: any[]) => {
  log.trace(`Executing query: ${sql}`);
  return new Promise((resolve, reject) => {
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
  });
};

export default query;
