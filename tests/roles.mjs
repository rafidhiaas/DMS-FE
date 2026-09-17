// Hak akses per peran, di browser sungguhan: halaman yang boleh dibuka harus bersih dari error,
// halaman terlarang harus dialihkan, dan aksi terlarang harus ditolak backend.
//   npm run test:roles
import { ACCOUNTS, assertStackUp, createReporter, launchBrowser, loginAs, textFile, uploadForm } from "./lib.mjs";

await assertStackUp();
const t = createReporter();

const ROLES = [
  {
    role: "EMPLOYEE",
    name: "andi karyawan",
    allowed: ["/dashboard", "/folders", "/documents", "/shared", "/metadata", "/settings"],
    denied: ["/audit", "/users", "/trash", "/workflows"],
  },
  {
    role: "AUDITOR",
    name: "dodi auditor",
    allowed: ["/dashboard", "/folders", "/documents", "/shared", "/audit", "/settings"],
    denied: ["/users", "/workflows"],
  },
  {
    role: "COMPANY_ADMIN",
    name: "bunga admin",
    allowed: ["/dashboard", "/folders", "/documents", "/audit", "/users", "/trash", "/workflows", "/metadata"],
    denied: [],
  },
  {
    role: "SUPER_ADMIN",
    name: "raka superadmin",
    allowed: ["/dashboard", "/folders", "/documents", "/audit", "/users", "/trash", "/workflows", "/metadata"],
    denied: [],
  },
];

const browser = await launchBrowser({ port: 9341 });
try {
  for (const r of ROLES) {
    t.section(`${r.role} (${ACCOUNTS[r.role]})`);
    await browser.goto("/login", 2000);
    await browser.evaluate(`fetch('/api/auth/logout', { method: 'POST' })`);
    const status = await browser.login(ACCOUNTS[r.role]);
    t.check("login", status === 200, String(status));

    for (const url of r.allowed) {
      const before = browser.problems.length;
      await browser.goto(url);
      const text = await browser.text();
      const where = await browser.pathname();
      const errors = browser.problems.slice(before);
      t.check(`${url} terbuka tanpa error`, where === url && text.includes(r.name) && errors.length === 0, [where !== url && `dialihkan ke ${where}`, ...errors].filter(Boolean).join(" | "));
    }
    for (const url of r.denied) {
      await browser.goto(url, 2500);
      const where = await browser.pathname();
      t.check(`${url} ditolak (dialihkan)`, where !== url, where);
    }
  }
} finally {
  await browser.close();
}

t.section("Aturan backend (tidak bisa dilewati dari UI)");
const admin = await loginAs("COMPANY_ADMIN");
const employee = await loginAs("EMPLOYEE");
const auditor = await loginAs("AUDITOR");

const adminFolder = (await admin.api("GET", "/folders/all")).data.data.find((f) => f.name === "Keuangan");
const employeeFolders = await employee.api("GET", "/folders/all");
t.check("karyawan tidak melihat folder milik orang lain", !employeeFolders.data.data.some((f) => f.id === adminFolder.id));

const intrude = await employee.api("POST", "/documents", {
  form: uploadForm(textFile("x.txt", `intrusi ${Date.now()}`), { title: "Intrusi", folderId: adminFolder.id }),
});
t.check("karyawan tidak bisa mengunggah ke folder orang lain", intrude.status === 404, String(intrude.status));

const docs = await employee.api("GET", "/documents?limit=1000");
t.check(
  "karyawan hanya melihat dokumen miliknya, yang dibagikan, atau APPROVED",
  docs.data.data.documents.every((d) => d.isOwner || d.accessLevel || d.status === "APPROVED"),
);

const draft = (await admin.api("GET", "/documents?status=DRAFT&limit=1")).data.data.documents[0];
if (draft) {
  const peek = await employee.api("GET", `/documents/${draft.id}`);
  const peekFile = await employee.api("GET", `/documents/${draft.id}/file`);
  t.check("karyawan tidak bisa membuka DRAFT orang lain (detail & berkas)", peek.status === 403 && peekFile.status === 404, `${peek.status}/${peekFile.status}`);
  const auditorRead = await auditor.api("GET", `/documents/${draft.id}`);
  const auditorWrite = await auditor.api("PATCH", `/documents/${draft.id}`, { json: { title: "diubah auditor" } });
  t.check("auditor boleh membaca tetapi tidak boleh mengubah", auditorRead.status === 200 && auditorWrite.status === 403, `${auditorRead.status}/${auditorWrite.status}`);
}

const auditorFolder = await auditor.api("POST", "/folders", { json: { name: "folder auditor" } });
t.check("auditor tidak bisa membuat folder", auditorFolder.status === 403, String(auditorFolder.status));
const employeeUsers = await employee.api("GET", "/users");
const employeeWorkflows = await employee.api("GET", "/workflows");
const employeeAudit = await employee.api("GET", "/activity-logs");
t.check(
  "karyawan ditolak dari API admin (users, workflows, audit)",
  [employeeUsers, employeeWorkflows, employeeAudit].every((r) => r.status === 403),
  [employeeUsers, employeeWorkflows, employeeAudit].map((r) => r.status).join("/"),
);
const adminDeleteUser = await admin.api("DELETE", "/users/00000000-0000-0000-0000-000000000000");
t.check("hanya super admin yang boleh menghapus pengguna", adminDeleteUser.status === 403, String(adminDeleteUser.status));

process.exit(t.finish());
