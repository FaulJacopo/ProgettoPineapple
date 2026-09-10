import { api } from "../api.js";

export async function renderNotifications(container) {
  container.innerHTML = `
    <h1>Notifications</h1>
    <div class="row">
      <button class="primary" id="mark-all-read">Segna tutte come lette</button>
      <button class="danger" id="delete-all">Elimina tutte</button>
    </div>
    <div id="notif-list" class="card"><p class="empty">Caricamento...</p></div>
  `;

  container.querySelector("#mark-all-read").onclick = async () => {
    await api.put("/proxy/notifications/read");
    load();
  };
  container.querySelector("#delete-all").onclick = async () => {
    await api.del("/proxy/notifications");
    load();
  };

  async function load() {
    const listEl = container.querySelector("#notif-list");
    const items = (await api.get("/proxy/notifications")) || [];
    if (!items.length) {
      listEl.innerHTML = `<p class="empty">Nessuna notifica.</p>`;
      return;
    }
    listEl.innerHTML = `<table>
      <thead><tr><th>Stato</th><th>Messaggio</th><th>Modulo</th><th>Ora</th><th>Azioni</th></tr></thead>
      <tbody>${items.map(rowHtml).join("")}</tbody>
    </table>`;

    listEl.querySelectorAll("[data-action]").forEach((btn) => {
      btn.onclick = async () => {
        const { action, id } = btn.dataset;
        if (action === "read") await api.put(`/proxy/notifications/${id}/read`);
        if (action === "displayed") await api.put(`/proxy/notifications/${id}/displayed`);
        if (action === "delete") await api.del(`/proxy/notifications/${id}`);
        load();
      };
    });
  }

  function rowHtml(n) {
    const time = n.time ? new Date(n.time * 1000 || n.time).toLocaleString() : "-";
    return `<tr>
      <td><span class="badge ${n.read ? "" : "unread"}">${n.read ? "letta" : "non letta"}</span></td>
      <td>${escapeHtml(n.message ?? "")}</td>
      <td>${escapeHtml(n.module_name ?? "-")}</td>
      <td>${time}</td>
      <td>
        <button data-action="read" data-id="${n.id}">Letta</button>
        <button data-action="displayed" data-id="${n.id}">Visualizzata</button>
        <button class="danger" data-action="delete" data-id="${n.id}">Elimina</button>
      </td>
    </tr>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  await load();
}
