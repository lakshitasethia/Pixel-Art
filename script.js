/* =========================================================
   Pixel Art Generator — Complete JS
   ========================================================= */

// ---- DOM refs ----
const container = document.getElementById("pixel-container");
const sizeEl = document.getElementById("grid-count");
const color = document.getElementById("color-picker");
const reset = document.getElementById("btn-reset");
const undoBtn = document.getElementById("btn-undo");
const redoBtn = document.getElementById("btn-redo");
const imageUpload = document.getElementById("image-upload");
const downloadBtn = document.getElementById("btn-download");
const cameraBtn = document.getElementById("btn-camera");
const stopCameraBtn = document.getElementById("btn-stop-camera");
const cameraModal = document.getElementById("camera-modal");
const cameraFeed = document.getElementById("camera-feed");
const modalCaptureBtn = document.getElementById("modal-capture-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");
const liveVideo = document.getElementById("live-video");
const canvasWrapper = document.getElementById("canvas-wrapper");
const frameOverlay = document.getElementById("frame-overlay");
const countdownOverlay = document.getElementById("countdown-overlay");
const captureCanvas = document.getElementById("capture-canvas");
const pixelSlider = document.getElementById("pixel-slider");
const pixelSizeLabel = document.getElementById("pixel-size-value");
const paletteGrid = document.getElementById("palette-grid");
const framesGrid = document.getElementById("frames-grid");
const bigCaptureBtn = document.getElementById("btn-big-capture");
const captureHint = document.getElementById("capture-hint");
const downloadCaptureBtn = document.getElementById("btn-download-capture");
const tabBar = document.getElementById("tab-bar");
const glitchBtn = document.getElementById("btn-glitch");
const glitchStatus = document.getElementById("glitch-status");

// ---- State ----
let draw = false;
const history = [];
const redoStack = [];
let lastImage = null;
let stream = null;
let liveAnimFrame = null;
let currentPalette = "original";
let currentFrame = "none";
let pixelSize = 10;
let cameraActive = false;
let isFrozen = false;
let glitchEnabled = false;

const CANVAS_RESOLUTION = 800; // reference resolution for grid calculation
function getGridSize() {
  return Math.max(4, Math.floor(CANVAS_RESOLUTION / pixelSize));
}

// ---- Palette definitions ----
const PALETTES = {
  original: null, // passthrough
  gameboy: [
    [15, 56, 15],
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15],
  ],
  synthwave: [
    [13, 2, 33],
    [255, 41, 117],
    [0, 255, 240],
    [255, 225, 86],
    [44, 0, 62],
    [120, 0, 200],
    [255, 100, 200],
    [20, 20, 60],
  ],
  c64: [
    [0, 0, 0],
    [255, 255, 255],
    [136, 0, 0],
    [170, 255, 238],
    [204, 68, 204],
    [0, 204, 85],
    [0, 0, 170],
    [238, 238, 119],
    [221, 136, 85],
    [102, 68, 0],
    [255, 119, 119],
    [51, 51, 51],
    [119, 119, 119],
    [170, 255, 102],
    [0, 136, 255],
    [187, 187, 187],
  ],
  neon: [
    [255, 0, 255],
    [0, 255, 0],
    [255, 102, 0],
    [0, 255, 255],
    [255, 255, 0],
    [255, 0, 102],
    [0, 102, 255],
    [180, 0, 255],
    [0, 0, 0],
    [255, 255, 255],
  ],
  ash: [
    [26, 29, 37],
    [42, 45, 53],
    [66, 70, 82],
    [90, 95, 110],
    [120, 126, 140],
    [155, 160, 173],
    [190, 195, 206],
    [215, 219, 228],
    [235, 237, 242],
  ],
};

// ---- Closest color ----
function closestColor(r, g, b, palette) {
  let best = palette[0];
  let bestDist = Infinity;
  for (const c of palette) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

// ---- Grid populate (manual drawing mode) ----
function populate(size) {
  container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  container.style.gap = "1px";
  for (let i = 0; i < size * size; i++) {
    const div = document.createElement("div");
    div.classList.add("pixel");
    container.appendChild(div);

    div.addEventListener("mouseover", function () {
      if (draw) {
        history.push({ div, previousColor: div.style.backgroundColor });
        redoStack.length = 0;
        div.style.backgroundColor = color.value;
      }
    });

    div.addEventListener("mousedown", function () {
      history.push({ div, previousColor: div.style.backgroundColor });
      redoStack.length = 0;
      div.style.backgroundColor = color.value;
    });
  }
}

// ---- Drawing listeners ----
window.addEventListener("mousedown", () => (draw = true));
window.addEventListener("mouseup", () => (draw = false));

// ---- Undo / Redo ----
undoBtn.addEventListener("click", function () {
  if (history.length === 0) return;
  const last = history.pop();
  redoStack.push({
    div: last.div,
    previousColor: last.div.style.backgroundColor,
  });
  last.div.style.backgroundColor = last.previousColor;
});

redoBtn.addEventListener("click", function () {
  if (redoStack.length === 0) return;
  const last = redoStack.pop();
  history.push({
    div: last.div,
    previousColor: last.div.style.backgroundColor,
  });
  last.div.style.backgroundColor = last.previousColor;
});

window.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === "Z") {
    redoBtn.click();
  } else if (e.ctrlKey && e.key === "z") {
    undoBtn.click();
  }
});

