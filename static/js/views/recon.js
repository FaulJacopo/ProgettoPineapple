import { api } from "../api.js";
import { openModal, modalBody } from "../modal.js";

export async function renderRecon(container) {
  const selectedScanIds = new Set();

  container.innerHTML = `
    <h1>Recon</h1>
    <div class="card">
      <div class="row">
        <div class="field"><label>Durata scan (s)</label><input id="r-time" type="number" value="30" /></div>
        <div class="field"><label>Banda</label>
          <select id="r-band"><option value="2.4" selected>2.4GHz</option><option value="5">5GHz</option><option value="2.4,5">Entrambe (bug firmware: SSID non decodificati)</option></select>
        </div>
        <div class="field"><label>Live</label><select id="r-live"><option value="false">No</option><option value="true">Sì</option></select></div>
      </div>
      <button class="primary" id="r-start">Avvia scan</button>
      <button class="danger" id="r-stop">Ferma scan</button>
      <div id="r-status" class="muted" style="margin-top:8px"></div>
    </div>

    <div id="r-radio-warning"></div>

    <h2>Access point rilevati (scan in corso)</h2>
    <div id="r-live-aps" class="card"><p class="empty">Nessuno scan in corso. Avvia uno scan per vedere gli AP in tempo reale.</p></div>

    <h2>Cerca SSID nella cronologia</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">Trova tutti i BSSID mai visti associati a un nome rete, utile se la rete diventa nascosta in seguito.</p>
      <div class="row">
        <div class="field"><label>Nome rete (anche parziale)</label><input id="r-history-query" type="text" placeholder="es. Hotel_Zurigo" /></div>
      </div>
      <button class="primary" id="r-history-search">Cerca</button>
      <div id="r-history-result" style="margin-top:12px"></div>
    </div>

    <h2>Scansioni precedenti</h2>
    <div id="r-scans" class="card"><p class="empty">Caricamento...</p></div>

    <h2>Dettaglio scan</h2>
    <div id="r-detail" class="card"><p class="empty">Seleziona una scansione.</p></div>
  `;

  checkRadioContention(container);

  container.querySelector("#r-start").onclick = async () => {
    try {
      await api.post("/proxy/recon/start", {
        live: container.querySelector("#r-live").value === "true",
        scan_time: Number(container.querySelector("#r-time").value || 30),
        band: container.querySelector("#r-band").value,
      });
      api.toast("Scan avviato");
      refreshStatus();
    } catch (err) {
      api.toast(`Impossibile avviare lo scan: ${err.message}`, true);
    }
  };
  container.querySelector("#r-stop").onclick = async () => {
    await api.post("/proxy/recon/stop");
    api.toast("Scan interrotto");
    refreshStatus();
    loadScans();
  };

  container.querySelector("#r-history-search").onclick = () => {
    const query = container.querySelector("#r-history-query").value.trim();
    searchSsidHistory(container, query);
  };

  let wasRunning = false;

  async function refreshStatus() {
    const el = container.querySelector("#r-status");
    try {
      const s = await api.get("/proxy/recon/status");
      el.textContent = `scan attivo: ${s.scanRunning ? "sì" : "no"} · capture: ${s.captureRunning ? "sì" : "no"} · progresso: ${s.scanPercent ?? 0}%`;
      if (s.scanRunning) {
        loadLiveAps(s.scanID);
      } else if (wasRunning) {
        api.toast("Scan completato");
        loadScans();
        loadLiveAps(null);
      }
      wasRunning = !!s.scanRunning;
    } catch {
      el.textContent = "";
      wasRunning = false;
    }
  }

  const pollHandle = setInterval(() => {
    if (!document.body.contains(container)) {
      clearInterval(pollHandle);
      return;
    }
    refreshStatus();
  }, 2000);

  async function loadLiveAps(scanId) {
    const el = container.querySelector("#r-live-aps");
    if (scanId === null || scanId === undefined) {
      el.innerHTML = `<p class="empty">Nessuno scan in corso. Avvia uno scan per vedere gli AP in tempo reale.</p>`;
      return;
    }
    let data;
    try {
      data = await api.get(`/proxy/recon/scans/${scanId}`);
    } catch {
      return;
    }
    renderApTable(el, data?.APResults || [], { showEmpty: true });
  }

  async function loadScans() {
    const el = container.querySelector("#r-scans");
    const scans = (await api.get("/proxy/recon/scans")) || [];
    if (!scans.length) {
      selectedScanIds.clear();
      el.innerHTML = `<p class="empty">Nessuna scansione salvata.</p>`;
      return;
    }

    const availableScanIds = new Set(scans.map((scan) => String(scan.scan_id)));
    for (const scanId of selectedScanIds) {
      if (!availableScanIds.has(scanId)) selectedScanIds.delete(scanId);
    }

    el.innerHTML = `<div class="row" style="align-items:center;gap:12px;margin-bottom:12px">
      <label class="checkbox-row" style="margin:0">
        <input id="r-select-all-scans" type="checkbox" />
        Seleziona tutte
      </label>
      <button class="primary" id="r-download-merged" disabled>Download CSV unificato</button>
      <span class="muted" id="r-selected-count">Seleziona almeno 2 scansioni</span>
    </div>
    <table>
      <thead><tr><th>Seleziona</th><th>ID</th><th>Data</th><th>Azioni</th></tr></thead>
      <tbody>${scans.map((s) => `<tr>
        <td><label class="checkbox-row" style="display:inline-flex;margin:0">
          <input type="checkbox" data-select-scan="${escapeHtml(s.scan_id)}" ${selectedScanIds.has(String(s.scan_id)) ? "checked" : ""} aria-label="Seleziona scansione ${escapeHtml(s.scan_id)}" />
        </label></td>
        <td>${escapeHtml(s.scan_id)}</td><td>${escapeHtml(s.date ?? "-")}</td>
        <td>
          <button data-view="${s.scan_id}">Vedi</button>
          <button data-download="${s.scan_id}">Download JSON</button>
          <button class="danger" data-delete="${s.scan_id}">Elimina</button>
        </td>
      </tr>`).join("")}</tbody>
    </table>`;

    const selectAll = el.querySelector("#r-select-all-scans");
    const downloadMerged = el.querySelector("#r-download-merged");
    const selectedCount = el.querySelector("#r-selected-count");
    const selectionInputs = [...el.querySelectorAll("[data-select-scan]")];

    function updateSelectionControls() {
      const selectedCountValue = selectionInputs.filter((input) => input.checked).length;
      selectAll.checked = selectedCountValue === selectionInputs.length;
      selectAll.indeterminate = selectedCountValue > 0 && selectedCountValue < selectionInputs.length;
      downloadMerged.disabled = selectedCountValue < 2;
      selectedCount.textContent = selectedCountValue === 0
        ? "Seleziona almeno 2 scansioni"
        : `${selectedCountValue} ${selectedCountValue === 1 ? "scansione selezionata" : "scansioni selezionate"}`;
    }

    selectAll.onchange = () => {
      selectionInputs.forEach((input) => {
        input.checked = selectAll.checked;
        if (input.checked) selectedScanIds.add(input.dataset.selectScan);
        else selectedScanIds.delete(input.dataset.selectScan);
      });
      updateSelectionControls();
    };

    selectionInputs.forEach((input) => (input.onchange = () => {
      if (input.checked) selectedScanIds.add(input.dataset.selectScan);
      else selectedScanIds.delete(input.dataset.selectScan);
      updateSelectionControls();
    }));

    downloadMerged.onclick = async () => {
      const scanIds = selectionInputs.filter((input) => input.checked).map((input) => input.dataset.selectScan);
      if (scanIds.length < 2) return;
      downloadMerged.disabled = true;
      downloadMerged.textContent = "Preparazione...";
      const downloaded = await downloadMergedScans(scanIds);
      downloadMerged.textContent = "Download CSV unificato";
      updateSelectionControls();
      if (downloaded) api.toast("File unificato scaricato");
    };

    el.querySelectorAll("[data-view]").forEach((btn) => (btn.onclick = () => showDetail(btn.dataset.view)));
    el.querySelectorAll("[data-delete]").forEach((btn) => (btn.onclick = async () => {
      await api.del(`/proxy/recon/scans/${btn.dataset.delete}`);
      selectedScanIds.delete(btn.dataset.delete);
      loadScans();
    }));
    el.querySelectorAll("[data-download]").forEach((btn) => (btn.onclick = () => downloadScan(btn.dataset.download)));

    updateSelectionControls();
  }

  async function searchSsidHistory(container, query) {
    const el = container.querySelector("#r-history-result");
    if (!query) {
      el.innerHTML = `<p class="empty">Inserisci un nome (anche parziale) da cercare.</p>`;
      return;
    }
    el.innerHTML = `<p class="muted">Ricerca in corso tra tutte le scansioni salvate...</p>`;

    const scans = (await api.get("/proxy/recon/scans")) || [];
    const needle = query.toLowerCase();
    const seen = new Map();

    for (const s of scans) {
      let data;
      try {
        data = await api.get(`/proxy/recon/scans/${s.scan_id}`, { silent: true });
      } catch {
        continue;
      }
      for (const ap of data?.APResults || []) {
        if (!ap.ssid || !ap.ssid.toLowerCase().includes(needle)) continue;
        const key = ap.bssid;
        const prev = seen.get(key);
        if (!prev || (ap.last_seen ?? 0) > (prev.last_seen ?? 0)) {
          seen.set(key, { ...ap, scan_id: s.scan_id, scan_date: s.date });
        }
      }
    }

    if (!seen.size) {
      el.innerHTML = `<p class="empty">Nessun BSSID trovato per "${escapeHtml(query)}" nelle scansioni salvate.</p>`;
      return;
    }

    const rows = [...seen.values()].sort((a, b) => (b.last_seen ?? 0) - (a.last_seen ?? 0));
    el.innerHTML = `<table>
      <thead><tr><th>SSID</th><th>BSSID</th><th>Canale</th><th>Ultimo scan</th><th>Ultima rilevazione</th></tr></thead>
      <tbody>${rows.map((ap) => `<tr>
        <td>${escapeHtml(ap.ssid)}</td>
        <td>${escapeHtml(ap.bssid)}</td>
        <td>${ap.channel ?? "-"}</td>
        <td>#${ap.scan_id} (${escapeHtml(ap.scan_date ?? "-")})</td>
        <td>${fmtEpoch(ap.last_seen)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }

  async function downloadScan(scanId) {
    let resp;
    try {
      resp = await fetch(`/proxy/recon/scans/${scanId}/download/json`, { method: "POST" });
    } catch (err) {
      api.toast(`Errore di rete: ${err.message}`, true);
      return;
    }
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      api.toast((data && data.detail && data.detail.error) || `HTTP ${resp.status}`, true);
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recon-scan-${scanId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadMergedScans(scanIds) {
    let resp;
    try {
      resp = await fetch(`/proxy/recon/scans/download/merged/csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_ids: scanIds }),
      });
    } catch (err) {
      api.toast(`Errore di rete: ${err.message}`, true);
      return false;
    }
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      api.toast((data && data.detail && data.detail.error) || `HTTP ${resp.status}`, true);
      return false;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recon-scans-merged-${scanIds.join("-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  async function showDetail(scanId) {
    const el = container.querySelector("#r-detail");
    const data = await api.get(`/proxy/recon/scans/${scanId}`);
    renderApTable(el, data?.APResults || [], { showEmpty: true, emptyText: "Nessun access point rilevato in questa scansione." });
  }

  function renderApTable(el, aps, { emptyText = "Nessun access point rilevato." } = {}) {
    if (!aps.length) {
      el.innerHTML = `<p class="empty">${emptyText}</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>SSID</th><th>BSSID</th><th>Canale</th><th>Segnale</th><th>Client</th><th>Azioni</th></tr></thead>
      <tbody>${aps.map((ap, i) => {
        const clients = clientMacs(ap.clients);
        return `<tr data-ap-row="${i}" style="cursor:pointer">
        <td>${escapeHtml(ap.ssid || "(hidden)")}</td>
        <td>${escapeHtml(ap.bssid)}</td>
        <td>${ap.channel}</td>
        <td>${signalBar(ap.signal)}</td>
        <td>${clients.length}</td>
        <td><button class="danger" data-deauth-ap="${i}">Deauth tutti</button></td>
      </tr>`;
      }).join("")}</tbody>
    </table>`;

    el.querySelectorAll("[data-ap-row]").forEach((row) => (row.onclick = (e) => {
      if (e.target.closest("button")) return;
      openApDetail(aps[Number(row.dataset.apRow)], deauthAp);
    }));
    el.querySelectorAll("[data-deauth-ap]").forEach((btn) => (btn.onclick = (e) => {
      e.stopPropagation();
      deauthAp(aps[Number(btn.dataset.deauthAp)]);
    }));
  }

  async function deauthAp(ap) {
    const clients = clientMacs(ap.clients);
    const label = ap.ssid || ap.bssid;
    const msg = clients.length
      ? `Deautenticare tutti i ${clients.length} client di "${label}"? Questo scollegherà i dispositivi realmente connessi a questo AP.`
      : `Nessun client rilevato per "${label}" in questa scansione, ma verrà comunque inviato un deauth generico verso l'AP (potrebbe scollegare dispositivi non rilevati, es. in stand-by). Procedere?`;
    if (!confirm(msg)) return;
    try {
      await api.post("/proxy/pineap/deauth/ap", {
        bssid: ap.bssid,
        channel: Number(ap.channel) || 0,
        multiplier: 1,
        clients,
      });
      api.toast(clients.length ? `Deauth avviato su ${clients.length} client` : "Deauth AP avviato");
    } catch (err) {
      api.toast(`Deauth non riuscito: ${err.message}`, true);
    }
  }

  function signalBar(signal) {
    const n = Number(signal);
    const level = n >= -55 ? 4 : n >= -70 ? 3 : n >= -85 ? 2 : 1;
    const bars = [1, 2, 3, 4].map((b) => `<span class="${b <= level ? "on" : ""}"></span>`).join("");
    return `<span class="signal-bar"><span class="bars">${bars}</span> ${escapeHtml(String(signal))} dBm</span>`;
  }

  async function openApDetail(ap, onDeauth) {
    const clients = clientMacs(ap.clients);
    const vendor = await lookupVendor(ap.bssid);
    const clientRows = await Promise.all(clients.map(async (mac) => {
      const v = await lookupVendor(mac);
      return `<tr><td>${escapeHtml(mac)}</td><td>${escapeHtml(v)}</td></tr>`;
    }));

    openModal(`
      <h3>${escapeHtml(ap.ssid || "(SSID nascosto)")}</h3>
      <div class="subtitle">${escapeHtml(ap.bssid)}${vendor ? ` · ${escapeHtml(vendor)}` : ""}</div>
      <div class="kv-grid">
        <div class="kv-item"><div class="kv-label">Canale</div><div class="kv-value">${ap.channel ?? "-"}</div></div>
        <div class="kv-item"><div class="kv-label">Segnale</div><div class="kv-value">${signalBar(ap.signal)}</div></div>
        <div class="kv-item"><div class="kv-label">Nascosto</div><div class="kv-value">${ap.hidden ? "Sì" : "No"}</div></div>
        <div class="kv-item"><div class="kv-label">WPS</div><div class="kv-value">${ap.wps ? "Sì" : "No"}</div></div>
        <div class="kv-item"><div class="kv-label">Client connessi</div><div class="kv-value">${clients.length}</div></div>
        <div class="kv-item"><div class="kv-label">Ultima rilevazione</div><div class="kv-value">${fmtEpoch(ap.last_seen)}</div></div>
      </div>
      <h2 style="margin-top:20px">Client connessi</h2>
      ${clients.length
        ? `<table><thead><tr><th>MAC</th><th>Vendor</th></tr></thead><tbody>${clientRows.join("")}</tbody></table>`
        : `<p class="empty">Nessun client rilevato per questo AP in questa scansione (potrebbero comunque esserci dispositivi non rilevati o in stand-by).</p>`}
      <button class="danger" style="margin-top:16px" id="modal-deauth-btn">Deauth tutti i client</button>
      <button style="margin-top:16px" id="modal-identify-btn">Identifica client (metodo attivo)</button>
      <div id="modal-identify-result"></div>
    `);
    document.getElementById("modal-deauth-btn").onclick = () => onDeauth(ap);
    document.getElementById("modal-identify-btn").onclick = () => identifyClients(ap);
  }

  async function identifyClients(ap) {
    const label = ap.ssid || ap.bssid;
    if (!ap.ssid) {
      alert(`"${label}" ha SSID nascosto/vuoto in questa scansione: non è possibile clonarlo automaticamente sul tuo AP Open.`);
      return;
    }
    const warning = `ATTENZIONE - tecnica attiva contro una rete reale.\n\n` +
      `Questa funzione:\n` +
      `1) Riconfigura temporaneamente il tuo AP Open per usare lo stesso SSID di "${label}" ("${ap.ssid}"), così i dispositivi disconnessi potrebbero riconnettersi automaticamente ad esso.\n` +
      `2) Invia un deauth broadcast verso "${label}" (${ap.bssid}), scollegando forzatamente TUTTI i dispositivi realmente connessi a questa rete, anche se non è di tua proprietà.\n` +
      `3) Per ~20 secondi monitora se qualche dispositivo compare sul tuo AP Open.\n` +
      `4) Ripristina l'SSID originale del tuo AP Open al termine (anche in caso di errore).\n\n` +
      `Questo funziona solo se la rete target è aperta (nessuna password) o se i dispositivi tentano comunque la connessione: con reti protette da password i dispositivi non si connetteranno al tuo AP clone. Anche con AP aperto, non è garantito che tutti i dispositivi si riconnettano al clone invece che alla rete originale.\n\n` +
      `Procedere solo se autorizzato a testare questa rete. Continuare?`;
    if (!confirm(warning)) return;

    const resultEl = modalBody()?.querySelector("#modal-identify-result");
    if (!resultEl) return;

    resultEl.innerHTML = `<p class="muted" style="margin-top:12px">Salvataggio configurazione attuale del tuo AP Open...</p>`;
    let originalOpen = null;
    try {
      originalOpen = await api.get("/proxy/settings/networking/ap/open", { silent: true });
    } catch (err) {
      resultEl.innerHTML = `<p class="empty" style="margin-top:12px">Impossibile leggere la configurazione dell'AP Open: ${escapeHtml(err.message)}</p>`;
      return;
    }

    resultEl.innerHTML = `<p class="muted" style="margin-top:12px">Clonazione SSID "${escapeHtml(ap.ssid)}" sul tuo AP Open...</p>`;
    try {
      await api.put("/proxy/settings/networking/ap/open", {
        ssid: ap.ssid,
        bssid: originalOpen.bssid,
        country: originalOpen.country,
        channel: originalOpen.channel,
        hidden: false,
        enabled: true,
      });
    } catch (err) {
      resultEl.innerHTML = `<p class="empty" style="margin-top:12px">Impossibile clonare l'SSID sul tuo AP Open: ${escapeHtml(err.message)}</p>`;
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));

    async function restoreOpenAp() {
      try {
        await api.put("/proxy/settings/networking/ap/open", originalOpen, { silent: true });
      } catch {
        /* best effort restore */
      }
    }

    resultEl.innerHTML = `<p class="muted" style="margin-top:12px">Acquisizione baseline client sui tuoi AP PineAP...</p>`;
    let baselineSet = new Set();
    try {
      const data = await api.get("/proxy/pineap/clients", { silent: true });
      baselineSet = new Set(clientMacs(Array.isArray(data) ? data : data?.clients).map((m) => m.toLowerCase()));
    } catch {
      baselineSet = new Set();
    }

    try {
      await api.post("/proxy/pineap/deauth/ap", {
        bssid: ap.bssid,
        channel: Number(ap.channel) || 0,
        multiplier: 1,
        clients: clientMacs(ap.clients),
      });
    } catch (err) {
      resultEl.innerHTML = `<p class="empty" style="margin-top:12px">Deauth non riuscito: ${escapeHtml(err.message)}</p>`;
      await restoreOpenAp();
      return;
    }

    const found = new Map();
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      resultEl.innerHTML = `<p class="muted" style="margin-top:12px">Deauth inviato. Osservazione riconnessioni sul tuo AP Open clonato... (${i + 1}/${steps})</p>`;
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const data = await api.get("/proxy/pineap/clients", { silent: true });
        const macs = clientMacs(Array.isArray(data) ? data : data?.clients);
        for (const mac of macs) {
          if (!baselineSet.has(mac.toLowerCase())) found.set(mac.toLowerCase(), mac);
        }
      } catch {
        /* ignore transient errors during polling */
      }
      if (!modalBody()?.querySelector("#modal-identify-result")) {
        await restoreOpenAp();
        return;
      }
    }

    await restoreOpenAp();

    const liveResultEl = modalBody()?.querySelector("#modal-identify-result");
    if (!liveResultEl) return;
    const restoredNote = `<p class="muted" style="margin-top:6px;font-size:12px">SSID originale del tuo AP Open ripristinato.</p>`;

    if (!found.size) {
      liveResultEl.innerHTML = `<p class="empty" style="margin-top:12px">Nessun nuovo client rilevato sul tuo AP Open clonato dopo il deauth. Probabile causa: la rete target è protetta da password (i dispositivi non si collegano a un clone aperto), oppure i dispositivi si sono riconnessi direttamente alla rete originale (fuori dalla tua visibilità).</p>${restoredNote}`;
      return;
    }

    const rows = await Promise.all([...found.values()].map(async (mac) => {
      const v = await lookupVendor(mac);
      return `<tr><td>${escapeHtml(mac)}</td><td>${escapeHtml(v)}</td></tr>`;
    }));
    liveResultEl.innerHTML = `<p class="muted" style="margin-top:12px">Client comparsi sul tuo AP Open clonato dopo il deauth (correlazione possibile, non una certezza):</p>
      <table><thead><tr><th>MAC</th><th>Vendor</th></tr></thead><tbody>${rows.join("")}</tbody></table>${restoredNote}`;
  }

  const vendorCache = new Map();
  async function lookupVendor(mac) {
    if (!mac || mac.length < 8) return "";
    const oui = mac.replace(/[:-]/g, "").slice(0, 6).toUpperCase();
    if (vendorCache.has(oui)) return vendorCache.get(oui);
    try {
      const data = await api.get(`/proxy/helpers/lookupOUI/${oui}`, { silent: true });
      const vendor = data?.vendor && data.vendor !== "Unknown Vendor" ? data.vendor : "";
      vendorCache.set(oui, vendor);
      return vendor;
    } catch {
      vendorCache.set(oui, "");
      return "";
    }
  }

  function fmtEpoch(ts) {
    const n = Number(ts);
    if (!n) return "-";
    return new Date(n * 1000).toLocaleString("it-IT");
  }

  async function checkRadioContention(container) {
    const el = container.querySelector("#r-radio-warning");
    let open, wpa;
    try {
      [open, wpa] = await Promise.all([
        api.get("/proxy/settings/networking/ap/open", { silent: true }),
        api.get("/proxy/settings/networking/ap/wpa", { silent: true }),
      ]);
    } catch {
      return;
    }
    const active = [];
    if (open?.enabled) active.push({ key: "open", label: `AP Open "${open.ssid}"`, data: open });
    if (wpa?.enabled) active.push({ key: "wpa", label: `Evil Twin "${wpa.ssid}"`, data: wpa });
    if (!active.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="card" style="border-color:var(--warn);background:var(--warn-soft)">
      <strong>AP PineAP attivi</strong>
      <p class="muted" style="margin:6px 0 0">
        ${active.map((a) => escapeHtml(a.label)).join(" e ")} ${active.length > 1 ? "sono attivi" : "è attivo"} sulla stessa interfaccia radio usata da Recon (wlan1mon).
        In pratica gli scan funzionano comunque; se noti pochi risultati, riprova la scansione o disattiva manualmente questi AP dalle Impostazioni → Rete.
      </p>
    </div>`;
  }

  function clientMacs(clients) {
    if (!Array.isArray(clients)) return [];
    return clients.map((c) => (typeof c === "string" ? c : c?.mac || c?.bssid || "")).filter(Boolean);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  await Promise.all([refreshStatus(), loadScans()]);
}
