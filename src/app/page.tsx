import { redirect } from "next/navigation";

/** Root selalu diarahkan ke dashboard; proxy akan melempar ke /login jika belum sesi. */
export default function Home() {
  redirect("/dashboard");
}
