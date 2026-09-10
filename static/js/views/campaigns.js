import { api } from "../api.js";

export async function renderCampaigns(container) {
  container.innerHTML = `
    <h1>Campaigns</h1>
    <div class="card">
      <h2 style="margin-top:0">Nuova campagna</h2>
      <div class="row">
        <div class="field"><label>Nome</label><input id="c-name" /></div>
        <div class="field"><label>Mode</label><input id="c-mode" type="number" value="0" /></div>
        <div class="field"><label>Intervallo</label><input id="c-interval" placeholder="es. 60" /></div>
        <div class="field"><label>Storage path</label><input id="c-storage" placeholder="/root/reports" /></div>
      </div>
      <div class="row">
        <label><input type="checkbox" id="c-autorun" style="width:auto" /> Auto run</label>
        <label><input type="checkbox" id="c-plain" style="width:auto" /> Report testo</label>
        <label><input type="checkbox" id="c-html" style="width:auto" /> Report HTML</label>
        <label><input type="checkbox" id="c-c2" style="width:auto" /> Abilita C2</label>
        <label><input type="checkbox" id="c-c2exfil" style="width:auto" /> Abilita C2 Exfil</label>
      </div>
      <button class="primary" id="c-create">Crea campagna</button>
    </div>

    <h2>Campagne</h2>
    <div id="camp-list" class="card"><p class="empty">Caricamento...</p></div>

    <h2>Report</h2>
    <div id="report-list" class="card"><p class="empty">Caricamento...</p></div>
  `;

  container.querySelector("#c-create").onclick = async () => {
    await api.put("/proxy/campaigns/create", {
      name: container.querySelector("#c-name").value,
      mode: Number(container.querySelector("#c-mode").value || 0),
      autoRun: container.querySelector("#c-autorun").checked,
      interval: container.querySelector("#c-interval").value,
      plainReport: container.querySelector("#c-plain").checked,
      htmlReport: container.querySelector("#c-html").checked,
      storagePath: container.querySelector("#c-storage").value,
      enableC2: container.querySelector("#c-c2").checked,
      enableC2Exfil: container.querySelector("#c-c2exfil").checked,
    });
    api.toast("Campagna creata");
    loadCampaigns();
  };

  async function loadCampaigns() {
    const el = container.querySelector("#camp-list");
    const data = await api.get("/proxy/campaigns");
    const items = data?.campaigns || [];
    if (!items.length) {
      el.innerHTML = `<p class="empty">Nessuna campagna.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Nome</th><th>Tipo</th><th>Stato</th><th>Creata</th><th>Azioni</th></tr></thead>
      <tbody>${items.map(row).join("")}</tbody>
    </table>`;
    el.querySelectorAll("[data-action]").forEach((btn) => {
      btn.onclick = async () => {
        const { action, name } = btn.dataset;
        if (action === "enable") await api.put(`/proxy/campaigns/${encodeURIComponent(name)}/enable`);
        if (action === "disable") await api.del(`/proxy/campaigns/${encodeURIComponent(name)}/disable`);
        if (action === "delete") await api.del(`/proxy/campaigns/${encodeURIComponent(name)}`);
        loadCampaigns();
      };
    });
  }

  function row(c) {
    const created = c.created ? new Date(c.created * 1000).toLocaleString() : "-";
    return `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${c.type ?? "-"}</td>
      <td>${c.enabled ? "attiva" : "disattiva"}</td>
      <td>${created}</td>
      <td>
        <button data-action="enable" data-name="${escapeHtml(c.name)}">Enable</button>
        <button data-action="disable" data-name="${escapeHtml(c.name)}">Disable</button>
        <button class="danger" data-action="delete" data-name="${escapeHtml(c.name)}">Elimina</button>
      </td>
    </tr>`;
  }

  async function loadReports() {
    const el = container.querySelector("#report-list");
    const data = await api.get("/proxy/campaigns/reports");
    const items = Array.isArray(data) ? data : data ? [data] : [];
    if (!items.length) {
      el.innerHTML = `<p class="empty">Nessun report.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>File</th><th>Percorso</th><th>Azioni</th></tr></thead>
      <tbody>${items.map((r) => `<tr>
        <td>${escapeHtml(r.fileName ?? "-")}</td>
        <td>${escapeHtml(r.fullPath ?? "-")}</td>
        <td><button class="danger" data-report="${escapeHtml(r.fileName ?? "")}">Elimina</button></td>
      </tr>`).join("")}</tbody>
    </table>`;
    el.querySelectorAll("[data-report]").forEach((btn) => {
      btn.onclick = async () => {
        await api.del(`/proxy/campaigns/reports/${encodeURIComponent(btn.dataset.report)}`);
        loadReports();
      };
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  await Promise.all([loadCampaigns(), loadReports()]);
}
