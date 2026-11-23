import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import type { Photo } from "@/lib/types";
import Uploader from "./Uploader";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "Date unknown";
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, thumb_path, original_filename, taken_at, latitude, longitude, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const photos = (data ?? []) as Photo[];

  const paths = photos.flatMap((p) => [p.storage_path, p.thumb_path].filter(Boolean) as string[]);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("photos").createSignedUrls(paths, 60 * 60);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return (
    <main>
      <header className="topbar">
        <h1>🐦 Bird Catalogue</h1>
        <form action="/auth/signout" method="post">
          <button className="link" type="submit">Sign out</button>
        </form>
      </header>

      <Uploader userId={user.id} />

      {error && <p className="error">Couldn&apos;t load photos: {error.message}</p>}

      <p className="muted">{photos.length} photo{photos.length === 1 ? "" : "s"}</p>
      <ul className="grid">
        {photos.map((p) => {
          const full = signed.get(p.storage_path);
          const thumb = (p.thumb_path && signed.get(p.thumb_path)) || full;
          return (
            <li key={p.id}>
              <a href={full} target="_blank" rel="noreferrer">
                {thumb ? <img src={thumb} alt={p.original_filename ?? "bird photo"} loading="lazy" /> : <div className="noimg">No preview</div>}
              </a>
              <div className="caption">
                <span>{formatDate(p.taken_at)}</span>
                {p.latitude != null && <span title={`${p.latitude.toFixed(5)}, ${p.longitude?.toFixed(5)}`}>📍</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {photos.length === 0 && !error && <p className="empty">No birds yet. Tap the button above to add your first photo.</p>}
    </main>
  );
}
