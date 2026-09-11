import type { ManagedUser, Role } from "@/types";
import { MOCK_ACCOUNTS } from "@/lib/mocks/auth";
import { MOCK_USERS } from "@/lib/mocks/users";

/**
 * MOCK store Manajemen Pengguna — persist di localStorage.
 * Backend hanya punya /auth/register; list/ubah peran/nonaktifkan belum ada
 * (lihat backend-gaps). Store ini TIDAK mengimpor audit-store (hindari siklus);
 * pencatatan audit dilakukan di lapisan API.
 */

const STORAGE_KEY = "dms_mock_users_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function seed(): ManagedUser[] {
  const accounts = Object.values(MOCK_ACCOUNTS).map<ManagedUser>((a, i) => ({
    ...a,
    active: true,
    created_at: nowIso(90 - i),
    last_login_at: nowIso(i),
  }));
  const others = MOCK_USERS.map<ManagedUser>((u, i) => ({
    ...u,
    active: i !== 4, // satu akun nonaktif sebagai contoh
    created_at: nowIso(60 - i * 3),
    last_login_at: i === 4 ? null : nowIso(2 + i),
  }));
  return [...accounts, ...others];
}

function load(): ManagedUser[] {
  if (typeof window === "undefined") return [...Object.values(MOCK_ACCOUNTS), ...MOCK_USERS].map((u) => ({
    ...u,
    active: true,
    created_at: nowIso(30),
    last_login_at: null,
  }));
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as ManagedUser[];
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(users: ManagedUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Baca sinkron (dipakai audit-store untuk resolve nama pelaku). */
export function peekUsers(): ManagedUser[] {
  return load();
}

export const mockUsersStore = {
  async list(query = "", includeInactive = true): Promise<ManagedUser[]> {
    const q = query.trim().toLowerCase();
    const users = load()
      .filter((u) => includeInactive || u.active)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    return delay(users);
  },

  async create(input: { name: string; email: string; role: Role }): Promise<ManagedUser> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email) throw new Error("Nama dan email wajib diisi.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Format email tidak valid.");
    const users = load();
    if (users.some((u) => u.email.toLowerCase() === email)) throw new Error("Email sudah terdaftar.");
    const user: ManagedUser = {
      id: uuid(),
      name,
      email,
      role: input.role,
      active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
    };
    users.push(user);
    save(users);
    return delay(user);
  },

  async update(
    id: string,
    patch: { name?: string; role?: Role; active?: boolean },
  ): Promise<ManagedUser> {
    const users = load();
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new Error("Nama tidak boleh kosong.");
      user.name = name;
    }
    if (patch.role !== undefined) user.role = patch.role;
    if (patch.active !== undefined) user.active = patch.active;
    save(users);
    return delay(user);
  },

  async remove(id: string): Promise<void> {
    const users = load();
    if (!users.some((u) => u.id === id)) throw new Error("Pengguna tidak ditemukan.");
    save(users.filter((u) => u.id !== id));
    return delay(undefined);
  },
};
