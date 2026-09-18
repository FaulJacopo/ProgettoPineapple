import { api } from "../api.js";

const TABS = ["settings", "ssids", "handshakes", "enterprise", "clients", "filters", "deauth"];

export async function renderPineap(container) {
  container.innerHTML = `
    <h1>PineAP</h1>
    <div class="tabs" id="pineap-tabs">
      ${TABS.map((t, i) => `<button data-tab="${t}" class="${i === 0 ? "active" : ""}">${label(t)}</button>`).join("")}
    </div>
    <div id="pineap-body"></div>
  `;

  const body = container.querySelector("#pineap-body");
  container.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = () => {
      container.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderTab(btn.dataset.tab, body);
    };
  });

  await renderTab("settings", body);
}

function label(t) {
  return { settings: "Settings", ssids: "SSID Pool", handshakes: "Handshakes", enterprise: "Enterprise", clients: "Clients", filters: "Filtri", deauth: "Deauth" }[t];
}

async function renderTab(tab, body) {
  body.innerHTML = `<p class="empty">Caricamento...</p>`;
  const renderers = { settings: renderSettings, ssids: renderSsids, handshakes: renderHandshakes, enterprise: renderEnterprise, clients: renderClients, filters: renderFilters, deauth: renderDeauth };
  await renderers[tab](body);
}

async function renderSettings(body) {
  const raw = (await api.get("/proxy/pineap/settings")) || {};
  // Il device restituisce { mode, settings: {...} } invece dei campi flat documentati.
  const mode = raw.mode ?? "advanced";
  const s = raw.settings ?? raw;
  body.innerHTML = `<div class="card">
    ${checkbox("enablePineAP", "Abilita PineAP", s.enablePineAP)}
    ${checkbox("autostartPineAP", "Avvio automatico", s.autostartPineAP ?? s.autostart)}
    ${checkbox("beacon_responses", "Rispondi ai beacon", s.beacon_responses)}
    ${checkbox("broadcast_ssid_pool", "Broadcast SSID pool", s.broadcast_ssid_pool)}
    ${checkbox("capture_ssids", "Cattura SSID", s.capture_ssids)}
    ${checkbox("karma", "Karma", s.karma)}
    ${checkbox("logging", "Logging", s.logging)}
    ${checkbox("connect_notifications", "Notifiche connessione", s.connect_notifications)}
    ${checkbox("disconnect_notifications", "Notifiche disconnessione", s.disconnect_notifications)}
    <div class="row">
      <div class="field"><label>Canale AP</label><input id="s-ap_channel" value="${s.ap_channel ?? ""}" /></div>
      <div class="field"><label>Beacon interval</label><input id="s-beacon_interval" value="${s.beacon_interval ?? ""}" /></div>
      <div class="field"><label>Beacon response interval</label><input id="s-beacon_response_interval" value="${s.beacon_response_interval ?? ""}" /></div>
    </div>
    <button class="primary" id="save-pineap-settings">Salva</button>
  </div>`;

  body.querySelector("#save-pineap-settings").onclick = async () => {
    // Il device richiede il payload annidato { mode, settings: {...} } (stessa forma della GET):
    // un payload "flat" viene accettato con {success:true} ma NON persiste alcuni campi (es. capture_ssids).
    const payload = {
      mode,
      settings: {
        ...s,
        enablePineAP: chk(body, "enablePineAP"),
        autostartPineAP: chk(body, "autostartPineAP"),
        beacon_responses: chk(body, "beacon_responses"),
        broadcast_ssid_pool: chk(body, "broadcast_ssid_pool"),
        capture_ssids: chk(body, "capture_ssids"),
        karma: chk(body, "karma"),
        logging: chk(body, "logging"),
        connect_notifications: chk(body, "connect_notifications"),
        disconnect_notifications: chk(body, "disconnect_notifications"),
        ap_channel: val(body, "s-ap_channel"),
        beacon_interval: val(body, "s-beacon_interval"),
        beacon_response_interval: val(body, "s-beacon_response_interval"),
      },
    };
    await api.put("/proxy/pineap/settings", payload);
    api.toast("Impostazioni salvate");
  };
}