// ---- Grid count change ----
sizeEl.addEventListener("keyup", function () {
  if (lastImage) {
    applyImage(lastImage);
  } else {
    container.innerHTML = "";
    history.length = 0;
    redoStack.length = 0;
    populate(sizeEl.value);
  }
});

// ---- Reset ----
reset.addEventListener("click", function () {
  stopLiveFeed();
  lastImage = null;
  container.innerHTML = "";
  history.length = 0;
  redoStack.length = 0;
  captureCanvas.classList.remove("visible");
  downloadCaptureBtn.classList.add("hidden");
  captureHint.textContent = "Tap to capture a photo";
  isFrozen = false;
  populate(sizeEl.value);
});

// ---- Image Upload ----
imageUpload.addEventListener("change", function () {
  const file = imageUpload.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      lastImage = img;
      applyImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function applyImage(img) {
  const gridSize = parseInt(sizeEl.value);
  const canvas = document.createElement("canvas");
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, gridSize, gridSize);

  container.innerHTML = "";
  history.length = 0;
  redoStack.length = 0;
  populate(gridSize);

  const palette = PALETTES[currentPalette];
  const pixels = container.querySelectorAll(".pixel");
  pixels.forEach((pixel, i) => {
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    let [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    if (palette) {
      [r, g, b] = closestColor(r, g, b, palette);
    }
    pixel.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  });
}

// ---- Download (header button, existing) ----
downloadBtn.addEventListener("click", function () {
  const gridSize = parseInt(sizeEl.value);
  const blockSize = 20;

  const canvas = document.createElement("canvas");
  canvas.width = gridSize * blockSize;
  canvas.height = gridSize * blockSize;
  const ctx = canvas.getContext("2d");

  const pixels = container.querySelectorAll(".pixel");
  pixels.forEach((pixel, i) => {
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    ctx.fillStyle = pixel.style.backgroundColor || "rgb(61, 61, 61)";
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
  });

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "pixel-art.png";
  a.click();
});

// ---- Camera modal (legacy, kept) ----
cameraBtn.addEventListener("click", async function () {
  // Start live camera feed directly onto the pixel grid
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    liveVideo.srcObject = stream;
    cameraBtn.style.display = "none";
    stopCameraBtn.style.display = "";
    captureCanvas.classList.remove("visible");
    downloadCaptureBtn.classList.add("hidden");
    captureHint.textContent = "Tap to capture a photo";
    isFrozen = false;
    cameraActive = true;
    startLiveFeed();
  } catch (err) {
    console.error("Camera error:", err);
  }
});

stopCameraBtn.addEventListener("click", function () {
  stopLiveFeed();
});

modalCaptureBtn.addEventListener("click", function () {
  const canvas = document.createElement("canvas");
  canvas.width = cameraFeed.videoWidth;
  canvas.height = cameraFeed.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraFeed, 0, 0);

  const img = new Image();
  img.onload = function () {
    lastImage = img;
    applyImage(img);
  };
  img.src = canvas.toDataURL();

  if (stream) stream.getTracks().forEach((t) => t.stop());
  cameraModal.style.display = "none";
});

modalCloseBtn.addEventListener("click", function () {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  cameraModal.style.display = "none";
});

