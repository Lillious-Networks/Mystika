// This file is used to create the database and tables if they don't exist
import query from "../controllers/sqldatabase";
import log from "../modules/logger";

// Create accounts table if it doesn't exist
const createAccountsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        token TEXT UNIQUE DEFAULT NULL,
        password_hash TEXT NOT NULL,
        last_login DATETIME DEFAULT NULL,
        online INTEGER DEFAULT 0 NOT NULL,
        role INTEGER DEFAULT 0 NOT NULL,
        banned INTEGER DEFAULT 0 NOT NULL,
        ip_address TEXT DEFAULT NULL,
        geo_location TEXT DEFAULT NULL,
        two_fa_code TEXT DEFAULT NULL,
        needs_password_reset INTEGER DEFAULT 0 NOT NULL,
        map TEXT DEFAULT NULL,
        position TEXT DEFAULT NULL,
        session_id TEXT UNIQUE DEFAULT NULL,
        stealth INTEGER DEFAULT 0 NOT NULL,
        direction TEXT DEFAULT NULL
      );
  `;
  await query(sql);
};

// Create allowed_ips table if it doesn't exist
const createAllowedIpsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS allowed_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL UNIQUE
    );
  `;
  await query(sql);
};

// Create blocked_ips table if it doesn't exist
const createBlockedIpsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL UNIQUE
    );
  `;
  await query(sql);
};

// Insert 127.0.0.1 and ::1 as allowed IPs if they doesn't exist
const insertLocalhost = async () => {
  const sql = `
    INSERT OR IGNORE INTO allowed_ips (ip) VALUES ('127.0.0.1'), ('::1');
    `;
  await query(sql);
};

// Insert demo account if doesn't exist
const insertDemoAccount = async () => {
  // demo_user:demo_user
  const sql = `
    INSERT OR IGNORE INTO accounts (
      email,
      username,
      password_hash,
      online,
      role,
      banned,
      needs_password_reset,
      stealth,
      direction
    ) VALUES (
      'demo@example.com',
      'demo_user',
      'L3add0fc9fb8bda0c566ca0b2088063861499a4471363a57120de1015cbb77f0fc1b31df7e34b8d9cdac1c06d1d2a5754f84a03ddcb68ce1ec95d4207dfb22054A9c46e8c72e11d543a5a683b6d7ce59e00678ab28fa4551ab41de73b6b2869461Pd0f61e6392f33d449cb26b6be93acface2156409cbd05af94b88e8179992b99fc775e5e71b02b5147981437f64c90cd68ecbd5a49efbac973487af8186d95d2eY48013846846c765d82ffdd7e0afc1c0240285a031c7ddfc451bdd1d807e1b0c4X',
      0,
      0,
      0,
      1,
      0,
      'down'
    );
    `;
  await query(sql);
};

const insertDemoStats = async () => {
  const sql = `
    INSERT OR IGNORE INTO stats (
      username,
      health,
      max_health,
      stamina,
      max_stamina
    ) VALUES (
      'demo_user',
      100,
      100,
      100,
      100
    );
    `;
  await query(sql);
}

const insertDemoClientConfig = async () => {
  const sql = `
    INSERT OR IGNORE INTO clientconfig (
      username,
      fps,
      music_volume,
      effects_volume,
      muted,
      language
    ) VALUES (
      'demo_user',
      60,
      100,
      100,
      0,
      'en'
    );
    `;
  await query(sql);
}

const getAllowedIPs = async () => {
  const sql = `
    select * from allowed_ips;
    `;
  return await query(sql);
};

// Create inventory table if it doesn't exist
const createInventoryTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS inventory (
        username TEXT NOT NULL,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL
    );
  `;
  await query(sql);
};

// Create items table if it doesn't exist
const createItemsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT NOT NULL UNIQUE,
        quality TEXT NOT NULL,
        description TEXT DEFAULT NULL
    );
  `;
  await query(sql);
};

const createStatsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        username TEXT NOT NULL UNIQUE,
        health INTEGER NOT NULL DEFAULT 100,
        max_health INTEGER NOT NULL DEFAULT 100,
        stamina INTEGER NOT NULL DEFAULT 100,
        max_stamina INTEGER NOT NULL DEFAULT 100
    );
  `;
  await query(sql);
}

const createClientConfig = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS clientconfig (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
        username TEXT NOT NULL UNIQUE,
        fps INTEGER NOT NULL DEFAULT 240,
        music_volume INTEGER NOT NULL DEFAULT 100,
        effects_volume INTEGER NOT NULL DEFAULT 100,
        muted INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL DEFAULT 'en'
    );
  `;
  await query(sql);
}

// Run the database setup
const setupDatabase = async () => {
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
  const ips = await getAllowedIPs();
  log.trace(`Created allowed ips: ${JSON.stringify(ips)}`);
  await insertDemoAccount();
  await insertDemoStats();
  await insertDemoClientConfig();
  log.success("Database setup complete!");
  process.exit(0);
} catch (error) {
  log.error(`Error setting up database: ${error}`);
  process.exit(1);
}
