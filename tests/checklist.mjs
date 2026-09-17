// Checklist QA — setiap butir diuji otomatis terhadap aplikasi yang sedang hidup.
//   npm run test:checklist
// Navigasi diuji di browser sungguhan (Chrome/Edge headless): halaman harus terbuka, menampilkan
// data dari backend, tanpa error konsol dan tanpa respons HTTP >= 400.
// CRUD / Sharing / Workflow / Users diuji lewat jalur yang sama dengan UI: cookie sesi → BFF → Express.
// Data uji dibuat di folder sendiri dan dibersihkan di akhir.
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCOUNTS,
  DEMO_PASSWORD,
  Session,
  assertStackUp,
  launchBrowser,
  loginAs,
  pdfFile,
  textFile,
  uploadForm,
} from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const stamp = Date.now();

/* Hasil dikumpulkan per bagian lalu dicetak sesuai urutan checklist. */
const SECTIONS = ["Navigation", "CRUD", "Sharing", "Workflow", "Users"];
const results = Object.fromEntries(SECTIONS.map((s) => [s, []]));
const mark = (section, name, cond, detail = "") => {
  results[section].push({ name, ok: Boolean(cond), detail: cond ? "" : detail });
  return Boolean(cond);
};
const brief = (res) => `${res.status} ${typeof res.data === "string" ? res.data.slice(0, 120) : JSON.stringify(res.data).slice(0, 160)}`;

await assertStackUp();
const admin = await loginAs("COMPANY_ADMIN");
const superAdmin = await loginAs("SUPER_ADMIN");
const employee = await loginAs("EMPLOYEE");

let folderId;
let docId;
let browser;

