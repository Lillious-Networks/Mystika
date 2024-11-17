import path from "path";
import fs from "fs";
const transpiler = new Bun.Transpiler({
    loader: "tsx",
});

const dir = path.join(import.meta.dir, "..", "assets", "scripts");
const scripts = fs.readdirSync(dir).filter((file) => file.endsWith(".ts"));
for (const script of scripts) {
    const file = fs.readFileSync(path.join(dir, script), "utf-8");
    const result = transpiler.transformSync(file);
    if (result) {
        console.log(`Transpiled ${script} > ${script.replace(".ts", ".js")}`);
        fs.writeFileSync(path.join(dir, script.replace(".ts", ".js")), result);
    } else {
        console.error(`Failed to transpile ${script}`);
    }
}