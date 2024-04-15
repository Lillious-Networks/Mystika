import path from "path";
import fs from "fs";
import crypto from "crypto";

// Load all maps from the maps directory
export function GetMaps() : MapData[] {
    const maps = [] as MapData[];
    const mapDir = path.join(import.meta.dir, "..", "assets", "maps");
    if (!fs.existsSync(mapDir))
        return maps;

    const mapFiles = fs.readdirSync(mapDir);
    mapFiles.forEach((file) => {
        const mapData = JSON.parse(fs.readFileSync(path.join(mapDir, file), "utf-8"));
        const mapHash = crypto.createHash("sha256").update(JSON.stringify(mapData)).digest("hex");
        maps.push({ name: file, data: mapData, hash: mapHash });
    });

    return maps;
}

// Load all tilesets from the tilesets directory and return the base64 encoded image
export function GetTilesets() : TilesetData[] {
    const tilesets = [] as TilesetData[];
    const tilesetDir = path.join(import.meta.dir, "..", "assets", "tilesets");
    if (!fs.existsSync(tilesetDir))
        return tilesets;

    const tilesetFiles = fs.readdirSync(tilesetDir);
    tilesetFiles.forEach((file) => {
        const tilesetData = fs.readFileSync(path.join(tilesetDir, file), "base64");
        const tilesetHash = crypto.createHash("sha256").update(tilesetData).digest("hex");
        tilesets.push({ name: file, data: tilesetData, hash: tilesetHash});
    });

    return tilesets;
}