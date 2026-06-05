"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export default function UploadPage() {
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/documents?workspaceId=00000000-0000-0000-0000-000000000001")
      .then((r) => r.json())
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => {});
  }, []);

  async function handleUpload() {
    if (!content.trim() || !filename.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: "00000000-0000-0000-0000-000000000001",
          filename,
          content,
        }),
      });
      setContent("");
      setFilename("");
      const res = await fetch("/api/documents?workspaceId=00000000-0000-0000-0000-000000000001");
      const data = await res.json();
      setDocs(data.documents ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Upload Documents</h1>

      <div className="mb-6 bg-white rounded-lg border p-4">
        <input
          type="text"
          placeholder="Filename (e.g. onboarding-guide.pdf)"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <textarea
          placeholder="Paste document content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3 h-40"
        />
        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded border p-3 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{doc.filename}</p>
              <p className="text-sm text-gray-500">
                {doc.chunk_count} chunks · {doc.status}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                doc.status === "ready"
                  ? "bg-green-100 text-green-700"
                  : doc.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
