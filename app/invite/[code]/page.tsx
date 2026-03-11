"use client";

import { useEffect, useState } from "react";

export default function InvitePage({ params }: { params: { code: string } }) {
  const [status, setStatus] = useState("Joining...");

  useEffect(() => {
    const join = async () => {
      const res = await fetch(`/api/invites/${params.code}/use`, {
        method: "POST"
      });

      if (res.status === 401) {
        setStatus("Please log in first.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus(data?.error || "Invite failed");
        return;
      }

      const data = await res.json();
      window.location.href = `/#room=${data.roomId}`;
    };

    join();
  }, [params.code]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="bg-panel rounded-xl p-8 shadow-glow text-center">
        <h1 className="text-2xl font-semibold mb-2">EVText Invite</h1>
        <p className="text-white/70">{status}</p>
      </div>
    </div>
  );
}
