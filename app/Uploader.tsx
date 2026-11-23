"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { makeThumbnail, readMeta } from "@/lib/image";

type Status = { name: string; state: "working" | "done" | "error"; detail?: string };

export default function Uploader({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const busy = statuses.some((s) => s.state === "working");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setStatuses(list.map((f) => ({ name: f.name, state: "working" })));
    const supabase = supabaseBrowser();

    const update = (i: number, s: Partial<Status>) =>
      setStatuses((prev) => prev.map((p, j) => (j === i ? { ...p, ...s } : p)));

    await Promise.all(
      list.map(async (file, i) => {
        try {
          const id = crypto.randomUUID();
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const path = `${userId}/${id}.${ext}`;
          const [meta, thumb] = await Promise.all([readMeta(file), makeThumbnail(file)]);

          const up = await supabase.storage.from("photos").upload(path, file, {
            contentType: file.type || undefined,
            upsert: false,
          });
          if (up.error) throw up.error;

          let thumbPath: string | null = null;
          if (thumb) {
            thumbPath = `${userId}/thumbs/${id}.jpg`;
            const t = await supabase.storage.from("photos").upload(thumbPath, thumb, { contentType: "image/jpeg" });
            if (t.error) thumbPath = null;
          }

          const ins = await supabase.from("photos").insert({
            storage_path: path,
            thumb_path: thumbPath,
            original_filename: file.name,
            content_type: file.type || null,
            size_bytes: file.size,
            taken_at: meta.takenAt,
            latitude: meta.latitude,
            longitude: meta.longitude,
            exif: meta.exif,
          });
          if (ins.error) throw ins.error;

          update(i, {
            state: "done",
            detail: meta.latitude != null ? "saved, with location" : "saved, no location in photo",
          });
        } catch (e) {
          update(i, { state: "error", detail: e instanceof Error ? e.message : "upload failed" });
        }
      })
    );

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <section className="uploader">
      <label className={`big-button ${busy ? "disabled" : ""}`}>
        {busy ? "Uploading…" : "📷 Add bird photos"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => handleFiles(e.target.files)}
          hidden
        />
      </label>
      {statuses.length > 0 && (
        <ul className="statuses">
          {statuses.map((s, i) => (
            <li key={i} className={s.state}>
              {s.state === "working" ? "⏳" : s.state === "done" ? "✅" : "⚠️"} {s.name}
              {s.detail ? <span className="muted"> {s.detail}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
