import { api } from "../api.js";

export async function renderRecon(container) {
  container.innerHTML = `
    <h1>Recon</h1>
    <div class="card">
      <div class="row">
        <div class="field"><label>Durata scan (s)</label><input id="r-time" type="number" value="30" /></div>
        <div class="field"><label>Banda</label>
          <select id="r-band"><option value="2.4">2.4GHz</option><option value="5">5GHz</option><option value="2.4,5">Entrambe</option></select>
        </div>
        <div class="field"><label>Live</label><select id="r-live"><option value="false">No</option><option value="true">Sì</option></select></div>
      </div>
      <button class="primary" id="r-start">Avvia scan</button>
      <button class="danger" id="r-stop">Ferma scan</button>
      <div id="r-status" class="muted" style="margin-top:8px"></div>
    </div>

    <h2>Scansioni precedenti</h2>
    <div id="r-scans" class="card"><p class="empty">Caricamento...</p></div>

    <h2>Dettaglio scan</h2>
    <div id="r-detail" class="card"><p class="empty">Seleziona una scansione.</p></div>
  `;

  container.querySelector("#r-start").onclick = async () => {
    await api.post("/proxy/recon/start", {
      live: container.querySelector("#r-live").value === "true",
      scan_time: Number(container.querySelector("#r-time").value || 30),
      band: container.querySelector("#r-band").value,
    });
    api.toast("Scan avviato");
    refreshStatus();
  };
  container.querySelector("#r-stop").onclick = async () => {
    await api.post("/proxy/recon/stop");
    api.toast("Scan interrotto");
    refreshStatus();
    loadScans();
  };

  async function refreshStatus() {
    const el = container.querySelector("#r-status");
    try {
      const s = await api.get("/proxy/recon/status");
      el.textContent = `scan attivo: ${s.scanRunning ? "sì" : "no"} · capture: ${s.captureRunning ? "sì" : "no"} · progresso: ${s.scanPercent ?? 0}%`;
    } catch {
      el.textContent = "";
    }
  }

  async function loadScans() {
    const el = container.querySelector("#r-scans");
    const scans = (await api.get("/proxy/recon/scans")) || [];
    if (!scans.length) {
      el.innerHTML = `<p class="empty">Nessuna scansione salvata.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>ID</th><th>Data</th><th>Azioni</th></tr></thead>
      <tbody>${scans.map((s) => `<tr>
        <td>${s.scan_id}</td><td>${escapeHtml(s.date ?? "-")}</td>
        <td>
          <button data-view="${s.scan_id}">Vedi</button>
          <button data-download="${s.scan_id}">Download JSON</button>
          <button class="danger" data-delete="${s.scan_id}">Elimina</button>
        </td>
      </tr>`).join("")}</tbody>
    </table>`;

    el.querySelectorAll("[data-view]").forEach((btn) => (btn.onclick = () => showDetail(btn.dataset.view)));
    el.querySelectorAll("[data-delete]").forEach((btn) => (btn.onclick = async () => {
      await api.del(`/proxy/recon/scans/${btn.dataset.delete}`);
      loadScans();
    }));
    el.querySelectorAll("[data-download]").forEach((btn) => (btn.onclick = async () => {
      await api.post(`/proxy/recon/scans/${btn.dataset.download}/download/json`);
      api.toast("Download richiesto");
    }));
  }

  async function showDetail(scanId) {
    const el = container.querySelector("#r-detail");
    const data = await api.get(`/proxy/recon/scans/${scanId}`);
    const aps = data?.APResults || [];
    if (!aps.length) {
      el.innerHTML = `<p class="empty">Nessun access point rilevato in questa scansione.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>SSID</th><th>BSSID</th><th>Canale</th><th>Segnale</th><th>Client</th></tr></thead>
      <tbody>${aps.map((ap) => `<tr>
        <td>${escapeHtml(ap.ssid || "(hidden)")}</td>
        <td>${escapeHtml(ap.bssid)}</td>
        <td>${ap.channel}</td>
        <td>${ap.signal}</td>
        <td>${(ap.clients || []).length}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  await Promise.all([refreshStatus(), loadScans()]);
}
