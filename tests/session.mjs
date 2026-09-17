// Sesi & keamanan jalur BFF: cookie HttpOnly, refresh token otomatis, tautan publik, proteksi rute.
//   npm run test:session
import { ACCOUNTS, Session, assertStackUp, createReporter, loginAs, textFile, uploadForm } from "./lib.mjs";

await assertStackUp();
const t = createReporter();

t.section("Login & proteksi rute");
const anon = new Session();
const guard = await anon.request("GET", "/dashboard");
t.check("rute privat dialihkan ke /login tanpa sesi", guard.status === 307 && guard.headers.get("location")?.includes("/login"));
const anonApi = await anon.api("GET", "/documents");
t.check("API privat menolak pengunjung anonim (401)", anonApi.status === 401, String(anonApi.status));
const bad = await anon.login(ACCOUNTS.COMPANY_ADMIN, "sandi-salah");
t.check("sandi salah → 401 dengan pesan", bad.status === 401 && Boolean(bad.data?.message), JSON.stringify(bad.data));

const s = new Session();
const login = await s.login(ACCOUNTS.COMPANY_ADMIN);
t.check("login menyetel cookie dms_access, dms_refresh, dms_user", login.status === 200 && ["dms_access", "dms_refresh", "dms_user"].every((c) => s.jar.has(c)));
t.check("token tidak pernah dikirim ke JavaScript (body respons)", !JSON.stringify(login.data).includes("accessToken"));
const mock = await s.request("POST", "/api/auth/mock-login", { json: { role: "SUPER_ADMIN" } });
t.check("endpoint login mock sudah tidak ada", mock.status === 404, String(mock.status));

t.section("Berkas lewat BFF");
const folders = await s.api("GET", "/folders/all");
const folder = folders.data.data[0];
const up = await s.api("POST", "/documents", {
  form: uploadForm(textFile("uji-sesi.txt", `uji sesi ${Date.now()}`), { title: "Uji Sesi", folderId: folder.id }),
});
const docId = up.data?.data?.id;
t.check("unggah multipart", up.status === 201, JSON.stringify(up.data).slice(0, 160));
const dl = await s.api("GET", `/documents/${docId}/file?download=1`);
t.check("unduh biner + Content-Disposition", dl.status === 200 && dl.headers.get("content-disposition")?.startsWith("attachment"));
const direct = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:5000"}/uploads/`).catch(() => null);
t.check("folder /uploads backend tidak bisa diakses langsung", !direct || direct.status === 404, String(direct?.status));

t.section("Refresh token otomatis");
// Pakai akun auditor: uji pemakaian ulang token mencabut SEMUA sesi akun itu (deteksi pencurian),
// jadi jangan pakai akun yang mungkin sedang dibuka penguji di browser.
const r = await loginAs("AUDITOR");
const oldRefresh = r.jar.get("dms_refresh");
r.jar.set("dms_access", "token.kedaluwarsa.palsu");
const afterExpiry = await r.api("GET", "/stats/dashboard");
t.check("access token invalid → diperbarui otomatis, request tetap berhasil", afterExpiry.status === 200);
t.check("refresh token dirotasi", r.jar.get("dms_refresh") !== oldRefresh);
const stolen = new Session();
stolen.jar.set("dms_refresh", oldRefresh);
stolen.jar.set("dms_access", "token.kedaluwarsa.palsu");
const reuse = await stolen.api("GET", "/stats/dashboard");
t.check("refresh token lama yang sudah dirotasi tidak bisa dipakai ulang", reuse.status === 401, String(reuse.status));

t.section("Tautan publik");
const link = await s.api("POST", `/shares/documents/${docId}/links`, { json: { access: "VIEWER", expires_in_days: 1 } });
const token = link.data?.data?.token;
t.check("buat tautan publik", link.status === 201 && Boolean(token), JSON.stringify(link.data).slice(0, 160));
const pub = await anon.api("GET", `/public/share/${token}`);
t.check("dibuka tanpa login", pub.status === 200 && pub.data.data.document.title === "Uji Sesi");
const pubView = await anon.api("GET", `/public/share/${token}/file`);
const pubDownload = await anon.api("GET", `/public/share/${token}/file?download=1`);
t.check("akses VIEWER: boleh lihat, tidak boleh unduh", pubView.status === 200 && pubDownload.status === 403, `${pubView.status}/${pubDownload.status}`);
const page = await anon.request("GET", `/share/${token}`);
t.check("halaman /share/[token] terbuka tanpa login", page.status === 200);
await s.api("DELETE", `/shares/links/${link.data.data.id}`);
const revoked = await anon.api("GET", `/public/share/${token}`);
t.check("tautan yang dicabut tidak berlaku lagi", revoked.status === 404, String(revoked.status));

t.section("Logout");
await s.api("DELETE", `/documents/${docId}`);
await s.api("DELETE", `/documents/${docId}/purge`);
const out = await s.logout();
t.check("logout menghapus semua cookie sesi", out.status === 200 && !s.jar.has("dms_access") && !s.jar.has("dms_refresh"));

process.exit(t.finish());
