# External Integrations

**Analysis Date:** 2026-06-26

## CLI Interface

**Command:** `svg2pptel`

**Invocation:**
```bash
svg2pptel <input> [options]
```

**Arguments:**
- `<input>` - SVG file path or directory path

**Options:**
| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Output file path (stdout if not specified) |
| `--ast` | Output AST JSON instead of PPTElement JSON |
| `-r, --recursive` | Recursively process directories |

**Examples:**
```bash
svg2pptel input.svg                    # stdout output
svg2pptel input.svg -o output.json     # file output
svg2pptel dir --recursive              # batch process
svg2pptel input.svg --ast              # AST mode
```

**Exit Codes:**
- `0` - Success (or partial success for batch)
- `1` - Fatal error (file read error, invalid SVG, etc.)

## API Surface

**Module:** `svg-to-pptel` (npm package)

**Main Export:** `convert(svgContent: string, options?: ConvertOptions): Promise<ConvertResult>`

**Types:**
```typescript
interface ConvertOptions {
  astMode?: boolean;              // Output AST instead of PPTElement
  targetCanvas?: [number, number]; // Target canvas size [width, height]
}

interface ConvertResult {
  success: boolean;
  output?: string;       // JSON string of AST or PPTElement
  error?: string;
  elementCount?: number; // Count of PPTElement items
}
```

**Re-exports:**
- `parseSvg` from `./parser/svg-parser`
- `transformToPPTElement` from `./transformer/transform-to-pptel`
- `PPTElement` type from `./slides`

## Entry Points

**CLI Entry:**
- File: `src/cli.ts`
- Bin: `svg2pptel` → `./dist/cli.js`

**Library Entry:**
- File: `src/index.ts`
- Package main: `dist/index.js`
- Package types: `dist/index.d.ts`

**Direct Import:**
```typescript
import { convert, parseSvg, transformToPPTElement } from 'svg-to-pptel'
```

## File Processing

**Single File:**
1. Read SVG file content
2. Parse via `convert()` function
3. Output JSON to stdout or file

**Directory Batch:**
1. Walk directory for `.svg` files (with optional recursion)
2. Process each file individually
3. Output each result to stdout
4. Print summary: `Converted X/Y files`
5. Exit 0 even on partial failure

---

*Integration audit: 2026-06-26*