async function renderSsids(body) {
  const pool = (await api.get("/proxy/pineap/ssids")) || "";
  // Il device restituisce { ssids: "SSID1\nSSID2\n..." } invece della stringa nuda documentata.
  const raw = typeof pool === "string" ? pool : pool.ssids ?? "";
  const list = raw.split("\n").filter(Boolean);
  body.innerHTML = `<div class="card">
    <div class="row">
      <div class="field"><label>Nuovo SSID</label><input id="ssid-input" /></div>
    </div>
    <button class="primary" id="ssid-add">Aggiungi</button>
    <button class="danger" id="ssid-clear">Svuota pool</button>
    <table style="margin-top:12px"><tbody>
      ${list.map((s) => `<tr><td>${escapeHtml(s)}</td><td><button class="danger" data-ssid="${escapeHtml(s)}">Rimuovi</button></td></tr>`).join("") || `<tr><td class="empty">Pool vuoto</td></tr>`}
    </tbody></table>
  </div>`;

  body.querySelector("#ssid-add").onclick = async () => {
    await api.put("/proxy/pineap/ssids/ssid", { ssid: body.querySelector("#ssid-input").value });
    renderSsids(body);
  };
  body.querySelector("#ssid-clear").onclick = async () => {
    await api.del("/proxy/pineap/ssids");
    renderSsids(body);
  };
  body.querySelectorAll("[data-ssid]").forEach((btn) => (btn.onclick = async () => {
    await api.del("/proxy/pineap/ssids/ssid", { ssid: btn.dataset.ssid });
    renderSsids(body);
  }));
}

async function renderHandshakes(body) {
  const [list, check] = await Promise.allSettled([
    api.get("/proxy/pineap/handshakes"),
    api.get("/proxy/pineap/handshakes/check"),
  ]);
  const items = list.status === "fulfilled" ? list.value?.handshakes || [] : [];
  const status = check.status === "fulfilled" ? check.value : {};

  const pcapCount = items.filter((h) => h.extension === "pcap").length;
  const hc22000Count = items.filter((h) => h.extension === "22000").length;

  body.innerHTML = `<div class="card">
    <div class="row">
      <div class="field"><label>BSSID target</label><input id="hs-bssid" /></div>
      <div class="field"><label>Canale</label><input id="hs-channel" type="number" /></div>
    </div>
    <button class="primary" id="hs-start">Avvia capture</button>
    <button class="danger" id="hs-stop">Ferma capture</button>
    <p class="muted">Capture attiva: ${status.captureRunning ? "sì" : "no"} ${status.bssid ? `(${status.bssid})` : ""}</p>
  </div>
  <div class="card">
    <h2 style="margin-top:0">File catturati</h2>
    <p class="muted" style="margin-top:-4px">.pcap (${pcapCount}) e .22000 (${hc22000Count} — hash pronti per il cracking con hashcat). Il device non espone un endpoint API per scaricare i file: usa il percorso indicato per recuperarli manualmente (es. SCP/SFTP sul dispositivo).</p>
    <button class="danger" id="hs-clear">Elimina tutti</button>
    <table style="margin-top:12px">
      <thead><tr><th>MAC</th><th>Estensione</th><th>Fonte</th><th>Data</th><th>File presente</th><th>Percorso sul device</th><th>Azioni</th></tr></thead>
      <tbody>${items.map((h) => `<tr>
        <td>${escapeHtml(h.mac ?? "-")}</td>
        <td>${escapeHtml(h.extension ?? "-")}</td>
        <td>${escapeHtml(h.source ?? "-")}</td>
        <td>${escapeHtml(fmtDate(h.timestamp))}</td>
        <td>${h.file_exists ? "sì" : "no"}</td>
        <td><code style="font-size:0.85em">${escapeHtml(h.location ?? "-")}</code></td>
        <td>
          ${h.location ? `<button data-url="${escapeHtml(h.location)}">Scarica File</button>` : ""}
          <button class="danger" data-type="${escapeHtml(h.type ?? "")}" data-mac="${escapeHtml(h.mac ?? "")}" data-client="${escapeHtml(h.client ?? "")}">Elimina</button>
        </td>
      </tr>`).join("") || `<tr><td class="empty" colspan="7">Nessun handshake</td></tr>`}</tbody>
    </table>
  </div>`;

  body.querySelector("#hs-start").onclick = async () => {
    await api.post("/proxy/pineap/handshakes/start", {
      bssid: body.querySelector("#hs-bssid").value,
      channel: Number(body.querySelector("#hs-channel").value || 0),
    });
    renderHandshakes(body);
  };
  body.querySelector("#hs-stop").onclick = async () => {
    await api.post("/proxy/pineap/handshakes/stop");
    renderHandshakes(body);
  };
  body.querySelector("#hs-clear").onclick = async () => {
    if (!confirm("Eliminare tutti i file di handshake catturati (.pcap e .22000)? Operazione irreversibile.")) return;
    await api.del("/proxy/pineap/handshakes");
    renderHandshakes(body);
  };
  body.querySelectorAll("[data-url]").forEach((btn) => (btn.onclick = async () => {
      const ok = await downloadFile(btn.dataset.url);
      if (ok) api.toast("File scaricato");
  }));
  body.querySelectorAll("[data-mac]").forEach((btn) => (btn.onclick = async () => {
    if (!confirm(`Eliminare il file ${btn.dataset.client || btn.dataset.mac}?`)) return;
    await api.del("/proxy/pineap/handshakes/delete", {
      type: btn.dataset.type,
      mac: btn.dataset.mac,
      client: btn.dataset.client,
    });
    renderHandshakes(body);
  }));
}


