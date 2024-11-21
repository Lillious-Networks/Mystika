import path from "path";
import fs from "fs";
import crypto from "crypto";
import log from "./logger";
import assetCache from "../services/assetCache";

// Load maps
export function loadMaps() {
  const maps = [] as MapData[];
  const failedMaps = [] as string[];
  const mapDir = path.join(import.meta.dir, "..", "assets", "maps");
  if (!fs.existsSync(mapDir)) return maps;

  const mapFiles = fs.readdirSync(mapDir);
  mapFiles.forEach((file) => {
    if (!file.endsWith(".json")) return;
    const f = path.join(mapDir, file);
    const result = tryParse(fs.readFileSync(f, "utf-8")) || failedMaps.push(f);
    
    if (result) {
      const mapHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(result))
        .digest("hex");
      maps.push({ name: file, data: result, hash: mapHash });
    }
    log.debug(`Loaded map: ${file}`);
  })

  if (failedMaps.length > 0) {
    for (const map of failedMaps) {
      log.error(`Failed to parse ${map} as a map`);
    }
  }

  // Store collision layers in asset cache
  
  maps.forEach((map) => {
    const collisions = [] as any[];
    map.data.layers.forEach((layer: any) => {
      if (layer.properties[0].name === "collision" && layer.properties[0].value === true) {
        collisions.push(layer.data);
        //assetCache.addNested(map.name.replace(".json", ""), layer.id, layer);
      }
    });

    // Combine indexs of collision layers into a single array for each map 
    // 0's represent no collision, 1's represent collision
    // Any index that is not 0 is considered a collision and can be marked as a 1
    const collisionMap = [] as any[];
    collisions.forEach((collision) => {
      if (!collisionMap.length) {
        collisionMap.push(collision);
      } else {
        collision.forEach((index: number, i: number) => {
          if (index !== 0) {
            collisionMap[0][i] = 1;
          }
        });
      }
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
    //fs.writeFileSync(path.join(mapDir, map.name.replace(".json", ".collision")), JSON.stringify(compressedCollisionMap));
    assetCache.addNested(map.name.replace(".json", ""), "collision", compressedCollisionMap);
  });

  console.log(assetCache.get("main"));
  assetCache.add("maps", maps);  
};

loadMaps();

// Load tilesets
export function loadTilesets() {
  const tilesets = [] as TilesetData[];
  const tilesetDir = path.join(import.meta.dir, "..", "assets", "tilesets");
  if (!fs.existsSync(tilesetDir)) return tilesets;

  const tilesetFiles = fs.readdirSync(tilesetDir);
  tilesetFiles.forEach((file) => {
    const tilesetData = fs.readFileSync(path.join(tilesetDir, file), "base64");
    log.debug(`Loaded tileset: ${file}`);
    const tilesetHash = crypto
      .createHash("sha256")
      .update(tilesetData)
      .digest("hex");
    tilesets.push({ name: file, data: tilesetData, hash: tilesetHash });
  });

  assetCache.add("tilesets", tilesets);
}
loadTilesets();

// Load scripts
export function loadScripts() {
  const scripts = [] as ScriptData[];
  const scriptDir = path.join(import.meta.dir, "..", "assets", "scripts");
  if (!fs.existsSync(scriptDir)) return scripts;

  const scriptFiles = fs.readdirSync(scriptDir).filter((file) => file.endsWith(".js"));
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