// Alat bantu uji end-to-end (tanpa dependensi — Node 22+: fetch, FormData, WebSocket bawaan).
// Semua uji berjalan terhadap aplikasi yang SEDANG HIDUP: Browser/Node → Next BFF → Express → PostgreSQL.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const FE_URL = process.env.FE_URL ?? "http://localhost:3000";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Password123!";
export const ACCOUNTS = {
  SUPER_ADMIN: "super@dms.test",
  COMPANY_ADMIN: "admin@dms.test",
  AUDITOR: "auditor@dms.test",
  EMPLOYEE: "karyawan@dms.test",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ Pelapor ------------------------------ */
export function createReporter() {
  let pass = 0;
  let fail = 0;
  return {
    section(title) {
      console.log(`\n${title}`);
    },
    check(name, cond, detail = "") {
      if (cond) pass += 1;
      else fail += 1;
      console.log(`  [${cond ? "x" : " "}] ${name}${!cond && detail ? `\n        ↳ ${detail}` : ""}`);
      return Boolean(cond);
    },
    finish() {
      console.log(`\n${pass} lolos, ${fail} gagal`);
      return fail === 0 ? 0 : 1;
    },
  };
}

/* ---------------- Sesi HTTP ber-cookie (meniru browser) ---------------- */
export class Session {
  jar = new Map();

  #absorb(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (v === "" || /Max-Age=0/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }

  async request(method, url, { json, form } = {}) {
    const headers = { Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    let body;
    if (json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    }
    if (form) body = form;
    const res = await fetch(FE_URL + url, { method, headers, body, redirect: "manual" });
    this.#absorb(res);
    const type = res.headers.get("content-type") ?? "";
    const data = type.includes("json") ? await res.json().catch(() => null) : await res.text();
    return { status: res.status, data, headers: res.headers };
  }

  /** Panggil backend lewat BFF: api("GET", "/documents") → /api/bff/documents */
  api(method, apiPath, opts) {
    return this.request(method, `/api/bff${apiPath}`, opts);
  }

  async login(email, password = DEMO_PASSWORD) {
    return this.request("POST", "/api/auth/login", { json: { email, password } });
  }

  logout() {
    return this.request("POST", "/api/auth/logout");
  }
}

export async function loginAs(role) {
  const session = new Session();
  const res = await session.login(ACCOUNTS[role]);
  if (res.status !== 200) {
    throw new Error(
      `Login ${ACCOUNTS[role]} gagal (${res.status}). Pastikan backend hidup dan \`npm run seed\` sudah dijalankan.`,
    );
  }
  return session;
}

/* ------------------------------ Berkas uji ------------------------------ */
export function textFile(name, content) {
  return new File([content], name, { type: "text/plain" });
}

/** PDF satu halaman yang valid, dengan lapisan teks (untuk uji pratinjau & indeks isi). */
export function pdfFile(name, text) {
  const stream = `BT /F1 18 Tf 72 760 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new File([out], name, { type: "application/pdf" });
}

export function uploadForm(file, fields) {
  const form = new FormData();
  form.append("file", file, file.name);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

/* ------------------- Browser sungguhan (Chrome/Edge via CDP) ------------------- */
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

/**
 * Buka browser headless. `problems` menampung error konsol, exception, dan respons
 * HTTP >= 400 dari /api/* — halaman dianggap sehat hanya bila daftar ini tidak bertambah.
 */
export async function launchBrowser({ port = 9340 } = {}) {
  const executable = BROWSERS.find((p) => fs.existsSync(p));
  if (!executable) throw new Error("Chrome/Edge tidak ditemukan. Set CHROME_PATH ke lokasi browser.");

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dms-e2e-"));
  const proc = spawn(
    executable,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "--no-first-run",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      /* browser belum siap */
    }
  }
  if (!target) throw new Error("Browser tidak merespons di port debugging.");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let seq = 0;
  const pending = new Map();
  const problems = [];
  let current = "";

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      problems.push(`[${current}] exception: ${d.exception?.description ?? d.text}`);
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      problems.push(`[${current}] console.error: ${text.slice(0, 300)}`);
    }
    if (msg.method === "Network.responseReceived") {
      const { status, url } = msg.params.response;
      if (status >= 400 && url.includes("/api/")) problems.push(`[${current}] HTTP ${status} ${url.replace(FE_URL, "")}`);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate gagal");
    }
    return r.result?.result?.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");

  return {
    problems,
    evaluate,
    async goto(urlPath, waitMs = 3500) {
      current = urlPath;
      await send("Page.navigate", { url: FE_URL + urlPath });
      await sleep(waitMs);
    },
    pathname: () => evaluate("location.pathname"),
    /** Teks halaman, huruf kecil (CSS `uppercase` memengaruhi innerText). */
    async text() {
      return String(await evaluate("document.body.innerText")).toLowerCase();
    },
    /** Login lewat endpoint yang sama dengan form login, di dalam konteks browser (cookie HttpOnly asli). */
    async login(email, password = DEMO_PASSWORD) {
      await this.goto("/login", 2500);
      return evaluate(
        `fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(
          JSON.stringify({ email, password }),
        )} }).then(r => r.status)`,
      );
    },
    async screenshot(file) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
    },
    async close() {
      ws.close();
      proc.kill();
      await sleep(500);
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* profil masih terkunci sebentar — dibersihkan OS */
      }
    },
  };
}

/** Pastikan aplikasi hidup sebelum menguji; pesan jelas bila belum. */
export async function assertStackUp() {
  let health;
  try {
    health = await (await fetch(`${FE_URL}/api/healthz`)).json();
  } catch {
    throw new Error(`Frontend tidak bisa dihubungi di ${FE_URL}. Jalankan start-dev.cmd (atau npm run dev) dulu.`);
  }
  if (health.backend !== "up") {
    throw new Error("Frontend hidup, tetapi backend Express mati. Jalankan backend + database dulu.");
  }
}
