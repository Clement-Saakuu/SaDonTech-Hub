/**
 * SaDonTech Hub | pdf-viewer.js
 *
 * A view-only, in-page PDF viewer used for expert CVs/resumes.
 *
 * What this actually does, honestly:
 * - Renders each page to a <canvas> instead of opening the browser's native
 *   PDF plugin — so there's no built-in Download/Save/Print toolbar, and no
 *   visible file URL for someone to copy out of the address bar (the
 *   signed URL is only ever passed internally to pdf.js, never navigated to).
 * - No text layer is rendered, so the content can't be selected or
 *   copy-pasted as text.
 * - Right-click and drag are disabled on the canvas.
 * - A faint "view only" watermark (with the date) is baked directly into
 *   each rendered page image.
 *
 * What this does NOT do: stop someone from taking a screenshot of their own
 * screen. No browser-based viewer can prevent that — this raises the bar
 * for casual saving/sharing, it isn't DRM.
 */

import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

let overlay, modal, canvas, ctx, pageLabel, prevBtn, nextBtn, titleEl, statusEl;
let currentPdf = null;
let currentPage = 1;
let watermarkText = "SaDonTech Hub — View Only";

function ensureViewerDom() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.className = "pdfv-overlay";

  modal = document.createElement("div");
  modal.className = "pdfv-modal";
  modal.innerHTML = `
    <div class="pdfv-header">
      <h3 class="pdfv-title" id="pdfvTitle">Document</h3>
      <button type="button" class="pdfv-close" aria-label="Close">&times;</button>
    </div>
    <div class="pdfv-body">
      <p class="pdfv-status" id="pdfvStatus">Loading document...</p>
      <canvas class="pdfv-canvas" id="pdfvCanvas"></canvas>
    </div>
    <div class="pdfv-footer">
      <button type="button" class="pdfv-nav" id="pdfvPrev">&larr; Prev</button>
      <span class="pdfv-page-label" id="pdfvPageLabel"></span>
      <button type="button" class="pdfv-nav" id="pdfvNext">Next &rarr;</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  canvas = modal.querySelector("#pdfvCanvas");
  ctx = canvas.getContext("2d");
  pageLabel = modal.querySelector("#pdfvPageLabel");
  prevBtn = modal.querySelector("#pdfvPrev");
  nextBtn = modal.querySelector("#pdfvNext");
  titleEl = modal.querySelector("#pdfvTitle");
  statusEl = modal.querySelector("#pdfvStatus");

  modal.querySelector(".pdfv-close").addEventListener("click", closeViewer);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeViewer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeViewer();
  });

  prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
  nextBtn.addEventListener("click", () => goToPage(currentPage + 1));

  // Friction against the easiest save paths. Not bulletproof — see notes above.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("dragstart", (e) => e.preventDefault());
}

function closeViewer() {
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
  currentPdf = null;
}

async function goToPage(pageNum) {
  if (!currentPdf || pageNum < 1 || pageNum > currentPdf.numPages) return;
  currentPage = pageNum;
  statusEl.style.display = "none";

  const page = await currentPdf.getPage(currentPage);
  const viewport = page.getViewport({ scale: 1.4 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;
  drawWatermark();

  pageLabel.textContent = `Page ${currentPage} of ${currentPdf.numPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= currentPdf.numPages;
}

function drawWatermark() {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#0c0363";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  for (let y = 60; y < canvas.height; y += 140) {
    ctx.save();
    ctx.translate(canvas.width / 2, y);
    ctx.rotate(-0.4);
    ctx.fillText(watermarkText, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Opens the in-page viewer for a PDF at `url` (typically a short-lived
 * Supabase signed URL — pass that in, never a permanent public URL).
 */
window.openPdfViewer = async function (url, title) {
  ensureViewerDom();
  watermarkText = `SaDonTech Hub — View Only — ${new Date().toLocaleDateString()}`;
  titleEl.textContent = title || "Document";
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
  statusEl.style.display = "block";
  statusEl.textContent = "Loading document...";
  canvas.width = 0;
  canvas.height = 0;

  try {
    const loadingTask = pdfjsLib.getDocument(url);
    currentPdf = await loadingTask.promise;
    currentPage = 1;
    await goToPage(1);
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.textContent = "Couldn't load this document.";
    console.error("PDF viewer error:", err);
  }
};
