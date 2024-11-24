import path from "path";
import fs from "fs";

const transpiler = new Bun.Transpiler({
    loader: "tsx",
});

function transpileDirectory(sourceDir: string) {
    const scripts = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".ts"));

    for (const script of scripts) {
        const filePath = path.join(sourceDir, script);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const result = transpiler.transformSync(fileContent);

        if (result) {
            const outputFile = path.join(sourceDir, script.replace(".ts", ".js"));
            console.log(`Transpiled ${script} > ${path.basename(outputFile)}`);
            fs.writeFileSync(outputFile, result);
        } else {
            console.error(`Failed to transpile ${script}`);
        }
    }
}

// Define directories to transpile
const directories = [
    path.join(import.meta.dir, "..", "assets", "scripts"),
    path.join(import.meta.dir, "..", "webserver", "www", "game", "js"),
    path.join(import.meta.dir, "..", "webserver", "www", "public", "js"),
];

// Transpile each directory
for (const dir of directories) {
    transpileDirectory(dir);
}
