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

// Copy files - read, modify paths for release structure, then write
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
// Update paths for release: dist/... -> ./...
pkg.main = './index.js'
pkg.types = './index.d.ts'
pkg.bin = { svg2pptel: './cli.js' }
delete pkg.scripts  // no need for build scripts in release
fs.writeFileSync(path.join(r, 'package.json'), JSON.stringify(pkg, null, 2))
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
copyDir('docs', path.join(r, 'docs'))

// Manually add shebang for Unix systems
const cliPath = path.join(r, 'cli.js')
const cliContent = fs.readFileSync(cliPath, 'utf8')
fs.writeFileSync(cliPath, '#!/usr/bin/env node\n' + cliContent)

// Create Windows .cmd wrapper so bin works on Windows
const cmdPath = path.join(r, 'svg2pptel.cmd')
fs.writeFileSync(cmdPath, '@echo off\n"%~dp0\\..\\..\\Program Files\\nodejs\\node.exe" "%~dp0cli.js" %*\n')
// Simpler Windows wrapper using node from PATH
fs.writeFileSync(cmdPath, `@echo off\nnode "%~dp0cli.js" %*\n`)

// Delete .map files from release directory
execSync(process.platform === 'win32'
  ? `for /r "${r}" %f in (*.map) do @del "%f"`
  : `find "${r}" -name "*.map" -delete`)

console.log('Release built successfully in:', r)
