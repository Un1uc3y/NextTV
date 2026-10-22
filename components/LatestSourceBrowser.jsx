"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MovieCard } from "@/components/MovieCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getEnabledVideoSources } from "@/lib/contentFilter";
import { latestFirst, loadCatalog, toProviderMovies } from "@/lib/catalogFeed";

const LIMIT = 18;

export function LatestSourceBrowser() {
  const videoSources = useSettingsStore((state) => state.videoSources);
  const adultFilterEnabled = useSettingsStore((state) => state.adultFilterEnabled);
  const sources = useMemo(
    () => getEnabledVideoSources(videoSources, adultFilterEnabled),
    [videoSources, adultFilterEnabled]
  );
  const [selectedKey, setSelectedKey] = useState("");
  const [page, setPage] = useState(1);
  const [refreshCount, setRefreshCount] = useState(0);
  const [items, setItems] = useState([]);
  const [maxPages, setMaxPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstLoad = useRef(true);

  const selectedSource = sources.find((source) => source.key === selectedKey) || sources[0];
  const effectiveKey = selectedSource?.key || "";

  useEffect(() => {
    if (!selectedSource) {
      setItems([]);
      setBusy(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      controller.abort();
      setBusy(false);
      setError("目录加载超时，请换一个 API 源。");
    }, 15000);
    async function run() {
      setBusy(true);
      setError("");
      setItems([]);
      try {
        const data = await loadCatalog(selectedSource.url, {
          page, signal: controller.signal,
          refresh: refreshCount > 0 && page === 1,
        });
        if (controller.signal.aborted) return;
        const parsed = latestFirst(toProviderMovies(data.list, selectedSource, adultFilterEnabled));
        setItems(parsed.slice(0, LIMIT));
        setMaxPages(Math.max(1, Math.min(5000, Number(data.pagecount) || 1)));
        if (!parsed.length) setError("这个 API 当前页面没有可显示的内容，可以换源或翻页。");
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason?.message || "最新目录加载失败");
      } finally {
        clearTimeout(timer);
        if (!controller.signal.aborted && !expired) setBusy(false);
      }
    }
    run();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [effectiveKey, page, refreshCount, adultFilterEnabled, selectedSource?.url]);

  function chooseSource(key) {
    firstLoad.current = false;
    setSelectedKey(key);
    setPage(1);
    setRefreshCount(0);
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 md:p-8 shadow-soft" aria-label="按 API 浏览最新资源">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex gap-2 items-center">
            <span className="w-1 h-6 bg-primary rounded-full" /> API 最新资源
          </h2>
          <p className="text-sm text-gray-500 mt-1">按视频源返回的最新目录浏览，更新日期以来源数据为准。</p>
        </div>
        <Link href="/source-browse" className="text-sm text-gray-500 hover:text-primary self-start">进入完整源浏览 →</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 sm:flex-1">
          当前 API
          <select aria-label="最新资源 API 源" value={effectiveKey}
            disabled={sources.length === 0}
            onChange={(event) => chooseSource(event.target.value)}
            className="w-full min-h-11 rounded-xl bg-gray-50 border border-gray-200 px-3 text-gray-900 focus:ring-2 focus:ring-primary/40">
            {sources.map((source) => <option key={source.id} value={source.key}>{source.name}</option>)}
          </select>
        </label>
        <button type="button" className="min-h-11 px-5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 disabled:opacity-50"
          disabled={busy || !selectedSource} onClick={() => { setPage(1); setRefreshCount((c) => c + 1); }}>
          {busy ? "加载中…" : "↻ 刷新最新"}
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">请先到设置页启用视频源。</p>
      ) : (
        <>
          {error && <p role="status" className="text-sm text-amber-700 mb-4">{error}</p>}
          {busy ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" aria-busy="true">
              {Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-4">
              {items.map((movie) => <MovieCard key={movie.source + ":" + movie.id} movie={movie} showSpeedTest={false} />)}
            </div>
          )}
          <div className="flex justify-between items-center mt-6 gap-2">
            <p className="text-xs text-gray-500">第 {page} / {maxPages} 页 · API 排序不一定等于影视上映时间</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy || page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="min-h-10 px-3 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40">上一页</button>
              <button type="button" disabled={busy || page >= maxPages} onClick={() => setPage((value) => value + 1)}
                className="min-h-10 px-3 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40">下一页</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
