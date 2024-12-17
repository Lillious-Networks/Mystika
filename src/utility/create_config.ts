import path from "path";
import fs from "fs";
import log from "../modules/logger";

const configPath = path.join("config");
if (!fs.existsSync(configPath)) {
  fs.mkdirSync(configPath);
}

const config = {
    "maps": {
        "path": "../../assets/maps/"
    },
    "tilesets": {
        "path": "../../assets/tilesets/"
    },
    "sfx": {
        "path": "../../assets/sfx/"
    },
    "scripts": {
        "path": "../../assets/scripts/"
    },
};

if (!fs.existsSync(path.join(configPath, "assets.json"))) {
    fs.writeFileSync(path.join(configPath, "assets.json"), JSON.stringify(config, null, 2));
    log.info(`Created config file at ${path.join(configPath, "assets.json")}`);
  } else {
      log.info(`Config file loaded from ${path.join(configPath, "assets.json")}`);
  }