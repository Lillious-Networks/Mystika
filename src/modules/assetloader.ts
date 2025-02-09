import path from "path";
import fs from "fs";
import crypto from "crypto";
import log from "./logger";
import weapon from "../systems/weapons";
import item from "../systems/items";
import spell from "../systems/spells";
import npc from "../systems/npcs";
// import NPC from "../systems/npc_scripting";
import assetCache from "../services/assetCache";
import generate from "../modules/sprites";
import zlib from "zlib";
import query from "../controllers/sqldatabase";
// Warm up the database connection
await query("SELECT 1 + 1 AS solution -- Warm up the database connection");

import assetConfig from "../services/assetConfig";
const assetPath = assetConfig.getAssetConfig();
if (!assetPath || !fs.existsSync(path.join(import.meta.dir, assetPath))) {
  throw new Error(`Asset path not found at ${assetPath}`);
}

const asset = fs.readFileSync(path.join(import.meta.dir, assetPath), "utf-8");
if (!asset) {
  throw new Error("Failed to load asset config");
}

const assetData = JSON.parse(asset);

// Load item data
const itemnow = performance.now();
assetCache.add("items", await item.list());
const items = assetCache.get("items") as Item[];
log.success(`Loaded ${items.length} item(s) from the database in ${(performance.now() - itemnow).toFixed(2)}ms`);

// Load spell data
const spellnow = performance.now();
assetCache.add("spells", await spell.list());
const spells = assetCache.get("spells") as SpellData[];
log.success(`Loaded ${spells.length} spell(s) from the database in ${(performance.now() - spellnow).toFixed(2)}ms`);

// Load weapon data
const weaponnow = performance.now();
assetCache.add("weapons", await weapon.list());
const weapons = assetCache.get("weapons") as WeaponData[];
log.success(`Loaded ${weapons.length} weapon(s) from the database in ${(performance.now() - weaponnow).toFixed(2)}ms`);

// Load npc data
const npcnow = performance.now();
assetCache.add("npcs", await npc.list());
const npcs = assetCache.get("npcs") as Npc[];
log.success(`Loaded ${npcs.length} npc(s) from the database in ${(performance.now() - npcnow).toFixed(2)}ms`);

