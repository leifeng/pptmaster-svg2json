"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const cac_1 = __importDefault(require("cac"));
const picocolors_1 = __importDefault(require("picocolors"));
const fs_1 = require("fs");
const path_1 = require("path");
const index_1 = require("./index");
const cli = (0, cac_1.default)('svg2json');
cli.command('<input>', 'SVG file or directory to convert')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-r, --recursive', 'Process directories recursively')
    .example('svg2json input.svg')
    .example('svg2json input.svg -o output.json')
    .example('svg2json dir --recursive');
cli.help();
const parsed = cli.parse();
const options = parsed.options;
const input = parsed.args[0];
if (!input) {
    cli.outputHelp();
    process.exit(1);
}
function isDirectory(path) {
    try {
        return (0, fs_1.statSync)(path).isDirectory();
    }
    catch {
        return false;
    }
}
function walkDir(dir, recursive) {
    const files = [];
    try {
        for (const entry of (0, fs_1.readdirSync)(dir)) {
            const fullPath = (0, path_1.join)(dir, entry);
            try {
                if ((0, fs_1.statSync)(fullPath).isDirectory() && recursive) {
                    files.push(...walkDir(fullPath, recursive));
                }
                else if ((0, path_1.extname)(entry).toLowerCase() === '.svg') {
                    files.push(fullPath);
                }
            }
            catch {
                // skip files we can't stat
            }
        }
    }
    catch {
        // skip dirs we can't read
    }
    return files;
}
async function processFile(filePath) {
    try {
        const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
        const result = await (0, index_1.convert)(content, { svgFilePath: filePath });
        return result;
    }
    catch (err) {
        return { success: false, error: `File read error: ${String(err)}` };
    }
}
async function main() {
    // Error if --output used with directory input
    if (options.output && isDirectory(input)) {
        console.error(picocolors_1.default.red('Error: --output cannot be used with directory input (single file holds one result)'));
        process.exit(1);
    }
    if (isDirectory(input)) {
        // Directory processing
        const svgFiles = walkDir(input, !!options.recursive);
        if (svgFiles.length === 0) {
            console.error(picocolors_1.default.yellow('No SVG files found.'));
            process.exit(0);
        }
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        for (const file of svgFiles) {
            const result = await processFile(file);
            if (result.success && result.output) {
                const jsonPath = file + '.json';
                (0, fs_1.writeFileSync)(jsonPath, result.output, 'utf-8');
                successCount++;
            }
            else {
                console.error(picocolors_1.default.red(`Error [${file}]: ${result.error}`));
                errorCount++;
                errors.push(file);
            }
        }
        console.error(picocolors_1.default.cyan(`Converted ${successCount} files, ${errorCount} failed`));
        if (errorCount > 0) {
            console.error(picocolors_1.default.red(`Failed: ${errors.join(', ')}`));
        }
        // Exit 0 even on partial failure per RESEARCH.md recommendation
        process.exit(0);
    }
    else {
        // Single file processing
        const result = await processFile(input);
        if (!result.success) {
            console.error(picocolors_1.default.red(`Error: ${result.error}`));
            process.exit(1);
        }
        const outputPath = options.output || (input + '.json');
        (0, fs_1.writeFileSync)(outputPath, result.output, 'utf-8');
        console.error(picocolors_1.default.green(`Written to ${outputPath}`));
        process.exit(0);
    }
}
main().catch((err) => {
    console.error(picocolors_1.default.red(`Fatal error: ${String(err)}`));
    process.exit(1);
});
function run(args = process.argv) {
    cli.parse(args);
}
//# sourceMappingURL=cli.js.map