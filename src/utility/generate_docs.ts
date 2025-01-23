import fs from 'fs';
import path from 'path';
import log from '../modules/logger'

const readme = path.join(import.meta.dir, '..', '..', 'README.md');
const output = path.join(import.meta.dir, 'output.md');

// Make sure we are generating a new file each time
if (fs.existsSync(output)) fs.unlinkSync(output);

if (!fs.existsSync(readme)) 
    throw new Error('README.md not found');

try {
    const now = performance.now();
    const content = fs.readFileSync(readme, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (index < 24) return;
        // Check for h tags
        if (line.startsWith('<h')) {
            // Write to output file
            // Remove the h tag
            let title = line.replace(/<h[1-6]>/, '').replace(/<\/h[1-6]>/, '');
            // Remove the following pattern ": WORD" in the title
            title = title.replaceAll(/: \w+/g, '');
            // Check if something is a javascript function by checking if it has parenthesis
            if (title.includes('(')) {
                // Check if the parenthesis is not empty
                if (title.includes('()')) {
                    // split by .
                    const words = title.split('.');
                    const span = `\n<span class='function'>${words[0]}</span><span class='method'>.${words[1].trim().replaceAll('();','')}</span><span class='params'>();</span>\n`;
                    // Check if the next line contains a <p tag to add it to the span
                    const nextLine = lines[index + 1];
                    if (nextLine.startsWith('<p')) {
                        const description = nextLine.replace(/<p/, '').replace(/<\/p>/, '').replaceAll(`"`, `'`);
                        fs.appendFileSync(output, `${span}<div class='description'${description}</div>`);
                    } else {
                        fs.appendFileSync(output, span);
                    }
                }
            }
        }
    });
    log.success(`Documentation generated in ${(performance.now() - now).toFixed(2)}ms`);
} catch (error: any) {
    log.error(error);
}

// Generate html file
const html = path.join(import.meta.dir, '..', 'webserver', 'www', 'public', 'docs.html');
if (fs.existsSync(html)) fs.unlinkSync(html);
const outputContent = fs.readFileSync(output, 'utf-8');
const outputLines = outputContent.split('\n').filter(line => line !== '');
const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Documentation</title><link rel="stylesheet" href="css/docs.css"></head><body><h1>Documentation</h1><ul>\n${outputLines.map(line => `<li>\n   ${line}\n</li>\n`).join('')}</ul></body></html>`;
fs.writeFileSync(html, htmlContent);
fs.unlinkSync(output);