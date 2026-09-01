"use client";

import { useEffect, useState } from "react";

const LAST_SEEN = "2026-08-20T20:46:00+09:00";

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}

export function LastSeenTimer() {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(LAST_SEEN).getTime();
    const tick = () => setElapsed(Math.max(0, Date.now() - target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (elapsed === null) return null;

  return (
    <p className="last-seen-timer">
      왁굳형의 마지막 접속일로부터
      <strong>{formatElapsed(elapsed)}</strong>
    </p>
  );
}