// Load maps
function loadMaps() {
  const now = performance.now();
  const maps = [] as MapData[];
  const failedMaps = [] as string[];
  const mapDir = path.join(import.meta.dir, assetData.maps.path);
  if (!fs.existsSync(mapDir)) {
    throw new Error(`Maps directory not found at ${mapDir}`);
  }

  const mapFiles = fs.readdirSync(mapDir);
  // If no maps throw an error
  if (mapFiles.length === 0) {
    throw new Error("No maps found in the maps directory");
  }

  mapFiles.forEach((file) => {
    if (!file.endsWith(".json")) return;
    const f = path.join(mapDir, file);
    const result = tryParse(fs.readFileSync(f, "utf-8")) || failedMaps.push(f);
    // Compress the map data
    const compressedData = zlib.gzipSync(JSON.stringify(result));

    if (result) {
      const mapHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(result))
        .digest("hex");
      maps.push({ name: file, data: result, hash: mapHash, compressed: compressedData });
    }
    log.debug(`Loaded map: ${file}`);
    // Same stats output as collision map compression
    log.debug(`Compressed map: ${file}\n- ${JSON.stringify(result).length} (bytes) -> ${compressedData.length} (bytes)\n- Compression Ratio: ${(JSON.stringify(result).length / compressedData.length).toFixed(2)}% | Compression: ${(((JSON.stringify(result).length - compressedData.length) / JSON.stringify(result).length) * 100).toFixed(2)}%`);
  });

  if (failedMaps.length > 0) {
    for (const map of failedMaps) {
      log.error(`Failed to parse ${map} as a map`);
    }
  }

  // Store collision layers in asset cache

  maps.forEach((map) => {
    const collisions = [] as any[];
    map.data.layers.forEach((layer: any) => {
      if (layer.properties) {
        if (
          layer.properties[0]?.name.toLowerCase() === "collision" &&
          layer.properties[0]?.value === true
        ) {
          collisions.push(layer.data);
        }
      }
    });

    // Combine indexs of collision layers into a single array for each map
    // 0's represent no collision, 1's represent collision
    // Any index that is not 0 is considered a collision and can be marked as a 1
    const collisionMap: number[][] = []; // Explicitly define type

    collisions.forEach((collision: number[]) => {
      if (collisionMap.length === 0) {
        // Initialize collisionMap[0] as an array of zeros or the same as the first collision array
        collisionMap.push([...collision.map(() => 0)]); // Start with all zeros
      }

      collision.forEach((index: number, i: number) => {
        if (index !== 0) {
          collisionMap[0][i] = 1; // Set the value to 1 for non-zero indices
        }
      });
    });

    collisionMap.push(map.data.layers[0].width, map.data.layers[0].height);
    // Compress the collision data by turning repeating 0's and 1's into a single number followed by the count
    // This will reduce the size of the collision data
    const compressedCollisionMap = [] as any[];
    compressedCollisionMap.push(collisionMap[1], collisionMap[2]);
    let current = collisionMap[0][2];
    let count = 1;
    for (let i = 1; i < collisionMap[0].length; i++) {
      if (collisionMap[0][i] === current) {
        count++;
      } else {
        compressedCollisionMap.push(current, count);
        current = collisionMap[0][i];
        count = 1;
      }
    }
    compressedCollisionMap.push(current, count);
    const collisionBytes = new Uint8Array(collisionMap[0]).length;
    const compressedBytes = new Uint8Array(compressedCollisionMap).length;
    if (compressedBytes >= collisionBytes) {
      log.error(
        `Failed to compress collision map for ${
          map.name
        }\n- ${collisionBytes} (bytes) -> ${compressedBytes} (bytes)\n- Compression Ratio: ${(
          collisionBytes / compressedBytes
        ).toFixed(2)}% | Compression: ${(
          ((collisionBytes - compressedBytes) / collisionBytes) *
          100
        ).toFixed(2)}%`
      );
      throw new Error("Failed to compress collision map");
    }
    log.debug(
      `Generated compressed collision map for ${
        map.name
      }\n- ${collisionBytes} (bytes) -> ${compressedBytes} (bytes)\n- Compression Ratio: ${(
        collisionBytes / compressedBytes
      ).toFixed(2)}% | Compression: ${(
        ((collisionBytes - compressedBytes) / collisionBytes) *
        100
      ).toFixed(2)}%`
    );
    assetCache.addNested(
      map.name.replace(".json", ""),
      "collision",
      compressedCollisionMap
    );
  });

  // Check if main.json exists and if not throw an error
  const mainMap = maps.find((map) => map.name === "main.json");
  if (!mainMap) {
    throw new Error("Main map not found");
  }

  assetCache.add("maps", maps);
  log.success(`Loaded ${maps.length} map(s) in ${(performance.now() - now).toFixed(2)}ms`);
}

loadMaps();

