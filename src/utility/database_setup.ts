// This file is used to create the database and tables if they don't exist
import query from "../controllers/sqldatabase";
import log from "../modules/logger";
const database = process.env.DATABASE_NAME || "TEMP_Mystika";

// Create TEMP_Mystika Database if it doesn't exist
const createDatabase = async () => {
  const sql = `CREATE DATABASE IF NOT EXISTS ${database};`;
  await query(sql);
};

// Create accounts table if it doesn't exist
const createAccountsTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        token VARCHAR(255) UNIQUE DEFAULT NULL,
        password_hash VARCHAR(500) NOT NULL,
        last_login DATETIME DEFAULT NULL,
        online INT DEFAULT 0 NOT NULL,
        role INT DEFAULT 0 NOT NULL,
        access_level INT DEFAULT 0 NOT NULL,
        banned INT DEFAULT 0 NOT NULL,
        ip_address VARCHAR(255) DEFAULT NULL,
        geo_location VARCHAR(255) DEFAULT NULL,
        two_fa_code VARCHAR(45) DEFAULT NULL,
        needs_password_reset INT DEFAULT 0 NOT NULL,
        map VARCHAR(255) DEFAULT NULL,
        position VARCHAR(255) DEFAULT NULL,
        session_id VARCHAR(255) UNIQUE DEFAULT NULL
      );
  `;
  await query(sql);
};

// Create allowed_ips table if it doesn't exist
const createAllowedIpsTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS allowed_ips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL UNIQUE
    )
  `;
  await query(sql);
};

// Create blocked_ips table if it doesn't exist
const createBlockedIpsTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS blocked_ips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL UNIQUE
    )
  `;
  await query(sql);
};

// Insert 127.0.0.1 and ::1 as allowed IPs if they doesn't exist
const insertLocalhost = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    INSERT IGNORE INTO allowed_ips (ip) VALUES ('127.0.0.1'), ('::1');
    `;
  await query(sql);
};

// Create inventory table if it doesn't exist
const createInventoryTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS inventory (
        username VARCHAR(255) NOT NULL,
        item VARCHAR(255) NOT NULL,
        quantity INT NOT NULL
    )
  `;
  await query(sql);
};

// Create items table if it doesn't exist
const createItemsTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        quality VARCHAR(255) NOT NULL,
        description VARCHAR(255) DEFAULT NULL
    )
  `;
  await query(sql);
};

const createStatsTable = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
    CREATE TABLE IF NOT EXISTS stats (
        id INT AUTO_INCREMENT PRIMARY KEY UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        health INT NOT NULL DEFAULT 100,
        max_health INT NOT NULL DEFAULT 100,
        stamina INT NOT NULL DEFAULT 100,
        max_stamina INT NOT NULL DEFAULT 100
    )
  `;
  await query(sql);
}

const createClientConfig = async () => {
  const useDatabaseSql = `USE ${database};`;
  await query(useDatabaseSql);

  const sql = `
      CREATE TABLE IF NOT EXISTS clientconfig (
        id INT AUTO_INCREMENT PRIMARY KEY UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        fps INT NOT NULL DEFAULT 60,
        music_volume INT NOT NULL DEFAULT 100,
        effects_volume INT NOT NULL DEFAULT 100,
        muted INT NOT NULL DEFAULT 0
    )
  `;
  await query(sql);
}

// Run the database setup
const setupDatabase = async () => {
  await createDatabase();
  await createAccountsTable();
  await createAllowedIpsTable();
  await createBlockedIpsTable();
  await insertLocalhost();
  await createInventoryTable();
  await createItemsTable();
  await createStatsTable();
  await createClientConfig();
};

try {
  log.info("Setting up database...");
  await setupDatabase();
  log.success("Database setup complete!");
  process.exit(0);
} catch (error) {
  log.error(`Error setting up database: ${error}`);
  process.exit(1);
}