async function downloadFile(location) {
  let resp;
  try {
    resp = await fetch("/proxy/pineap/handshakes/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: location }),
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
  a.download = location.split("/").pop() || "handshake";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

async function renderEnterprise(body) {
  const [settings, cert, basic, challenge] = await Promise.allSettled([
    api.get("/proxy/pineap/enterprise/settings"),
    api.get("/proxy/pineap/enterprise/cert"),
    api.get("/proxy/pineap/enterprise/basicdata"),
    api.get("/proxy/pineap/enterprise/challengedata"),
  ]);
  const s = settings.status === "fulfilled" ? settings.value || {} : {};
  const certInstalled = cert.status === "fulfilled" && cert.value?.installed;
  const basicItems = basic.status === "fulfilled" ? basic.value || [] : [];
  const challengeItems = challenge.status === "fulfilled" ? challenge.value || [] : [];

  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">Impostazioni Enterprise</h2>
    ${checkbox("ent-enabled", "Abilitato", s.enabled)}
    ${checkbox("ent-associations", "Associazioni", s.associations)}
    <div class="row">
      <div class="field"><label>SSID</label><input id="ent-ssid" value="${s.ssid ?? ""}" /></div>
      <div class="field"><label>BSSID</label><input id="ent-bssid" value="${s.bssid ?? ""}" placeholder="AA:BB:CC:DD:EE:FF" /></div>
      <div class="field"><label>Tipo</label><input id="ent-type" value="${s.type ?? ""}" /></div>
      <div class="field"><label>Downgrade</label><input id="ent-downgrade" value="${s.downgrade ?? ""}" /></div>
    </div>
    <button class="primary" id="ent-save">Salva</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Certificato</h2>
    <p class="muted">Installato: ${certInstalled ? "sì" : "no"}</p>
    <button class="danger" id="ent-cert-delete">Rimuovi certificato</button>
    <h2>Genera certificato</h2>
    <div class="row">
      <div class="field"><label>State</label><input id="gc-state" /></div>
      <div class="field"><label>Country</label><input id="gc-country" /></div>
      <div class="field"><label>Locality</label><input id="gc-locality" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Organization</label><input id="gc-org" /></div>
      <div class="field"><label>Email</label><input id="gc-email" /></div>
      <div class="field"><label>Common name</label><input id="gc-cn" /></div>
    </div>
    <button class="primary" id="gc-generate">Genera</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Credenziali raccolte (Basic)</h2>
    <button class="danger" id="basic-clear">Svuota</button>
    <table style="margin-top:12px"><thead><tr><th>Identity</th><th>Password</th></tr></thead>
      <tbody>${basicItems.map((b) => `<tr><td>${escapeHtml(b.identity ?? "-")}</td><td>${escapeHtml(b.password ?? "-")}</td></tr>`).join("") || `<tr><td class="empty" colspan="2">Nessun dato</td></tr>`}</tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Challenge/Response</h2>
    <button class="danger" id="challenge-clear">Svuota</button>
    <table style="margin-top:12px"><thead><tr><th>Username</th><th>Challenge</th><th>Response</th></tr></thead>
      <tbody>${challengeItems.map((c) => `<tr><td>${escapeHtml(c.username ?? "-")}</td><td>${escapeHtml(c.challenge ?? "-")}</td><td>${escapeHtml(c.response ?? "-")}</td></tr>`).join("") || `<tr><td class="empty" colspan="3">Nessun dato</td></tr>`}</tbody>
    </table>
  </div>`;

  body.querySelector("#ent-save").onclick = async () => {
    await api.put("/proxy/pineap/enterprise/settings", {
      enabled: chk(body, "ent-enabled"),
      associations: chk(body, "ent-associations"),
      ssid: val(body, "ent-ssid"),
      bssid: val(body, "ent-bssid"),
      type: val(body, "ent-type"),
      downgrade: val(body, "ent-downgrade"),
    });
    api.toast("Impostazioni Enterprise salvate");
  };
  body.querySelector("#ent-cert-delete").onclick = async () => {
    await api.del("/proxy/pineap/enterprise/cert");
    renderEnterprise(body);
  };
  body.querySelector("#gc-generate").onclick = async () => {
    await api.post("/proxy/pineap/enterprise/generatecert", {
      state: val(body, "gc-state"),
      country: val(body, "gc-country"),
      locality: val(body, "gc-locality"),
      organization: val(body, "gc-org"),
      email: val(body, "gc-email"),
      commonname: val(body, "gc-cn"),
    });
    api.toast("Certificato generato");
    renderEnterprise(body);
  };
  body.querySelector("#basic-clear").onclick = async () => {
    await api.del("/proxy/pineap/enterprise/basicdata");
    renderEnterprise(body);
  };
  body.querySelector("#challenge-clear").onclick = async () => {
    await api.del("/proxy/pineap/enterprise/challengedata");
    renderEnterprise(body);
  };
}

async function renderClients(body) {
  const [clients, previous] = await Promise.allSettled([
    api.get("/proxy/pineap/clients"),
    api.get("/proxy/pineap/previousclients"),
  ]);
  const clientItems = clients.status === "fulfilled" ? clients.value || [] : [];
  const prevItems = previous.status === "fulfilled" ? previous.value || [] : [];

  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">Client connessi</h2>
    <table><thead><tr><th>MAC</th><th>Vendor</th><th>Azioni</th></tr></thead>
      <tbody>${clientItems.map((c) => {
        const mac = typeof c === "string" ? c : c.mac ?? JSON.stringify(c);
        return `<tr data-mac-row="${escapeHtml(mac)}"><td>${escapeHtml(mac)}</td><td class="muted" data-vendor-cell>-</td><td><button class="danger" data-kick="${escapeHtml(mac)}">Kick</button></td></tr>`;
      }).join("") || `<tr><td class="empty" colspan="3">Nessun client connesso al momento</td></tr>`}</tbody>
    </table>
  </div>
  <div class="card">
    <h2 style="margin-top:0">Client precedenti</h2>
    <table><thead><tr><th>MAC</th><th>Vendor</th><th>Azioni</th></tr></thead>
      <tbody>${prevItems.map((c) => {
        const mac = typeof c === "string" ? c : c.mac ?? JSON.stringify(c);
        return `<tr data-mac-row="${escapeHtml(mac)}"><td>${escapeHtml(mac)}</td><td class="muted" data-vendor-cell>-</td><td><button class="danger" data-remove="${escapeHtml(mac)}">Rimuovi</button></td></tr>`;
      }).join("") || `<tr><td class="empty" colspan="3">Nessun client precedente</td></tr>`}</tbody>
    </table>
  </div>`;

  body.querySelectorAll("[data-mac-row]").forEach(async (row) => {
    const mac = row.dataset.macRow;
    const vendor = await lookupVendor(mac);
    if (vendor) row.querySelector("[data-vendor-cell]").textContent = vendor;
  });

  body.querySelectorAll("[data-kick]").forEach((btn) => (btn.onclick = async () => {
    const mac = btn.dataset.kick;
    if (!confirm(`Disconnettere il client ${mac}?`)) return;
    try {
      await api.del("/proxy/pineap/clients/kick", { mac });
      api.toast(`Client ${mac} disconnesso`);
      renderClients(body);
    } catch (err) {
      api.toast(`Kick non riuscito: ${err.message}`, true);
    }
  }));
  body.querySelectorAll("[data-remove]").forEach((btn) => (btn.onclick = async () => {
    await api.del("/proxy/pineap/previousclients/remove", { mac: btn.dataset.remove });
    renderClients(body);
  }));
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

async function renderFilters(body) {
  const [clientMode, clientList, ssidMode, ssidList] = await Promise.allSettled([
    api.get("/proxy/pineap/filters/client/mode"),
    api.get("/proxy/pineap/filters/client/list"),
    api.get("/proxy/pineap/filters/ssid/mode"),
    api.get("/proxy/pineap/filters/ssid/list"),
  ]);
  const cMode = clientMode.status === "fulfilled" ? clientMode.value?.mode ?? "" : "";
  const cList = clientList.status === "fulfilled" ? String(clientList.value || "").split("\n").filter(Boolean) : [];
  const sMode = ssidMode.status === "fulfilled" ? ssidMode.value?.mode ?? "" : "";
  const sList = ssidList.status === "fulfilled" ? String(ssidList.value || "").split("\n").filter(Boolean) : [];

  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">Filtro Client (MAC)</h2>
    <div class="row">
      <div class="field"><label>Modalità</label>
        <select id="cf-mode">${modeOptions(cMode)}</select>
      </div>
      <button id="cf-mode-save" style="align-self:flex-end">Salva modalità</button>
    </div>
    <div class="row">
      <div class="field"><label>Aggiungi MAC</label><input id="cf-add" /></div>
    </div>
    <button class="primary" id="cf-add-btn">Aggiungi</button>
    <table style="margin-top:12px"><tbody>
      ${cList.map((m) => `<tr><td>${escapeHtml(m)}</td><td><button class="danger" data-cmac="${escapeHtml(m)}">Rimuovi</button></td></tr>`).join("") || `<tr><td class="empty">Lista vuota</td></tr>`}
    </tbody></table>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Filtro SSID</h2>
    <div class="row">
      <div class="field"><label>Modalità</label>
        <select id="sf-mode">${modeOptions(sMode)}</select>
      </div>
      <button id="sf-mode-save" style="align-self:flex-end">Salva modalità</button>
    </div>
    <div class="row">
      <div class="field"><label>Aggiungi SSID</label><input id="sf-add" /></div>
    </div>
    <button class="primary" id="sf-add-btn">Aggiungi</button>
    <table style="margin-top:12px"><tbody>
      ${sList.map((s) => `<tr><td>${escapeHtml(s)}</td><td><button class="danger" data-sssid="${escapeHtml(s)}">Rimuovi</button></td></tr>`).join("") || `<tr><td class="empty">Lista vuota</td></tr>`}
    </tbody></table>
  </div>`;

  body.querySelector("#cf-mode-save").onclick = async () => {
    await api.put("/proxy/pineap/filters/client/mode", { mode: body.querySelector("#cf-mode").value });
    api.toast("Modalità filtro client salvata");
  };
  body.querySelector("#cf-add-btn").onclick = async () => {
    await api.put("/proxy/pineap/filters/client/list", { mac: body.querySelector("#cf-add").value });
    renderFilters(body);
  };
  body.querySelectorAll("[data-cmac]").forEach((btn) => (btn.onclick = async () => {
    await api.del("/proxy/pineap/filters/client/list", { mac: btn.dataset.cmac });
    renderFilters(body);
  }));

  body.querySelector("#sf-mode-save").onclick = async () => {
    await api.put("/proxy/pineap/filters/ssid/mode", { mode: body.querySelector("#sf-mode").value });
    api.toast("Modalità filtro SSID salvata");
  };
  body.querySelector("#sf-add-btn").onclick = async () => {
    await api.put("/proxy/pineap/filters/ssid/list", { ssid: body.querySelector("#sf-add").value });
    renderFilters(body);
  };
  body.querySelectorAll("[data-sssid]").forEach((btn) => (btn.onclick = async () => {
    await api.del("/proxy/pineap/filters/ssid/list", { ssid: btn.dataset.sssid });
    renderFilters(body);
  }));
}

async function renderDeauth(body) {
  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">Scegli rete da una scansione</h2>
    <p class="muted" style="margin-top:-4px">Seleziona una rete per nome: BSSID e canale verranno compilati automaticamente.</p>
    <div class="row">
      <div class="field"><label>Access point rilevati</label><select id="ap-picker"><option value="">Caricamento...</option></select></div>
      <div class="field"><label>Client rilevati su questo AP</label><select id="client-picker"><option value="">-</option></select></div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Deauth Access Point</h2>
    <div class="row">
      <div class="field"><label>BSSID</label><input id="da-bssid" placeholder="AA:BB:CC:DD:EE:FF" /></div>
      <div class="field"><label>Canale</label><input id="da-channel" type="number" /></div>
      <div class="field"><label>Moltiplicatore</label><input id="da-mult" type="number" value="1" /></div>
    </div>
    <div class="field"><label>Client (MAC separati da virgola, opzionale — vuoto = tutti)</label><input id="da-clients" /></div>
    <button class="danger" id="da-ap-btn">Deauth AP</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Deauth Client</h2>
    <div class="row">
      <div class="field"><label>BSSID</label><input id="dc-bssid" placeholder="AA:BB:CC:DD:EE:FF" /></div>
      <div class="field"><label>MAC client</label><input id="dc-mac" placeholder="11:22:33:44:55:66" /></div>
      <div class="field"><label>Canale</label><input id="dc-channel" type="number" /></div>
      <div class="field"><label>Moltiplicatore</label><input id="dc-mult" type="number" value="1" /></div>
    </div>
    <button class="danger" id="dc-btn">Deauth Client</button>
  </div>`;

  let aps = [];
  const apPicker = body.querySelector("#ap-picker");
  const clientPicker = body.querySelector("#client-picker");

  try {
    const scans = (await api.get("/proxy/recon/scans", { silent: true })) || [];
    if (scans.length) {
      const latest = scans[scans.length - 1];
      const detail = await api.get(`/proxy/recon/scans/${latest.scan_id}`, { silent: true });
      aps = detail?.APResults || [];
    }
    apPicker.innerHTML = aps.length
      ? `<option value="">Seleziona un access point...</option>${aps.map((ap, i) => `<option value="${i}">${escapeHtml(ap.ssid || "(nascosto)")} · ${escapeHtml(ap.bssid)} · ch${ap.channel}</option>`).join("")}`
      : `<option value="">Nessuna scansione disponibile — vai su Recon e avvia uno scan</option>`;
  } catch {
    apPicker.innerHTML = `<option value="">Impossibile caricare le scansioni</option>`;
  }

  apPicker.onchange = () => {
    const ap = aps[Number(apPicker.value)];
    if (!ap) {
      clientPicker.innerHTML = `<option value="">-</option>`;
      return;
    }
    body.querySelector("#da-bssid").value = ap.bssid || "";
    body.querySelector("#da-channel").value = ap.channel || "";
    body.querySelector("#dc-bssid").value = ap.bssid || "";
    body.querySelector("#dc-channel").value = ap.channel || "";
    const clients = clientMacs(ap.clients);
    clientPicker.innerHTML = clients.length
      ? `<option value="">Tutti i client (${clients.length})</option>${clients.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}`
      : `<option value="">Nessun client rilevato per questo AP</option>`;
  };

  clientPicker.onchange = () => {
    body.querySelector("#da-clients").value = clientPicker.value || "";
    body.querySelector("#dc-mac").value = clientPicker.value || "";
  };

  body.querySelector("#da-ap-btn").onclick = async () => {
    const bssid = val(body, "da-bssid");
    if (!bssid) return api.toast("Inserisci o seleziona un BSSID", true);
    const clientsRaw = body.querySelector("#da-clients").value;
    const clients = clientsRaw ? clientsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (!confirm(`Inviare deauth verso l'AP ${bssid}${clients.length ? ` (${clients.length} client)` : " (tutti i client)"}? Questo scollegherà i dispositivi realmente connessi.`)) return;
    try {
      await api.post("/proxy/pineap/deauth/ap", {
        bssid,
        channel: Number(val(body, "da-channel") || 0),
        multiplier: Number(val(body, "da-mult") || 1),
        clients,
      });
      api.toast("Deauth AP avviato");
    } catch (err) {
      api.toast(`Deauth non riuscito: ${err.message}`, true);
    }
  };

  body.querySelector("#dc-btn").onclick = async () => {
    const bssid = val(body, "dc-bssid");
    const mac = val(body, "dc-mac");
    if (!bssid || !mac) return api.toast("Inserisci BSSID e MAC client", true);
    if (!confirm(`Deautenticare il client ${mac} dall'AP ${bssid}?`)) return;
    try {
      await api.post("/proxy/pineap/deauth/client", {
        bssid,
        mac,
        channel: Number(val(body, "dc-channel") || 0),
        multiplier: Number(val(body, "dc-mult") || 1),
      });
      api.toast("Deauth client avviato");
    } catch (err) {
      api.toast(`Deauth non riuscito: ${err.message}`, true);
    }
  };
}

function clientMacs(clients) {
  if (!Array.isArray(clients)) return [];
  return clients.map((c) => (typeof c === "string" ? c : c?.mac || c?.bssid || "")).filter(Boolean);
}

function modeOptions(current) {
  const known = [
    { value: "allow", label: "Allow (consenti solo elencati)" },
    { value: "deny", label: "Deny (blocca elencati)" },
  ];
  if (current && !known.some((o) => o.value === current)) {
    known.unshift({ value: current, label: `${current} (valore attuale sul device)` });
  }
  return known.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === current ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("");
}

function checkbox(id, labelText, checked) {
  return `<label class="checkbox-row"><input type="checkbox" id="s-${id}" ${checked ? "checked" : ""} /> ${escapeHtml(labelText)}</label>`;
}
function chk(body, id) {
  return body.querySelector(`#s-${id}`)?.checked ?? false;
}
function val(body, id) {
  return body.querySelector(`#${id}`)?.value ?? "";
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
