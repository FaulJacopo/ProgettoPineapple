import { api } from "./api.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderNotifications } from "./views/notifications.js";
import { renderCampaigns } from "./views/campaigns.js";
import { renderPineap } from "./views/pineap.js";
import { renderRecon } from "./views/recon.js";
import { renderSettings } from "./views/settings.js";
import { renderModules } from "./views/modules.js";

const routes = {
  dashboard: renderDashboard,
  notifications: renderNotifications,
  campaigns: renderCampaigns,
  pineap: renderPineap,
  recon: renderRecon,
  settings: renderSettings,
  modules: renderModules,
};

const content = document.getElementById("content");

function currentRoute() {
  const hash = location.hash.replace(/^#\//, "");
  return routes[hash] ? hash : "dashboard";
}

async function navigate() {
  const route = currentRoute();
  document.querySelectorAll("#nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
  content.innerHTML = "";
  try {
    await routes[route](content);
  } catch (err) {
    content.innerHTML = `<div class="card"><p class="muted">Impossibile caricare la sezione: ${err.message}</p></div>`;
  }
}

window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/dashboard";
  navigate();
  pollConnection();
  setInterval(pollConnection, 15000);
});

async function pollConnection() {
  const el = document.getElementById("connection-status");
  try {
    const data = await api.get("/proxy/helpers/checkonline");
    if (data && data.online) {
      el.textContent = "● device online";
      el.className = "status online";
    } else {
      el.textContent = "● device offline";
      el.className = "status offline";
    }
  } catch {
    el.textContent = "● non raggiungibile";
    el.className = "status offline";
  }
}
