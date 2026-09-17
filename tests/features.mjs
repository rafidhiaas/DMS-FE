// Fitur lanjutan: deteksi duplikat, pencarian isi berkas (PDF), otomatisasi, catatan, profil sendiri.
//   npm run test:features
import { ACCOUNTS, DEMO_PASSWORD, Session, assertStackUp, createReporter, loginAs, pdfFile, textFile, uploadForm } from "./lib.mjs";

await assertStackUp();
const t = createReporter();
const stamp = Date.now();
const admin = await loginAs("COMPANY_ADMIN");
const folder = (await admin.api("POST", "/folders", { json: { name: `Uji Fitur ${stamp}` } })).data.data;
const created = [];

try {
  t.section("Deteksi duplikat (SHA-256)");
  const same = `konten identik ${stamp}`;
  const first = await admin.api("POST", "/documents", { form: uploadForm(textFile("a.txt", same), { title: "Dup A", folderId: folder.id }) });
  created.push(first.data?.data?.id);
  const second = await admin.api("POST", "/documents", { form: uploadForm(textFile("b.txt", same), { title: "Dup B", folderId: folder.id }) });
  t.check("berkas identik ditolak dengan 409 + info dokumen yang sudah ada", second.status === 409 && second.data.code === "DUPLICATE_DOCUMENT" && second.data.data.existing.id === first.data.data.id, JSON.stringify(second.data).slice(0, 200));
  const forced = await admin.api("POST", "/documents", { form: uploadForm(textFile("b.txt", same), { title: "Dup B", folderId: folder.id, allowDuplicate: "true" }) });
  created.push(forced.data?.data?.id);
  t.check("allowDuplicate=true → tetap terunggah", forced.status === 201, String(forced.status));

  t.section("Pencarian isi berkas");
  const word = `zebrakuartal${stamp}`;
  const pdf = await admin.api("POST", "/documents", { form: uploadForm(pdfFile("notulen.pdf", `Notulen rapat ${word} disetujui`), { title: "Notulen Direksi", folderId: folder.id }) });
  const pdfId = pdf.data?.data?.id;
  created.push(pdfId);
  const content = await admin.api("GET", `/documents/${pdfId}/content`);
  t.check("teks PDF diekstrak saat unggah", content.data.data.content?.includes(word), String(content.data.data.content).slice(0, 100));
  const hit = await admin.api("GET", `/search?q=${word}`);
  t.check("kata di dalam PDF ditemukan + cuplikan", hit.data.data.some((r) => r.id === pdfId && r.snippet?.includes(word)));
  const byFolder = await admin.api("GET", `/search?q=${encodeURIComponent(`Uji Fitur ${stamp}`)}`);
  t.check("pencarian juga menemukan folder", byFolder.data.data.some((r) => r.kind === "folder" && r.id === folder.id));
  await admin.api("POST", `/documents/${pdfId}/versions`, { form: uploadForm(pdfFile("v2.pdf", `Revisi kanguru${stamp}`), {}) });
  const oldHit = await admin.api("GET", `/search?q=${word}`);
  const newHit = await admin.api("GET", `/search?q=kanguru${stamp}`);
  t.check("versi baru mengganti indeks isi", !oldHit.data.data.some((r) => r.id === pdfId) && newHit.data.data.some((r) => r.id === pdfId));

  t.section("Otomatisasi");
  const tag = (await admin.api("GET", "/metadata/tags")).data.data.find((x) => x.name === "Penting");
  const rule = await admin.api("POST", "/workflows", { json: { name: `Aturan uji ${stamp}`, trigger: "upload", match_title_contains: `otomatis${stamp}`, assign_tag_ids: [tag.id], assign_status: "PENDING_REVIEW" } });
  t.check("buat aturan", rule.status === 201, JSON.stringify(rule.data).slice(0, 160));
  const auto = await admin.api("POST", "/documents", { form: uploadForm(textFile("auto.txt", `auto ${stamp}`), { title: `Laporan otomatis${stamp}`, folderId: folder.id }) });
  created.push(auto.data?.data?.id);
  t.check(
    "unggahan yang cocok otomatis diberi tag + status",
    auto.data.data.documentTags.some((x) => x.tag.id === tag.id) && auto.data.data.status === "PENDING_REVIEW" && auto.data.data.appliedRules.includes(`Aturan uji ${stamp}`),
    JSON.stringify(auto.data.data.appliedRules),
  );
  const other = await admin.api("POST", "/documents", { form: uploadForm(textFile("lain.txt", `lain ${stamp}`), { title: "Dokumen lain", folderId: folder.id }) });
  created.push(other.data?.data?.id);
  t.check("unggahan yang tidak cocok tidak terpengaruh", !other.data.data.appliedRules.includes(`Aturan uji ${stamp}`) && other.data.data.status === "DRAFT");
  await admin.api("DELETE", `/workflows/${rule.data.data.id}`);

  t.section("Catatan");
  const note = await admin.api("POST", `/documents/${pdfId}/notes`, { json: { body: "Catatan uji" } });
  const notes = await admin.api("GET", `/documents/${pdfId}/notes`);
  t.check("tambah & daftar catatan", note.status === 201 && notes.data.data.some((n) => n.id === note.data.data.id && n.user?.name));
  const employee = await loginAs("EMPLOYEE");
  const foreignDelete = await employee.api("DELETE", `/documents/notes/${note.data.data.id}`);
  t.check("catatan orang lain tidak bisa dihapus karyawan", foreignDelete.status === 403, String(foreignDelete.status));

  t.section("Profil sendiri");
  const me = await loginAs("EMPLOYEE");
  const otherDevice = await loginAs("EMPLOYEE");
  const rename = await me.api("PATCH", "/auth/me", { json: { name: "Andi Karyawan Uji", role: "SUPER_ADMIN" } });
  const cookie = JSON.parse(decodeURIComponent(me.jar.get("dms_user")));
  t.check("ubah nama; peran tidak bisa dinaikkan sendiri", rename.status === 200 && rename.data.data.name === "Andi Karyawan Uji" && rename.data.data.role === "EMPLOYEE");
  t.check("cookie identitas disegarkan (nama baru tampil di sidebar)", cookie.name === "Andi Karyawan Uji");
  await me.api("PATCH", "/auth/me", { json: { name: "Andi Karyawan" } });

  const wrong = await me.api("POST", "/auth/change-password", { json: { currentPassword: "salah", newPassword: "SandiBaru456!" } });
  t.check("ganti sandi wajib sandi lama yang benar", wrong.status === 400, wrong.data?.message);
  const changed = await me.api("POST", "/auth/change-password", { json: { currentPassword: DEMO_PASSWORD, newPassword: "SandiBaru456!" } });
  t.check("ganti kata sandi", changed.status === 200, changed.data?.message);
  me.jar.set("dms_access", "kedaluwarsa");
  otherDevice.jar.set("dms_access", "kedaluwarsa");
  const mine = await me.api("GET", "/stats/dashboard");
  const theirs = await otherDevice.api("GET", "/stats/dashboard");
  t.check("sesi ini tetap hidup, perangkat lain dipaksa login ulang", mine.status === 200 && theirs.status === 401, `${mine.status}/${theirs.status}`);
  const restore = await me.api("POST", "/auth/change-password", { json: { currentPassword: "SandiBaru456!", newPassword: DEMO_PASSWORD } });
  const relogin = await new Session().login(ACCOUNTS.EMPLOYEE);
  t.check("kata sandi demo dikembalikan", restore.status === 200 && relogin.status === 200);
} finally {
  for (const id of created.filter(Boolean)) {
    await admin.api("DELETE", `/documents/${id}`);
    await admin.api("DELETE", `/documents/${id}/purge`);
  }
  await admin.api("DELETE", `/folders/${folder.id}`);
}

process.exit(t.finish());
