import { api } from "../api.js";

export async function renderDashboard(container) {
  container.innerHTML = `<h1>Dashboard</h1><div id="dash-cards" class="grid"></div>
    <h2>News</h2><div id="dash-news" class="card"><p class="empty">Caricamento...</p></div>`;

  const cardsEl = container.querySelector("#dash-cards");
  const newsEl = container.querySelector("#dash-news");

  loadCards(cardsEl);
  loadNews(newsEl);
}

async function loadCards(cardsEl) {
  try {
    const d = (await api.get("/proxy/dashboard/cards")) || {};
    const sys = d.systemStatus || {};
    const disk = d.diskUsage || {};
    const ssids = d.ssidsSeen || {};
    cardsEl.innerHTML = [
      stat("Client connessi", fmtVal(d.clientsConnected)),
      stat("Client precedenti", fmtVal(d.previousClients)),
      stat("Uso disco (root)", fmtVal(disk.rootUsage)),
      stat("SSID attuali", fmtVal(ssids.currentSSIDs)),
      stat("SSID totali visti", fmtVal(ssids.totalSSIDs)),
      stat("CPU", fmtPct(sys.cpuUsage)),
      stat("Memoria", fmtPct(sys.memoryUsage)),
      stat("Temperatura", fmtTemp(sys.temperature)),
    ].join("");
  } catch (err) {
    cardsEl.innerHTML = `<p class="empty">Cards non disponibili: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadNews(newsEl) {
  try {
    const data = await api.get("/proxy/dashboard/news", { silent: true });
    const items = data?.news || [];
    newsEl.innerHTML = items.length
      ? `<table><tbody>${items.map((n) => `<tr><td>${escapeHtml(JSON.stringify(n))}</td></tr>`).join("")}</tbody></table>`
      : `<p class="empty">Nessuna news.</p>`;
  } catch {
    newsEl.innerHTML = `<p class="empty">Impossibile recuperare le news dal device (probabilmente nessuna connessione a Internet).</p>`;
  }
}

function stat(label, value) {
  return `<div class="card stat"><div class="value">${escapeHtml(String(value))}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function fmtVal(v) {
  if (v === null || v === undefined || v === "") return "-";
  return v;
}

function fmtPct(v) {
  if (v === null || v === undefined || v === "") return "-";
  const s = String(v);
  return s.endsWith("%") ? s : `${s}%`;
}

function fmtTemp(v) {
  if (v === null || v === undefined || v === "" || v === "--") return "-";
  const s = String(v);
  return s.endsWith("°C") ? s : `${s}°C`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
