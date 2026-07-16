const fs = require('fs')
const path = require('path')

const r = 'release'

// Remove existing release directory using shell command for better Windows compatibility
const { execSync } = require('child_process')
try {
  execSync(process.platform === 'win32' ? `rmdir /s /q "${r}" 2>nul` : `rm -rf "${r}"`)
} catch (e) {}

// Create fresh release directory
try {
  fs.mkdirSync(r)
} catch (e) {
  if (e.code !== 'EEXIST') throw e
}

// Copy files
fs.copyFileSync('package.json', path.join(r, 'package.json'))
fs.copyFileSync('README.md', path.join(r, 'README.md'))

// Copy directory recursively, skipping existing files
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry)
    const destPath = path.join(dest, entry)
    try {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    } catch (e) {
      console.warn(`Skipped: ${destPath} (${e.message})`)
    }
  }
}

// Copy dist/src/ contents directly to release/ (no dist/src prefix)
copyDir(path.join('dist', 'src'), r)
copyDir('templates', path.join(r, 'templates'))

// Delete .map files from release directory
execSync(process.platform === 'win32'
  ? `for /r "${r}" %f in (*.map) do @del "%f"`
  : `find "${r}" -name "*.map" -delete`)

console.log('Release built successfully in:', r)
