import { api } from "../api.js";

const TABS = ["password", "time", "device", "update", "cloudc2", "networking", "diagnostics"];

export async function renderSettings(container) {
  container.innerHTML = `
    <h1>Settings</h1>
    <div class="tabs" id="settings-tabs">
      ${TABS.map((t, i) => `<button data-tab="${t}" class="${i === 0 ? "active" : ""}">${label(t)}</button>`).join("")}
    </div>
    <div id="settings-body"></div>
  `;

  const body = container.querySelector("#settings-body");
  container.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = () => {
      container.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderTab(btn.dataset.tab, body);
    };
  });

  await renderTab("password", body);
}

function label(t) {
  return { password: "Password", time: "Data/Ora", device: "Dispositivo", update: "Aggiornamenti", cloudc2: "Cloud C2", networking: "Rete", diagnostics: "Diagnostica" }[t];
}

async function renderTab(tab, body) {
  body.innerHTML = `<p class="empty">Caricamento...</p>`;
  const renderers = { password: renderPassword, time: renderTime, device: renderDevice, update: renderUpdate, cloudc2: renderCloudC2, networking: renderNetworking, diagnostics: renderDiagnostics };
  await renderers[tab](body);
}

async function renderPassword(body) {
  body.innerHTML = `<div class="card">
    <div class="field"><label>Password attuale</label><input type="password" id="p-old" /></div>
    <div class="field"><label>Nuova password</label><input type="password" id="p-new" /></div>
    <div class="field"><label>Conferma nuova password</label><input type="password" id="p-confirm" /></div>
    <button class="primary" id="p-save">Cambia password</button>
  </div>`;
  body.querySelector("#p-save").onclick = async () => {
    await api.put("/proxy/settings/users/password", {
      old_password: val(body, "p-old"),
      new_password: val(body, "p-new"),
      confirm_password: val(body, "p-confirm"),
    });
    api.toast("Password aggiornata");
  };
}

async function renderTime(body) {
  const tz = (await api.get("/proxy/settings/timezone").catch(() => ({}))) || {};
  body.innerHTML = `<div class="card">
    <div class="field"><label>Timezone</label><input id="tz-input" value="${tz.timezone ?? ""}" /></div>
    <button class="primary" id="tz-save">Salva timezone</button>
  </div>
  <div class="card">
    <button id="sync-time">Sincronizza ora con questo browser</button>
  </div>`;
  body.querySelector("#tz-save").onclick = async () => {
    await api.put("/proxy/settings/timezone", { timezone: val(body, "tz-input") });
    api.toast("Timezone aggiornato");
  };
  body.querySelector("#sync-time").onclick = async () => {
    await api.put("/proxy/settings/synctime", { timestamp: String(Math.floor(Date.now() / 1000)) });
    api.toast("Ora sincronizzata");
  };
}

