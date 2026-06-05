"use client";

import { useState, useEffect } from "react";

interface Stats {
  documents: number;
  unresolvedGaps: number;
  totalQueries: number;
}

interface Trend {
  day: string;
  avg_confidence: number;
}

interface GapCluster {
  label: string;
  count: number;
}

interface AuditBreakdown {
  verdict: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [clusters, setClusters] = useState<GapCluster[]>([]);
  const [audits, setAudits] = useState<AuditBreakdown[]>([]);

  const ws = "00000000-0000-0000-0000-000000000001";

  useEffect(() => {
    fetch(`/api/analytics/stats?workspaceId=${ws}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch(`/api/analytics/confidence?workspaceId=${ws}`)
      .then((r) => r.json())
      .then((d) => setTrends(d.trends ?? []))
      .catch(() => {});
    fetch(`/api/gaps/clusters?workspaceId=${ws}`)
      .then((r) => r.json())
      .then((d) => setClusters(d.clusters ?? []))
      .catch(() => {});
    fetch(`/api/analytics/audits?workspaceId=${ws}`)
      .then((r) => r.json())
      .then((d) => setAudits(d.breakdown ?? []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-2xl font-bold">{stats?.documents ?? "—"}</p>
          <p className="text-sm text-gray-500">Documents</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-2xl font-bold">{stats?.unresolvedGaps ?? "—"}</p>
          <p className="text-sm text-gray-500">Unresolved Gaps</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-2xl font-bold">{stats?.totalQueries ?? "—"}</p>
          <p className="text-sm text-gray-500">Total Queries</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Knowledge Gap Clusters</h2>
          {clusters.length === 0 ? (
            <p className="text-sm text-gray-500">No gaps found.</p>
          ) : (
            <div className="space-y-2">
              {clusters.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="truncate mr-2">{c.label}</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Audit Results</h2>
          {audits.length === 0 ? (
            <p className="text-sm text-gray-500">No audits yet.</p>
          ) : (
            <div className="space-y-2">
              {audits.map((a) => (
                <div key={a.verdict} className="flex justify-between items-center text-sm">
                  <span className="capitalize">{a.verdict}</span>
                  <span className="font-medium">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-3">Confidence Trends</h2>
        {trends.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="space-y-1">
            {trends.slice(0, 14).map((t) => (
              <div key={t.day} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-gray-500 text-xs">{t.day?.slice(0, 10)}</span>
                <div className="flex-1 bg-gray-100 rounded h-4">
                  <div
                    className="bg-blue-500 rounded h-4"
                    style={{ width: `${(t.avg_confidence * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="w-10 text-right">{(t.avg_confidence * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
