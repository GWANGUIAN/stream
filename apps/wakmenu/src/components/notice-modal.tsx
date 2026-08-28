"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_PREFIX = "wakmenu-notice-dismissed-";

export function NoticeModal({
  noticeId,
  title,
  children,
}: {
  noticeId: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(`${STORAGE_PREFIX}${noticeId}`) !== "1")
      setOpen(true);
  }, [noticeId]);

  if (!open) return null;

  const dismissForever = () => {
    localStorage.setItem(`${STORAGE_PREFIX}${noticeId}`, "1");
    setOpen(false);
  };

  return (
    <div className="notice-backdrop" role="dialog" aria-modal="true">
      <div className="notice-modal">
        <button
          className="notice-close"
          type="button"
          aria-label="닫기"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <h2>{title}</h2>
        <div className="notice-body">{children}</div>
        <button
          className="notice-dismiss"
          type="button"
          onClick={dismissForever}
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
}
