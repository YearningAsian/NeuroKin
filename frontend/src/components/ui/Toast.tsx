"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  visible: boolean;
  /** Auto-dismiss after ms (0 = manual) */
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({
  message,
  visible,
  duration = 3000,
  onDismiss,
}: Readonly<ToastProps>) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (visible && duration > 0) {
      const t = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, onDismiss]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in-up z-50"
      )}
    >
      <Sparkles className="w-5 h-5" />
      {message}
    </div>
  );
}
