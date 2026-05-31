<img src="logo.svg" width="64" height="64" align="left" style="margin-right: 16px"/>

# Pixel Art Generator

A lightweight, browser-based pixel art tool built with vanilla HTML, CSS, and JavaScript. No dependencies, no build steps — just open and draw.

<br/>

---

## Features

- Configurable grid size — set any dimension and the canvas updates instantly
- Freehand drawing with click and drag support
- Live colour picker for seamless colour switching mid-draw
- Undo and redo support — step through your entire drawing history
- Keyboard shortcuts — `Ctrl+Z` to undo, `Ctrl+Shift+Z` to redo
- Image to pixel art — upload any image and watch it get pixelated to your grid size
- Camera capture — take a live photo and convert it to pixel art instantly
- Download your artwork as a PNG
- One-click reset that preserves your current grid size

---

## Live Demo

[https://lakshitasethia.github.io/Pixel-Art-Generator/](https://lakshitasethia.github.io/Pixel-Art-Generator/)

---

## Getting Started

Clone the repository and open `index.html` in your browser.

```bash
git clone https://github.com/lakshitasethia/Pixel-Art-Generator.git
cd Pixel-Art-Generator
open index.html
```

No installation or setup required.

---

## Usage

| Action | How |
|---|---|
| Draw | Click and drag across the grid |
| Change colour | Use the colour picker in the header |
| Resize grid | Enter a number in the grid input and press Enter |
| Undo | Click Undo or press `Ctrl+Z` |
| Redo | Click Redo or press `Ctrl+Shift+Z` |
| Upload image | Click the file input and select any image |
| Camera capture | Click Camera, allow access, then click Capture |
| Download | Click Download to save your canvas as a PNG |
| Reset canvas | Click the Reset button |

---

## Project Structure

```
pixel-art-generator/
├── index.html
├── style.css
└── script.js
```

---

## Technical Details

- Grid is generated dynamically using CSS Grid with `repeat(n, 1fr)` columns and rows
- Drawing state is tracked via `mousedown` and `mouseup` events on the `window` object, enabling smooth drag-to-paint behaviour
- Undo/redo is implemented using two stacks — each paint action pushes `{ div, previousColor }` onto the history stack, and undo/redo swap between them
- Colour is read live from the input on every `mouseover` event, ensuring the selected colour is always current
- Image pixelation works by drawing the uploaded image onto a hidden canvas scaled to the grid size, then sampling each pixel's RGB value using `getImageData`
- Camera capture uses `navigator.mediaDevices.getUserMedia` to stream live video, snapshots a frame onto a canvas, and feeds it through the same pixelation pipeline
- Download renders the current grid state onto a scaled canvas and triggers a PNG download via a programmatic anchor click

---

## License

MIT
