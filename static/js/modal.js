let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.className = "modal-overlay";
  overlayEl.innerHTML = `<div class="modal"><button class="modal-close" aria-label="Chiudi">×</button><div class="modal-body"></div></div>`;
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) closeModal();
  });
  overlayEl.querySelector(".modal-close").onclick = closeModal;
  document.body.appendChild(overlayEl);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  return overlayEl;
}

export function openModal(html) {
  const el = ensureOverlay();
  el.querySelector(".modal-body").innerHTML = html;
  el.classList.add("open");
}

export function closeModal() {
  if (overlayEl) overlayEl.classList.remove("open");
}

export function modalBody() {
  return overlayEl ? overlayEl.querySelector(".modal-body") : null;
}
