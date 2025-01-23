import path from "path";
import fs from "fs";

const configPath = path.join("config");
if (!fs.existsSync(configPath)) {
  fs.mkdirSync(configPath);
}

const assetConfig = {
  maps: {
    path: "../../assets/maps/",
  },
  tilesets: {
    path: "../../assets/tilesets/",
  },
  sfx: {
    path: "../../assets/sfx/",
  },
  scripts: {
    path: "../../assets/scripts/",
  },
  spritesheets: {
    path: "../../assets/spritesheets/",
  },
  sprites: {
    path: "../../assets/sprites/",
  },
};

const settings = {
  logging: {
    level: "trace",
  },
  "2fa": {
    enabled: false,
  },
};

if (!fs.existsSync(path.join(configPath, "assets.json"))) {
  fs.writeFileSync(
    path.join(configPath, "assets.json"),
    JSON.stringify(assetConfig, null, 2)
  );
  console.log(`Created assets config file at ${path.join(configPath, "assets.json")}`);
} else {
  console.log(`Assets config file loaded from ${path.join(configPath, "assets.json")}`);
}

if (!fs.existsSync(path.join(configPath, "settings.json"))) {
  fs.writeFileSync(
    path.join(configPath, "settings.json"),
    JSON.stringify(settings, null, 2)
  );
  console.log(`Created settings file at ${path.join(configPath, "settings.json")}`);
} else {
  console.log(`Settings loaded from ${path.join(configPath, "settings.json")}`);
}
