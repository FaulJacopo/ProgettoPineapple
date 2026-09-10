import { api } from "../api.js";

export async function renderDashboard(container) {
  container.innerHTML = `<h1>Dashboard</h1><div id="dash-cards" class="grid"></div>
    <h2>News</h2><div id="dash-news" class="card"><p class="empty">Caricamento...</p></div>`;

  const [cards, news] = await Promise.allSettled([
    api.get("/proxy/dashboard/cards"),
    api.get("/proxy/dashboard/news"),
  ]);

  const cardsEl = container.querySelector("#dash-cards");
  if (cards.status === "fulfilled") {
    const d = cards.value || {};
    const sys = d.systemStatus || {};
    const disk = d.diskUsage || {};
    const ssids = d.ssidsSeen || {};
    cardsEl.innerHTML = [
      stat("Client connessi", d.clientsConnected ?? "-"),
      stat("Client precedenti", d.previousClients ?? "-"),
      stat("Uso disco (root)", disk.rootUsage ?? "-"),
      stat("SSID attuali", ssids.currentSSIDs ?? "-"),
      stat("SSID totali visti", ssids.totalSSIDs ?? "-"),
      stat("CPU", fmtPct(sys.cpuUsage)),
      stat("Memoria", fmtPct(sys.memoryUsage)),
      stat("Temperatura", sys.temperature != null ? `${sys.temperature}°C` : "-"),
    ].join("");
  } else {
    cardsEl.innerHTML = `<p class="empty">Cards non disponibili: ${cards.reason.message}</p>`;
  }

  const newsEl = container.querySelector("#dash-news");
  if (news.status === "fulfilled") {
    const items = news.value?.news || [];
    newsEl.innerHTML = items.length
      ? `<table><tbody>${items.map((n) => `<tr><td>${escapeHtml(JSON.stringify(n))}</td></tr>`).join("")}</tbody></table>`
      : `<p class="empty">Nessuna news.</p>`;
  } else {
    newsEl.innerHTML = `<p class="empty">News non disponibili: ${news.reason.message}</p>`;
  }
}

function stat(label, value) {
  return `<div class="card stat"><div class="value">${escapeHtml(String(value))}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function fmtPct(v) {
  return v != null ? `${v}%` : "-";
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