async function renderDevice(body) {
  const [button, resources, usb] = await Promise.allSettled([
    api.get("/proxy/settings/button"),
    api.get("/proxy/settings/resources"),
    api.get("/proxy/settings/usb"),
  ]);
  const buttonScript = button.status === "fulfilled" ? button.value?.button_script ?? "" : "";
  const resourcesData = resources.status === "fulfilled" ? resources.value : null;
  const usbData = usb.status === "fulfilled" ? usb.value : null;

  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">Script pulsante</h2>
    <textarea id="button-script" rows="6">${escapeHtml(buttonScript)}</textarea>
    <button class="primary" id="button-save" style="margin-top:8px">Salva</button>
  </div>
  <div class="card">
    <h2 style="margin-top:0">Risorse di sistema</h2>
    <div class="pre">${escapeHtml(JSON.stringify(resourcesData, null, 2))}</div>
  </div>
  <div class="card">
    <h2 style="margin-top:0">Dispositivi USB</h2>
    <div class="pre">${escapeHtml(usbData?.devices ?? "-")}</div>
  </div>`;

  body.querySelector("#button-save").onclick = async () => {
    await api.put("/proxy/settings/button", { button_script: val(body, "button-script") });
    api.toast("Script salvato");
  };
}

async function renderUpdate(body) {
  const channel = (await api.get("/proxy/settings/update/channel").catch(() => ({}))) || {};
  body.innerHTML = `<div class="card">
    <div class="field"><label>Canale update</label>
      <select id="upd-channel">
        <option value="stable" ${channel.channel === "stable" ? "selected" : ""}>Stable</option>
        <option value="beta" ${channel.channel === "beta" ? "selected" : ""}>Beta</option>
      </select>
    </div>
    <button id="upd-channel-save">Salva canale</button>
  </div>
  <div class="card">
    <button id="upd-check">Controlla aggiornamenti</button>
    <button class="primary" id="upd-apply">Applica update</button>
    <button id="upd-reinstall">Reinstalla</button>
    <div id="upd-result" class="pre" style="margin-top:8px;display:none"></div>
  </div>`;

  body.querySelector("#upd-channel-save").onclick = async () => {
    await api.put("/proxy/settings/update/channel", { channel: val(body, "upd-channel") });
    api.toast("Canale salvato");
  };
  body.querySelector("#upd-check").onclick = async () => {
    const data = await api.get("/proxy/settings/update/refresh");
    const el = body.querySelector("#upd-result");
    el.style.display = "block";
    el.textContent = JSON.stringify(data, null, 2);
  };
  body.querySelector("#upd-apply").onclick = async () => {
    await api.post("/proxy/settings/update/apply");
    api.toast("Aggiornamento applicato");
  };
  body.querySelector("#upd-reinstall").onclick = async () => {
    await api.post("/proxy/settings/update/reinstall");
    api.toast("Reinstallazione avviata");
  };
}

async function renderCloudC2(body) {
  const config = (await api.get("/proxy/settings/cloudc2/config").catch(() => ({}))) || {};
  body.innerHTML = `<div class="card">
    <p class="muted">Enrolled: ${config.enrolled ? "sì" : "no"}</p>
    <div class="field"><label>Configurazione (c2config)</label><textarea id="c2-config" rows="6"></textarea></div>
    <button class="primary" id="c2-save">Salva configurazione</button>
    <button class="danger" id="c2-remove">Rimuovi configurazione</button>
  </div>`;
  body.querySelector("#c2-save").onclick = async () => {
    await api.put("/proxy/settings/cloudc2/config", { c2config: val(body, "c2-config") });
    api.toast("Configurazione Cloud C2 salvata");
  };
  body.querySelector("#c2-remove").onclick = async () => {
    await api.del("/proxy/settings/cloudc2/config");
    renderCloudC2(body);
  };
}

async function renderNetworking(body) {
  const [mgmt, open, wpa, clientStatus, interfaces, routes] = await Promise.allSettled([
    api.get("/proxy/settings/networking/ap/management"),
    api.get("/proxy/settings/networking/ap/open"),
    api.get("/proxy/settings/networking/ap/wpa"),
    api.get("/proxy/settings/networking/clientmode/status"),
    api.get("/proxy/settings/networking/interfaces"),
    api.get("/proxy/settings/networking/routes"),
  ]);
  const m = mgmt.status === "fulfilled" ? mgmt.value || {} : {};
  const o = open.status === "fulfilled" ? open.value || {} : {};
  const w = wpa.status === "fulfilled" ? wpa.value || {} : {};
  const cs = clientStatus.status === "fulfilled" ? clientStatus.value || {} : {};
  const ifaces = interfaces.status === "fulfilled" ? interfaces.value : null;
  const rt = routes.status === "fulfilled" ? routes.value : null;

  body.innerHTML = `<div class="card">
    <h2 style="margin-top:0">AP di gestione</h2>
    <div class="row">
      <div class="field"><label>SSID</label><input id="mgmt-ssid" value="${escapeAttr(m.ssid)}" /></div>
      <div class="field"><label>Password</label><input type="password" id="mgmt-password" /></div>
      <div class="field"><label>Conferma password</label><input type="password" id="mgmt-confirm" /></div>
    </div>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="mgmt-hidden" style="width:auto" ${m.hidden ? "checked" : ""}/> Nascosta</label>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="mgmt-disabled" style="width:auto" ${m.disabled ? "checked" : ""}/> Disabilitata</label>
    <button class="primary" id="mgmt-save">Salva AP gestione</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">AP Open</h2>
    <div class="row">
      <div class="field"><label>SSID</label><input id="open-ssid" value="${escapeAttr(o.ssid)}" /></div>
      <div class="field"><label>Country</label><input id="open-country" value="${escapeAttr(o.country)}" /></div>
      <div class="field"><label>Canale</label><input id="open-channel" type="number" value="${o.channel ?? ""}" /></div>
    </div>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="open-hidden" style="width:auto" ${o.hidden ? "checked" : ""}/> Nascosta</label>
    <button class="primary" id="open-save">Salva AP Open</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Evil Twin AP (WPA)</h2>
    <div class="row">
      <div class="field"><label>SSID</label><input id="wpa-ssid" value="${escapeAttr(w.ssid)}" /></div>
      <div class="field"><label>BSSID</label><input id="wpa-bssid" value="${escapeAttr(w.bssid)}" /></div>
      <div class="field"><label>Auth</label><input id="wpa-auth" value="${escapeAttr(w.auth)}" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Password</label><input type="password" id="wpa-password" /></div>
      <div class="field"><label>Conferma password</label><input type="password" id="wpa-confirm" /></div>
    </div>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="wpa-hidden" style="width:auto" ${w.hidden ? "checked" : ""}/> Nascosta</label>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="wpa-disabled" style="width:auto" ${w.disabled ? "checked" : ""}/> Disabilitata</label>
    <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="wpa-capture" style="width:auto" ${w.capture_handshakes ? "checked" : ""}/> Cattura handshake</label>
    <button class="primary" id="wpa-save">Salva Evil Twin AP</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Client Mode</h2>
    <p class="muted">Connesso: ${cs.connected ? "sì" : "no"} ${cs.ssid ? `a ${escapeHtml(cs.ssid)}` : ""} ${cs.ip ? `(${cs.ip})` : ""}</p>
    <div class="row">
      <div class="field"><label>Interfaccia</label><input id="cm-interface" value="${(cs.interfaces || [])[0] ?? ""}" /></div>
    </div>
    <button id="cm-scan">Scansiona reti</button>
    <button class="danger" id="cm-disconnect">Disconnetti</button>
    <div id="cm-scan-result" class="pre" style="margin-top:8px;display:none"></div>
    <div class="row" style="margin-top:12px">
      <div class="field"><label>SSID</label><input id="cm-ssid" /></div>
      <div class="field"><label>BSSID</label><input id="cm-bssid" /></div>
      <div class="field"><label>Password</label><input type="password" id="cm-password" /></div>
    </div>
    <button class="primary" id="cm-connect">Connetti</button>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Interfacce di rete</h2>
    <div class="pre">${escapeHtml(JSON.stringify(ifaces, null, 2))}</div>
  </div>
  <div class="card">
    <h2 style="margin-top:0">Routing table</h2>
    <div class="pre">${escapeHtml(rt?.routes ?? "-")}</div>
  </div>`;

  body.querySelector("#mgmt-save").onclick = async () => {
    await api.put("/proxy/settings/networking/ap/management", {
      ssid: val(body, "mgmt-ssid"),
      password: val(body, "mgmt-password"),
      confirm_password: val(body, "mgmt-confirm"),
      hidden: chk(body, "mgmt-hidden"),
      disabled: chk(body, "mgmt-disabled"),
    });
    api.toast("AP di gestione salvato");
  };
  body.querySelector("#open-save").onclick = async () => {
    await api.put("/proxy/settings/networking/ap/open", {
      ssid: val(body, "open-ssid"),
      country: val(body, "open-country"),
      channel: Number(val(body, "open-channel") || 0),
      hidden: chk(body, "open-hidden"),
    });
    api.toast("AP Open salvato");
  };
  body.querySelector("#wpa-save").onclick = async () => {
    await api.put("/proxy/settings/networking/ap/wpa", {
      ssid: val(body, "wpa-ssid"),
      bssid: val(body, "wpa-bssid"),
      auth: val(body, "wpa-auth"),
      password: val(body, "wpa-password"),
      confirm_password: val(body, "wpa-confirm"),
      hidden: chk(body, "wpa-hidden"),
      disabled: chk(body, "wpa-disabled"),
      capture_handshakes: chk(body, "wpa-capture"),
    });
    api.toast("Evil Twin AP salvato");
  };
  body.querySelector("#cm-scan").onclick = async () => {
    const data = await api.post("/proxy/settings/networking/clientmode/scan", { interface: val(body, "cm-interface") });
    const el = body.querySelector("#cm-scan-result");
    el.style.display = "block";
    el.textContent = JSON.stringify(data, null, 2);
  };
  body.querySelector("#cm-disconnect").onclick = async () => {
    await api.post("/proxy/settings/networking/clientmode/disconnect");
    renderNetworking(body);
  };
  body.querySelector("#cm-connect").onclick = async () => {
    await api.post("/proxy/settings/networking/clientmode/connect", {
      ssid: val(body, "cm-ssid"),
      bssid: val(body, "cm-bssid"),
      password: val(body, "cm-password"),
      interface: val(body, "cm-interface"),
    });
    api.toast("Connessione richiesta");
    renderNetworking(body);
  };
}

async function renderDiagnostics(body) {
  body.innerHTML = `<div class="card">
    <button class="primary" id="diag-start">Avvia diagnostica</button>
    <button id="diag-refresh">Aggiorna stato</button>
    <div id="diag-output" class="pre" style="margin-top:8px"></div>
  </div>`;

  async function refresh() {
    const data = await api.get("/proxy/settings/diagnostics/status");
    body.querySelector("#diag-output").textContent = `Completato: ${data.completed ? "sì" : "no"}\n\n${data.output ?? ""}`;
  }
  body.querySelector("#diag-start").onclick = async () => {
    await api.post("/proxy/settings/diagnostics/start");
    api.toast("Diagnostica avviata");
    refresh();
  };
  body.querySelector("#diag-refresh").onclick = refresh;
  await refresh();
}

function val(body, id) {
  return body.querySelector(`#${id}`)?.value ?? "";
}
function chk(body, id) {
  return body.querySelector(`#${id}`)?.checked ?? false;
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(v) {
  return escapeHtml(v ?? "");
}
