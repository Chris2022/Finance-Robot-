import { useState } from "react";

export function CsvImport({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function upload() {
    if (!file) return;

    setMsg("Uploading...");
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("http://localhost:3001/transactions/import/csv", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data.error || "Upload failed"}`);
      return;
    }

    setMsg(`Imported ${data.imported} transactions ✅`);
    onImported();
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <strong>Import CSV</strong>
      <div style={{ marginTop: 8 }}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button style={{ marginLeft: 8 }} onClick={upload} disabled={!file}>
          Upload
        </button>
      </div>
      {msg && <div style={{ marginTop: 8, opacity: 0.85 }}>{msg}</div>}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
      Expected: generic (date,name,amount) or Discover Recent Activity CSV
      </div>
    </div>
  );
}