// ---- Live Camera → Pixel Grid ----
function startLiveFeed() {
  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d");

  function renderFrame() {
    if (!stream || isFrozen) return;

    const gridSize = getGridSize();
    offscreen.width = gridSize;
    offscreen.height = gridSize;
    // Mirror the camera (selfie mode)
    offCtx.save();
    offCtx.scale(-1, 1);
    offCtx.translate(-gridSize, 0);
    offCtx.drawImage(liveVideo, 0, 0, gridSize, gridSize);
    offCtx.restore();

    // Rebuild grid if needed
    const currentPixels = container.querySelectorAll(".pixel");
    if (currentPixels.length !== gridSize * gridSize) {
      container.innerHTML = "";
      container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
      container.style.gap = "0px";
      for (let i = 0; i < gridSize * gridSize; i++) {
        const div = document.createElement("div");
        div.classList.add("pixel");
        container.appendChild(div);
      }
    }

    const palette = PALETTES[currentPalette];
    const imgData = offCtx.getImageData(0, 0, gridSize, gridSize).data;
    const pixels = container.querySelectorAll(".pixel");

    for (let i = 0; i < pixels.length; i++) {
      const idx = i * 4;
      let r = imgData[idx];
      let g = imgData[idx + 1];
      let b = imgData[idx + 2];
      if (palette) {
        [r, g, b] = closestColor(r, g, b, palette);
      }
      pixels[i].style.backgroundColor = `rgb(${r},${g},${b})`;
    }

    // Apply glitch effect: offset random horizontal slices
    if (glitchEnabled) {
      const sliceCount = 2 + Math.floor(Math.random() * 2); // 2-3 slices
      for (let s = 0; s < sliceCount; s++) {
        const sliceY = Math.floor(Math.random() * gridSize);
        const sliceH = 1 + Math.floor(Math.random() * 3);
        const offset = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const tintR = Math.random() > 0.5 ? 40 : 0;
        const tintG = Math.random() > 0.5 ? -30 : 0;
        const tintB = Math.random() > 0.5 ? 50 : 0;
        for (let row = sliceY; row < Math.min(sliceY + sliceH, gridSize); row++) {
          for (let col = 0; col < gridSize; col++) {
            const srcCol = col - offset;
            if (srcCol < 0 || srcCol >= gridSize) continue;
            const srcIdx = row * gridSize + srcCol;
            const dstIdx = row * gridSize + col;
            if (srcIdx >= 0 && srcIdx < pixels.length && dstIdx >= 0 && dstIdx < pixels.length) {
              const srcColor = pixels[srcIdx].style.backgroundColor;
              const match = srcColor.match(/\d+/g);
              if (match) {
                const cr = Math.min(255, Math.max(0, parseInt(match[0]) + tintR));
                const cg = Math.min(255, Math.max(0, parseInt(match[1]) + tintG));
                const cb = Math.min(255, Math.max(0, parseInt(match[2]) + tintB));
                pixels[dstIdx].style.backgroundColor = `rgb(${cr},${cg},${cb})`;
              }
            }
          }
        }
      }
    }

    liveAnimFrame = requestAnimationFrame(renderFrame);
  }

  liveAnimFrame = requestAnimationFrame(renderFrame);
}

function stopLiveFeed() {
  if (liveAnimFrame) {
    cancelAnimationFrame(liveAnimFrame);
    liveAnimFrame = null;
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    liveVideo.srcObject = null;
  }
  cameraActive = false;
  cameraBtn.style.display = "";
  stopCameraBtn.style.display = "none";

  // Restore the interactive drawing grid
  container.innerHTML = "";
  history.length = 0;
  redoStack.length = 0;
  const gridSize = parseInt(sizeEl.value);
  populate(gridSize);
}

// ---- Pixel Slider ----
pixelSlider.addEventListener("input", function () {
  pixelSize = parseInt(pixelSlider.value);
  pixelSizeLabel.textContent = pixelSize;
  const gridCount = getGridSize();
  sizeEl.value = gridCount;

  // If we have a static image and no live feed, re-apply
  if (!stream && lastImage) {
    applyImage(lastImage);
  } else if (!stream) {
    container.innerHTML = "";
    history.length = 0;
    redoStack.length = 0;
    populate(gridCount);
  }
  // If live feed is running, the renderFrame loop picks up new pixelSize automatically
});

// ---- Tab switching ----
tabBar.addEventListener("click", function (e) {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  const tab = btn.dataset.tab;

  // Update tab buttons
  tabBar.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));
  document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add("active");
});

