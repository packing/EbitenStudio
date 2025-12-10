# Public Assets

This directory contains static files loaded by Electron:

- `canvas.wasm` - Ebiten Canvas compiled to WebAssembly
- `wasm_exec.js` - Go WASM runtime (from Go SDK)
- `app.config.js` - Application configuration (if needed)

## Building WASM

```powershell
cd ../backend/canvas_wasm
.\build.ps1
```

This will compile and copy the WASM files to this directory.
