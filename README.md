# PuppetDrop Scene — Multi-Object 2D Animator

Upload multiple character and prop PNGs, arrange them on a shared stage, pose rigged characters, and animate entire scenes with a common timeline.

## Features

- **Multiple objects** — characters, props, and backgrounds in one scene
- **Layer panel** — reorder, hide, lock, rename, delete
- **Shared timeline** — independent keyframes per object
- **Drag interactions** — move / Alt-rotate / Shift-scale
- **Auto cutout** — optional solid-background removal on import
- **Character auto-rig** — heuristic joint placement + bone sliders

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Keyboard

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Delete / Backspace | Remove selected object |
| Alt + drag | Rotate |
| Shift + drag | Scale |
