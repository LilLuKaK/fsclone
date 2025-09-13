// @ts-nocheck
import { dedupeById, initialSequences } from "../utils";

/* =========================
   PROVEEDOR LOCAL (backup)
   ========================= */
const LS_KEY = "fsclone-cloud-v6";

function loadAllLS() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveAllLS(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

export const LocalProvider = {
  kind: "local",
  async init() {},
  async saveJSON(filename, data) {
    const all = loadAllLS();
    all[filename] = data;
    saveAllLS(all);
  },
  async readJSON(filename, fallback) {
    const all = loadAllLS();
    return all[filename] ?? fallback;
  },
};

/* ============================================
   GOOGLE DRIVE PROVIDER (con fusión de datos)
   ============================================ */
export function GoogleDriveProviderFactory({
  clientId,
  appFolderName = "FSClone",
}) {
  let accessToken = null;
  let folders = { root: null, data: null };

  const DRIVE_API = "https://www.googleapis.com/drive/v3";
  const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

  async function gfetch(url, options = {}) {
    if (!accessToken) throw new Error("No access token.");
    const headers = options.headers || {};
    headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { ...options, headers });
  }

  async function findFolderByName(name, parent = "root") {
    const q = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parent}' in parents and trashed=false`
    );
    const r = await gfetch(
      `${DRIVE_API}/files?q=${q}&fields=files(id,name,modifiedTime)`
    );
    const data = await r.json();
    return data.files?.[0] || null;
  }

  async function createFolder(name, parent = "root") {
    const meta = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent],
    };
    const r = await gfetch(`${DRIVE_API}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
    return r.json();
  }

  async function ensureTree() {
    const root =
      (await findFolderByName(appFolderName)) ||
      (await createFolder(appFolderName));
    const data =
      (await findFolderByName("data", root.id)) ||
      (await createFolder("data", root.id));
    folders = { root, data };
  }

  async function listByName(name) {
    const q = encodeURIComponent(
      `'${folders.data.id}' in parents and name='${name}' and trashed=false`
    );
    const r = await gfetch(
      `${DRIVE_API}/files?q=${q}&fields=files(id,name,modifiedTime,size)`
    );
    const data = await r.json();
    // Devolvemos primero el más reciente
    return (data.files || []).sort(
      (a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime)
    );
  }

  async function readFileJsonById(id, fallback = []) {
    const r = await gfetch(`${DRIVE_API}/files/${id}?alt=media`);
    try {
      return await r.json();
    } catch {
      return fallback;
    }
  }

  async function createFile(name, data) {
    const meta = await gfetch(`${DRIVE_API}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parents: [folders.data.id],
        mimeType: "application/json",
      }),
    }).then((r) => r.json());

    await gfetch(`${UPLOAD_API}/${meta.id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return meta.id;
  }

  async function upsertById(id, data) {
    await gfetch(`${UPLOAD_API}/${id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /* ========= FUSIÓN: arrays y objetos ========= */

  // Lee TODOS los duplicados de un nombre y fusiona por id (arrays)
  async function mergeLoadArray(name) {
    const files = await listByName(name);
    if (files.length === 0) return { items: [], fileId: null, files };

    let merged = [];
    for (const f of files) {
      const arr = await readFileJsonById(f.id, []);
      if (Array.isArray(arr)) merged = merged.concat(arr);
    }
    const items = dedupeById(merged);
    return { items, fileId: files[0].id, files };
  }

  // Lee y fusiona objetos (para secuencias)
  async function mergeLoadObject(name, fallback = {}) {
    const files = await listByName(name);
    if (files.length === 0) return { obj: fallback, fileId: null, files };

    let obj = {};
    for (const f of files) {
      const cur = await readFileJsonById(f.id, {});
      for (const [k, v] of Object.entries(cur || {})) {
        if (obj[k]?.last != null && v?.last != null) {
          obj[k] = { last: Math.max(obj[k].last, v.last) };
        } else {
          obj[k] = v;
        }
      }
    }
    if (Object.keys(obj).length === 0) obj = fallback;
    return { obj, fileId: files[0].id, files };
  }

  // Guarda fusionando arrays por id
  async function mergeSaveArray(name, incoming) {
    const files = await listByName(name);

    let current = [];
    if (files.length) {
      for (const f of files) {
        const arr = await readFileJsonById(f.id, []);
        if (Array.isArray(arr)) current = current.concat(arr);
      }
    }
    const map = new Map();
    [...(current || []), ...(incoming || [])].forEach(
      (x) => x?.id && map.set(x.id, x)
    );
    const merged = Array.from(map.values());

    if (!files.length) await createFile(name, merged);
    else await upsertById(files[0].id, merged);
  }

  // Guarda fusionando objetos (claves)
  async function mergeSaveObject(name, incoming) {
    const files = await listByName(name);

    let base = {};
    if (files.length) {
      for (const f of files) {
        const obj = await readFileJsonById(f.id, {});
        for (const [k, v] of Object.entries(obj || {})) base[k] = v;
      }
    }
    const out = { ...base, ...incoming };

    if (!files.length) await createFile(name, out);
    else await upsertById(files[0].id, out);
  }

  return {
    kind: "drive",

    async init() {},

    async connect() {
      const hasGIS =
        typeof window !== "undefined" &&
        window.google &&
        window.google.accounts?.oauth2;
      if (!hasGIS) throw new Error("Google Identity Services no disponible");

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        prompt: "",
        callback: () => {},
      });

      await new Promise((resolve) => {
        client.callback = (resp) => {
          accessToken = resp.access_token;
          resolve(null);
        };
        client.requestAccessToken();
      });

      await ensureTree();
    },

    async loadAll() {
      const customers  = await mergeLoadArray("customers.json");
      const albaranes  = await mergeLoadArray("albaranes.json");
      const facturas   = await mergeLoadArray("facturas.json");
      const cartaportes= await mergeLoadArray("cartaportes.json");
      const products   = await mergeLoadArray("products.json");          // 👈 AÑADIR
      const secuencias = await mergeLoadObject("secuencias.json", initialSequences());
      return { customers, albaranes, facturas, cartaportes, products, secuencias }; // 👈 AÑADIR products en el return
    },

    async saveCustomers(arr) {
      await mergeSaveArray("customers.json", arr);
    },
    async saveAlbaranes(arr) {
      await mergeSaveArray("albaranes.json", arr);
    },
    async saveFacturas(arr) {
      await mergeSaveArray("facturas.json", arr);
    },
    async saveCartaPorte(arr) {
      await mergeSaveArray("cartaportes.json", arr);
    },
    async saveSecuencias(obj) {
      await mergeSaveObject("secuencias.json", obj);
    },
    async saveProducts(arr) {
      await mergeSaveArray("products.json", arr);
    },
  };
}