// Load tilesets
function loadTilesets() {
  const now = performance.now();
  const tilesets = [] as TilesetData[];
  const tilesetDir = path.join(import.meta.dir, assetData.tilesets.path);
  if (!fs.existsSync(tilesetDir)) {
    throw new Error(`Tilesets directory not found at ${tilesetDir}`);
  }

  const tilesetFiles = fs.readdirSync(tilesetDir);
  tilesetFiles.forEach((file) => {
    const tilesetData = fs.readFileSync(path.join(tilesetDir, file), "base64");
    const compressedData = zlib.gzipSync(tilesetData);
    log.debug(`Loaded tileset: ${file}`);
    log.debug(`Compressed tileset: ${file}\n- ${tilesetData.length} (bytes) -> ${compressedData.length} (bytes)\n- Compression Ratio: ${(tilesetData.length / compressedData.length).toFixed(2)}% | Compression: ${(((tilesetData.length - compressedData.length) / tilesetData.length) * 100).toFixed(2)}%`);
    const tilesetHash = crypto
      .createHash("sha256")
      .update(tilesetData)
      .digest("hex");
    tilesets.push({ name: file, data: compressedData, hash: tilesetHash });
  });

  assetCache.add("tilesets", tilesets);
  log.success(`Loaded ${tilesets.length} tileset(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadTilesets();

// Load scripts
function loadScripts() {
  const now = performance.now();
  const scripts = [] as ScriptData[];
  const scriptDir = path.join(import.meta.dir, assetData.scripts.path);
  if (!fs.existsSync(scriptDir)) return scripts;

  const scriptFiles = fs
    .readdirSync(scriptDir)
    .filter((file) => file.endsWith(".js"));
  scriptFiles.forEach((file) => {
    const scriptData = fs.readFileSync(path.join(scriptDir, file), "utf-8");
    log.debug(`Loaded script: ${file}`);
    const scriptHash = crypto
      .createHash("sha256")
      .update(scriptData)
      .digest("hex");
    scripts.push({ name: file, data: scriptData, hash: scriptHash });
  });
  assetCache.add("scripts", scripts);
  log.success(`Loaded ${scripts.length} script(s) in ${(performance.now() - now).toFixed(2)}ms`);
}
loadScripts();

function tryParse(data: string): any {
  try {
    return JSON.parse(data);
  } catch (e: any) {
    log.error(e);
    return null;
  }
}


function loadSoundEffects () {
  const now = performance.now();
  const soundEffects = [] as SoundData[];
  const soundEffectDir = path.join(import.meta.dir, assetData.sfx.path);
  if (!fs.existsSync(soundEffectDir)) {
    throw new Error(`Sound effects directory not found at ${soundEffectDir}`);
  }
  // MP3 files are used for sound effects
  const soundEffectFiles = fs.readdirSync(soundEffectDir).filter((file) => file.endsWith(".mp3"));
  soundEffectFiles.forEach((file) => {
    const name = file.replace(".mp3", "");
    const data = fs.readFileSync(path.join(soundEffectDir, file), "base64");
    const compressedData = zlib.gzipSync(data);
    log.debug(`Loaded sound effect: ${name}`);
    log.debug(`Compressed sound effect: ${name}\n- ${data.length} (bytes) -> ${compressedData.length} (bytes)\n- Compression Ratio: ${(data.length / compressedData.length).toFixed(2)}% | Compression: ${(((data.length - compressedData.length) / data.length) * 100).toFixed(2)}%`);
    soundEffects.push({ name, data: compressedData });
  });
  assetCache.add("audio", soundEffects);
  log.success(`Loaded ${soundEffects.length} sound effect(s) in ${(performance.now() - now).toFixed(2)}ms`);
}

loadSoundEffects();

async function loadSpriteSheets() {
  const spritesheetnow = performance.now();
  const spritesheets = [] as SpriteSheetData[];
  const spriteDir = path.join(import.meta.dir, assetData.spritesheets.path);
  if (!fs.existsSync(spriteDir)) {
    throw new Error(`Sprites directory not found at ${spriteDir}`);
  }

  // Not a folder
  fs.readdirSync(spriteDir).filter((file) => file.endsWith(".png")).map((file) => {
    const name = file.replace(".png", "");
    const data = fs.readFileSync(path.join(spriteDir, file), "base64");
    const buffer = Buffer.from(data, "base64");
    log.debug(`Loaded sprite sheet: ${name}`);
    const spriteHash = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");
      spritesheets.push({ name, width: 24, height: 40, data: buffer, hash: spriteHash });
  });

  assetCache.add("spritesheets", spritesheets);
  log.success(`Loaded ${spritesheets.length} sprite sheet(s) in ${(performance.now() - spritesheetnow).toFixed(2)}ms`);

  const sprites = [] as SpriteData[];
  const spritenow = performance.now();
  const spritePromises = spritesheets.map(async (spritesheet: any) => {
    const sprite = await generate(spritesheet) as any;
    return sprite;
  });

  const spriteData = await Promise.all(spritePromises);
  spriteData.forEach((sprite) => {
    sprites.push(sprite);
  });

  log.success(`Generated ${sprites.length} sprite(s) in ${(performance.now() - spritenow).toFixed(2)}ms`);
}

await loadSpriteSheets();