try {
  /* =============================== CRUD (bagian 1) =============================== */
  const folder = await admin.api("POST", "/folders", { json: { name: `Uji Checklist ${stamp}` } });
  folderId = folder.data?.data?.id;
  mark("CRUD", "Buat folder baru", folder.status === 201 && folderId, brief(folder));

  const renamedFolder = await admin.api("PATCH", `/folders/${folderId}/rename`, { json: { name: `Uji Checklist ${stamp} (rename)` } });
  const allFolders = await admin.api("GET", "/folders/all");
  mark(
    "CRUD",
    "Rename folder",
    renamedFolder.status === 200 && allFolders.data.data.some((f) => f.id === folderId && f.name.endsWith("(rename)")),
    brief(renamedFolder),
  );

  const upload = await admin.api("POST", "/documents", {
    form: uploadForm(pdfFile("uji-checklist.pdf", `Dokumen uji checklist ${stamp}`), { title: `Dokumen Uji ${stamp}`, folderId }),
  });
  docId = upload.data?.data?.id;
  const file = await admin.api("GET", `/documents/${docId}/file`);
  mark(
    "CRUD",
    "Upload dokumen baru",
    upload.status === 201 && docId && file.status === 200 && String(file.data).startsWith("%PDF"),
    brief(upload),
  );

  const newTitle = `Dokumen Uji ${stamp} (rename)`;
  const renamedDoc = await admin.api("PATCH", `/documents/${docId}`, { json: { title: newTitle } });
  mark("CRUD", "Rename dokumen", renamedDoc.status === 200 && renamedDoc.data.data.title === newTitle, brief(renamedDoc));

  const version = await admin.api("POST", `/documents/${docId}/versions`, {
    form: uploadForm(textFile("uji-checklist-v2.txt", `Versi kedua ${stamp}`), { changelog: "Revisi checklist" }),
  });
  const versions = await admin.api("GET", `/documents/${docId}/versions`);
  const v1 = await admin.api("GET", `/documents/${docId}/file?version=1`);
  mark(
    "CRUD",
    "Upload versi baru",
    version.status === 200 &&
      version.data.data.currentVersion === 2 &&
      versions.data.data.length === 2 &&
      String(v1.data).startsWith("%PDF"), // versi lama tetap bisa diambil
    brief(version),
  );

  const [tags, types] = await Promise.all([admin.api("GET", "/metadata/tags"), admin.api("GET", "/metadata/document-types")]);
  const tag = tags.data.data[0];
  const type = types.data.data[0];
  const asn = Number(String(stamp).slice(-8));
  const meta = await admin.api("PATCH", `/documents/${docId}/meta`, {
    json: { tagIds: [tag.id], documentTypeId: type.id, documentDate: "2025-06-30", asn, description: "Deskripsi uji" },
  });
  const detail = await admin.api("GET", `/documents/${docId}`);
  const d = detail.data?.data;
  mark(
    "CRUD",
    "Edit metadata dokumen",
    meta.status === 200 &&
      d?.documentTags?.length === 1 &&
      d.documentTags[0].tag.id === tag.id &&
      d.documentTypeId === type.id &&
      d.asn === String(asn) &&
      d.description === "Deskripsi uji" &&
      String(d.documentDate).startsWith("2025-06-30"),
    brief(meta),
  );

  /* ================================= Navigation ================================= */
  browser = await launchBrowser();
  const loginStatus = await browser.login(ACCOUNTS.COMPANY_ADMIN);
  if (loginStatus !== 200) throw new Error(`Login browser gagal (${loginStatus}).`);

  const pages = [
    ["/dashboard — statistik + aktivitas", "/dashboard", ["aktivitas terbaru", "folder", "dokumen"]],
    ["/folders — list folder", "/folders", ["keuangan", `uji checklist ${stamp}`]],
    ["/folders/[id] — isi folder + dokumen", `/folders/${folderId}`, [newTitle.toLowerCase()]],
    ["/documents — semua dokumen", "/documents", [newTitle.toLowerCase()]],
    ["/documents/[id] — detail dokumen", `/documents/${docId}`, [newTitle.toLowerCase(), "pratinjau", `versi kedua ${stamp}`]],
    ["/shared — dibagikan ke saya", "/shared", ["dibagikan"]],
    ["/audit — activity log", "/audit", ["audit log", "unggah dokumen"]],
    ["/trash — sampah", "/trash", ["sampah"]],
    ["/users — user management (admin)", "/users", [ACCOUNTS.EMPLOYEE, ACCOUNTS.AUDITOR]],
    ["/metadata — tag, type, correspondent", "/metadata", [tag.name.toLowerCase()]],
    ["/settings — pengaturan", "/settings", ["profil", "kata sandi"]],
  ];
  for (const [label, url, expected] of pages) {
    const before = browser.problems.length;
    await browser.goto(url, url.includes("/documents/") || url.includes("/folders/") ? 5000 : 3500);
    const text = await browser.text();
    const where = await browser.pathname();
    const missing = expected.filter((e) => !text.includes(e));
    const errors = browser.problems.slice(before);
    const okPage = where === url && missing.length === 0 && errors.length === 0;
    if (!okPage) await browser.screenshot(path.join(HERE, ".shots", `${url.replace(/\W+/g, "_")}.png`));
    mark(
      "Navigation",
      label,
      okPage,
      [where !== url && `dialihkan ke ${where}`, missing.length && `teks tidak ditemukan: ${missing.join(", ")}`, ...errors]
        .filter(Boolean)
        .join(" | "),
    );
  }

  /* ================================== Sharing ================================== */
  const recipient = (await admin.api("GET", "/users/search?q=karyawan")).data.data.find((u) => u.email === ACCOUNTS.EMPLOYEE);
  const blocked = await employee.api("GET", `/documents/${docId}`);
  const share = await admin.api("POST", `/shares/documents/${docId}/share`, { json: { user_id: recipient.id, access_level: "VIEWER" } });
  const shareId = share.data?.share?.id;
  const viewerDetail = await employee.api("GET", `/documents/${docId}`);
  const viewerDownload = await employee.api("GET", `/documents/${docId}/file?download=1`);
  mark(
    "Sharing",
    "Share dokumen ke user lain",
    blocked.status === 403 && share.status === 201 && viewerDetail.status === 200 && viewerDownload.status === 403, // VIEWER: lihat, tidak unduh
    `sebelum=${blocked.status} share=${brief(share)} detail=${viewerDetail.status} unduh=${viewerDownload.status}`,
  );

  const upgraded = await admin.api("PATCH", `/shares/${shareId}`, { json: { access_level: "DOWNLOADER" } });
  const downloaderDownload = await employee.api("GET", `/documents/${docId}/file?download=1`);
  mark(
    "Sharing",
    "Update access level",
    upgraded.status === 200 && upgraded.data.share.accessLevel === "DOWNLOADER" && downloaderDownload.status === 200,
    `${brief(upgraded)} unduh=${downloaderDownload.status}`,
  );

  const sharedBefore = await employee.api("GET", "/shares/shared-with-me");
  const revoke = await admin.api("DELETE", `/shares/${shareId}`);
  const sharedAfter = await employee.api("GET", "/shares/shared-with-me");
  const afterRevoke = await employee.api("GET", `/documents/${docId}`);
  mark("Sharing", "Revoke share", revoke.status === 200 && afterRevoke.status === 403, `${brief(revoke)} detail=${afterRevoke.status}`);
  mark(
    "Sharing",
    'Cek "Dibagikan ke Saya"',
    sharedBefore.data.shares.some((s) => s.document?.id === docId && s.accessLevel === "DOWNLOADER") &&
      !sharedAfter.data.shares.some((s) => s.document?.id === docId),
    `sebelum=${sharedBefore.data.shares?.length} sesudah=${sharedAfter.data.shares?.length}`,
  );

  /* ================================== Workflow ================================== */
  const status = (s, reason) => admin.api("PATCH", `/documents/${docId}/status`, { json: { status: s, ...(reason ? { reason } : {}) } });

  const submit = await status("PENDING_REVIEW");
  mark("Workflow", "Submit review (DRAFT → PENDING_REVIEW)", submit.status === 200 && submit.data.data.status === "PENDING_REVIEW", brief(submit));

  const rejectNoReason = await superAdmin.api("PATCH", `/documents/${docId}/status`, { json: { status: "DRAFT" } });
  const reject = await superAdmin.api("PATCH", `/documents/${docId}/status`, { json: { status: "DRAFT", reason: "Lampiran belum lengkap" } });
  const notes = await admin.api("GET", `/documents/${docId}/notes`);
  const rejectOk =
    rejectNoReason.status === 403 && // alasan wajib
    reject.status === 200 &&
    reject.data.data.status === "DRAFT" &&
    notes.data.data.some((n) => n.body.includes("Lampiran belum lengkap")); // alasan tersimpan sebagai catatan

  await status("PENDING_REVIEW");
  const employeeApprove = await employee.api("PATCH", `/documents/${docId}/status`, { json: { status: "APPROVED" } });
  const approve = await status("APPROVED");
  mark(
    "Workflow",
    "Approve (PENDING_REVIEW → APPROVED)",
    employeeApprove.status === 403 && approve.status === 200 && approve.data.data.status === "APPROVED", // karyawan tidak boleh approve
    `karyawan=${employeeApprove.status} admin=${brief(approve)}`,
  );

  const archive = await status("ARCHIVED");
  mark("Workflow", "Archive", archive.status === 200 && archive.data.data.status === "ARCHIVED", brief(archive));
  mark("Workflow", "Reject dengan alasan", rejectOk, `tanpa-alasan=${rejectNoReason.status} reject=${brief(reject)}`);

  const history = await admin.api("GET", `/documents/${docId}/history`);
  const actions = history.data.data.map((l) => l.action);
  mark(
    "Workflow",
    "(bonus) semua transisi tercatat di riwayat dokumen",
    ["SUBMIT_REVIEW", "REJECT", "APPROVE", "ARCHIVE"].every((a) => actions.includes(a)),
    actions.join(","),
  );

  /* =============================== CRUD (bagian 2) =============================== */
  const del = await admin.api("DELETE", `/documents/${docId}`);
  const trash1 = await admin.api("GET", "/documents/trash");
  const gone = await admin.api("GET", `/documents/${docId}`);
  mark(
    "CRUD",
    "Hapus dokumen (soft → trash)",
    del.status === 200 && trash1.data.data.some((x) => x.id === docId) && gone.status === 404,
    `${brief(del)} detail=${gone.status}`,
  );

  const restore = await admin.api("POST", `/documents/${docId}/restore`);
  const trash2 = await admin.api("GET", "/documents/trash");
  const back = await admin.api("GET", `/documents/${docId}`);
  mark(
    "CRUD",
    "Restore dari trash",
    restore.status === 200 && !trash2.data.data.some((x) => x.id === docId) && back.status === 200 && back.data.data.currentVersion === 2,
    brief(restore),
  );

  const purgeActive = await admin.api("DELETE", `/documents/${docId}/purge`); // harus ditolak: belum di Sampah
  await admin.api("DELETE", `/documents/${docId}`);
  const purge = await admin.api("DELETE", `/documents/${docId}/purge`);
  const trash3 = await admin.api("GET", "/documents/trash");
  const restoreGone = await admin.api("POST", `/documents/${docId}/restore`);
  mark(
    "CRUD",
    "Purge permanen",
    purgeActive.status === 400 && purge.status === 200 && !trash3.data.data.some((x) => x.id === docId) && restoreGone.status === 404,
    `aktif=${purgeActive.status} purge=${brief(purge)} restore=${restoreGone.status}`,
  );
  docId = undefined;

  /* =================================== Users =================================== */
  const email = `uji-checklist-${stamp}@dms.test`;
  const create = await superAdmin.api("POST", "/users", { json: { name: "Uji Checklist", email, password: "SandiAwal123!", role: "EMPLOYEE" } });
  const userId = create.data?.data?.id;
  const firstLogin = await new Session().login(email, "SandiAwal123!");
  mark("Users", "Create user", create.status === 201 && firstLogin.status === 200, brief(create));

  const update = await superAdmin.api("PATCH", `/users/${userId}`, { json: { name: "Uji Checklist (diubah)", role: "AUDITOR" } });
  const adminRoleChange = await admin.api("PATCH", `/users/${userId}`, { json: { role: "SUPER_ADMIN" } }); // admin perusahaan tak boleh ubah peran
  mark(
    "Users",
    "Update user",
    update.status === 200 && update.data.data.name === "Uji Checklist (diubah)" && update.data.data.role === "AUDITOR" && adminRoleChange.status === 403,
    `${brief(update)} admin-ubah-peran=${adminRoleChange.status}`,
  );

  const reset = await superAdmin.api("POST", `/users/${userId}/reset-password`, { json: { newPassword: "SandiReset456!" } });
  const oldPass = await new Session().login(email, "SandiAwal123!");
  const newPass = await new Session().login(email, "SandiReset456!");

  const deactivate = await superAdmin.api("PATCH", `/users/${userId}`, { json: { active: false } });
  const inactiveLogin = await new Session().login(email, "SandiReset456!");
  mark(
    "Users",
    "Deactivate user",
    deactivate.status === 200 && deactivate.data.data.active === false && inactiveLogin.status === 403,
    `${brief(deactivate)} login=${inactiveLogin.status}`,
  );
  mark(
    "Users",
    "Reset password",
    reset.status === 200 && oldPass.status === 401 && newPass.status === 200,
    `${brief(reset)} sandi-lama=${oldPass.status} sandi-baru=${newPass.status}`,
  );
} catch (error) {
  console.error(`\nUji terhenti: ${error.message}`);
  process.exitCode = 1;
} finally {
  /* Bersihkan data uji (user uji tetap nonaktif; `npm run seed` di backend menghapusnya). */
  if (docId) {
    await admin.api("DELETE", `/documents/${docId}`);
    await admin.api("DELETE", `/documents/${docId}/purge`);
  }
  if (folderId) await admin.api("DELETE", `/folders/${folderId}`);
  await browser?.close();
}

let pass = 0;
let fail = 0;
for (const section of SECTIONS) {
  console.log(`\n${section}:`);
  for (const r of results[section]) {
    if (r.ok) pass += 1;
    else fail += 1;
    console.log(`- [${r.ok ? "x" : " "}] ${r.name}${r.detail ? `\n      ↳ ${r.detail}` : ""}`);
  }
}
console.log(`\n${pass} lolos, ${fail} gagal (password akun demo: ${DEMO_PASSWORD})`);
process.exit(fail === 0 && !process.exitCode ? 0 : 1);