// ---- Palette switching ----
paletteGrid.addEventListener("click", function (e) {
  const btn = e.target.closest(".palette-btn");
  if (!btn) return;

  paletteGrid.querySelectorAll(".palette-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentPalette = btn.dataset.palette;

  // If static image, re-apply with new palette
  if (!stream && lastImage) {
    applyImage(lastImage);
  }
  // Live feed picks it up automatically
});

// ---- Frame switching ----
framesGrid.addEventListener("click", function (e) {
  const btn = e.target.closest(".frame-btn");
  if (!btn) return;

  framesGrid.querySelectorAll(".frame-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentFrame = btn.dataset.frame;

  // Update overlay class
  frameOverlay.className = "frame-overlay";
  if (currentFrame !== "none") {
    frameOverlay.classList.add(currentFrame);
  }
});

// ---- Capture (big button) — instant, no countdown ----
bigCaptureBtn.addEventListener("click", function () {
  if (isFrozen) {
    resumeFromCapture();
    return;
  }

  // Flash
  canvasWrapper.classList.add("flash");
  setTimeout(() => canvasWrapper.classList.remove("flash"), 500);

  // Freeze current frame instantly
  freezeFrame();
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freezeFrame() {
  isFrozen = true;

  const gridSize = getGridSize();
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const canvasSize = Math.round(wrapperRect.width);

  captureCanvas.width = canvasSize;
  captureCanvas.height = canvasSize;
  const ctx = captureCanvas.getContext("2d");
  const blockW = canvasSize / gridSize;
  const blockH = canvasSize / gridSize;

  const pixels = container.querySelectorAll(".pixel");
  pixels.forEach((pixel, i) => {
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    ctx.fillStyle = pixel.style.backgroundColor || "rgb(61,61,61)";
    ctx.fillRect(x * blockW, y * blockH, Math.ceil(blockW), Math.ceil(blockH));
  });

  // Draw frame overlay onto capture canvas
  drawFrameOnCanvas(ctx, canvasSize, canvasSize);

  captureCanvas.classList.add("visible");
  captureHint.textContent = "Photo captured! Tap button to resume.";

  // Prepare download
  downloadCaptureBtn.classList.remove("hidden");
  downloadCaptureBtn.href = captureCanvas.toDataURL("image/png");
  downloadCaptureBtn.download = "pixel-capture.png";

  // Auto-resume after 15 seconds if still frozen
  setTimeout(() => {
    if (isFrozen) resumeFromCapture();
  }, 15000);
}

function drawFrameOnCanvas(ctx, w, h) {
  ctx.save();
  if (currentFrame === "arcade") {
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, w, h);
    // Colorful scanlines at top/bottom
    const colors = ["#ff00ff", "#00ffff", "#ffff00"];
    for (let i = 0; i < w; i += 24) {
      ctx.fillStyle = colors[Math.floor(i / 8) % 3];
      ctx.fillRect(i, 0, 8, 12);
      ctx.fillRect(i, h - 12, 8, 12);
    }
    // Text
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#ffff00";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ffff00";
    ctx.shadowBlur = 8;
    ctx.fillText("INSERT COIN ▶", w / 2, h - 18);
  } else if (currentFrame === "vhs") {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
    // Scanlines
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, y, w, 2);
    }
    // REC
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#ff3333";
    ctx.textAlign = "left";
    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 6;
    ctx.fillText("▶ REC", 18, 26);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText("00:03:27", w - 18, 26);
  } else if (currentFrame === "glam") {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#f9d423");
    grad.addColorStop(0.25, "#ff4e50");
    grad.addColorStop(0.5, "#f9d423");
    grad.addColorStop(0.75, "#e91e63");
    grad.addColorStop(1, "#f9d423");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
    // Stars
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f9d423";
    ctx.shadowColor = "rgba(249,212,35,0.6)";
    ctx.shadowBlur = 6;
    ctx.fillText("✦ ✧ ✦", w / 2, 28);
    ctx.fillText("✧ ✦ ✧", w / 2, h - 12);
  } else if (currentFrame === "circuit") {
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, w, h);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(0,255,0,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.setLineDash([]);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "#0f0";
    ctx.textAlign = "right";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 6;
    ctx.fillText("⚡ SYS.ONLINE", w - 14, h - 14);
  }
  ctx.restore();
}

function resumeFromCapture() {
  isFrozen = false;
  captureCanvas.classList.remove("visible");
  downloadCaptureBtn.classList.add("hidden");
  captureHint.textContent = "Tap to capture a photo";

  // If camera stream is still going, resume rendering
  if (stream) {
    startLiveFeed();
  }
}

// ---- Glitch toggle ----
glitchBtn.addEventListener("click", function () {
  glitchEnabled = !glitchEnabled;
  glitchBtn.classList.toggle("active", glitchEnabled);
  glitchStatus.textContent = glitchEnabled ? "ON" : "OFF";
});

// ---- Download Capture ----
downloadCaptureBtn.addEventListener("click", function (e) {
  // The href/download is already set — default link behavior handles it.
  // After a small delay, resume
  setTimeout(() => {
    resumeFromCapture();
  }, 1500);
});

// ---- Init ----
const initGrid = getGridSize();
sizeEl.value = initGrid;
populate(initGrid);
pixelSlider.value = pixelSize;
pixelSizeLabel.textContent = pixelSize;
