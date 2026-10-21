"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  { value: "light", label: "浅色", symbol: "☀" },
  { value: "dark", label: "夜间", symbol: "☾" },
  { value: "system", label: "跟随系统", symbol: "◐" },
];
const KEY = "nexttv-theme";

function applyTheme(mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeSwitcher() {
  const [mode, setMode] = useState("system");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (OPTIONS.some((option) => option.value === saved)) setMode(saved);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  function select(next) {
    setMode(next);
    setOpen(false);
    try { window.localStorage.setItem(KEY, next); } catch { /* Storage is optional */ }
    applyTheme(next);
  }

  const current = OPTIONS.find((option) => option.value === mode) || OPTIONS[2];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex size-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer btn-press"
        aria-label={`切换主题，当前：${current.label}`}
        aria-haspopup="menu" aria-expanded={open} title={`主题：${current.label}`}>
        <span aria-hidden="true" className="text-[22px] leading-none">{current.symbol}</span>
      </button>
      {open && (
        <div role="menu" aria-label="选择颜色主题"
          className="absolute top-full right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-xl p-1.5 z-[80]">
          {OPTIONS.map((option) => (
            <button key={option.value} type="button" role="menuitemradio"
              aria-checked={mode === option.value}
              onClick={() => select(option.value)}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors cursor-pointer hover:bg-gray-100 ${mode === option.value ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-600"}`}>
              <span className="w-5 text-center text-lg" aria-hidden="true">{option.symbol}</span>
              <span>{option.label}</span>
              {mode === option.value && <span className="ml-auto text-primary" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
