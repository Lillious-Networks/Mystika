import UglyifyJS from 'uglify-js';
import path from "path";
import fs from "fs";
import log from "../modules/logger";

function minifyDirectory(sourceDir: string) {
    const scripts = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".js"));
    for (const script of scripts) {
        const filePath = path.join(sourceDir, script);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const result = UglyifyJS.minify(fileContent);
        if (result.error) {
            console.error(`Failed to minify ${script}`);
        } else {
            fs.writeFileSync(filePath, result.code);
            log.info(`Minified ${script}`);
        }
    }
}

// Define directories to minify
const directories = [
    path.join(import.meta.dir, "..", "assets", "scripts"),
    path.join(import.meta.dir, "..", "webserver", "www", "game", "js"),
    path.join(import.meta.dir, "..", "webserver", "www", "public", "js"),
];

// Transpile each directory
for (const dir of directories) {
    minifyDirectory(dir);
}
