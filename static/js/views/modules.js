import { api } from "../api.js";

export async function renderModules(container) {
  container.innerHTML = `
    <h1>Modules</h1>
    <div class="card">
      <h2 style="margin-top:0">Installa modulo remoto</h2>
      <div class="row">
        <div class="field"><label>Nome modulo</label><input id="m-install-name" /></div>
      </div>
      <button class="primary" id="m-install">Installa</button>
    </div>

    <div class="card">
      <h2 style="margin-top:0">Richiesta generica a un modulo</h2>
      <div class="field"><label>Payload JSON</label><textarea id="m-request-body" rows="4">{"module_name": "", "action": ""}</textarea></div>
      <button id="m-request">Invia richiesta</button>
      <div id="m-request-result" class="pre" style="margin-top:8px;display:none"></div>
    </div>

    <h2>Moduli installati</h2>
    <div id="m-installed" class="card"><p class="empty">Caricamento...</p></div>

    <h2>Moduli disponibili</h2>
    <div id="m-available" class="card"><p class="empty">Caricamento...</p></div>
  `;

  container.querySelector("#m-install").onclick = async () => {
    const name = container.querySelector("#m-install-name").value;
    await api.put("/proxy/modules/install", { module_name: name });
    api.toast("Installazione richiesta");
    loadInstalled();
  };

  container.querySelector("#m-request").onclick = async () => {
    const resultEl = container.querySelector("#m-request-result");
    try {
      const payload = JSON.parse(container.querySelector("#m-request-body").value);
      const data = await api.post("/proxy/modules/request", payload);
      resultEl.style.display = "block";
      resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      api.toast(`JSON non valido: ${err.message}`, true);
    }
  };

  async function loadInstalled() {
    const el = container.querySelector("#m-installed");
    const data = await api.get("/proxy/modules");
    const items = Array.isArray(data) ? data : data?.modules || [];
    if (!items.length) {
      el.innerHTML = `<p class="empty">Nessun modulo installato.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Modulo</th><th>Azioni</th></tr></thead>
      <tbody>${items.map((m) => {
        const name = typeof m === "string" ? m : m.name ?? JSON.stringify(m);
        return `<tr><td>${escapeHtml(name)}</td>
          <td>
            <button data-fav="${escapeHtml(name)}">Preferito</button>
            <button class="danger" data-remove="${escapeHtml(name)}">Rimuovi</button>
          </td></tr>`;
      }).join("")}</tbody>
    </table>`;
    el.querySelectorAll("[data-fav]").forEach((btn) => (btn.onclick = async () => {
      await api.post(`/proxy/modules/favourite/${encodeURIComponent(btn.dataset.fav)}`);
      api.toast("Aggiornato");
    }));
    el.querySelectorAll("[data-remove]").forEach((btn) => (btn.onclick = async () => {
      await api.del(`/proxy/modules/${encodeURIComponent(btn.dataset.remove)}`);
      loadInstalled();
    }));
  }

  async function loadAvailable() {
    const el = container.querySelector("#m-available");
    const data = await api.get("/proxy/modules/available");
    const items = Array.isArray(data) ? data : data?.modules || [];
    if (!items.length) {
      el.innerHTML = `<p class="empty">Nessun modulo disponibile.</p>`;
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Modulo</th></tr></thead>
      <tbody>${items.map((m) => `<tr><td>${escapeHtml(typeof m === "string" ? m : JSON.stringify(m))}</td></tr>`).join("")}</tbody>
    </table>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  await Promise.all([loadInstalled(), loadAvailable()]);
}
