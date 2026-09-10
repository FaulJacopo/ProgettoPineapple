function toast(message, isError = false) {
  const container = document.getElementById("toast");
  const el = document.createElement("div");
  el.className = "toast-item" + (isError ? " error" : "");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let resp;
  try {
    resp = await fetch(path, opts);
  } catch (err) {
    toast(`Errore di rete: ${err.message}`, true);
    throw err;
  }
  let data = null;
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await resp.json().catch(() => null);
  } else {
    data = await resp.text().catch(() => null);
  }
  if (!resp.ok) {
    const message = (data && data.error) || (data && data.detail && data.detail.error) || `HTTP ${resp.status}`;
    toast(message, true);
    throw new Error(message);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body ?? {}),
  del: (path, body) => request("DELETE", path, body),
  toast,
};
