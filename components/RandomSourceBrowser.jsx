"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MovieCard } from "@/components/MovieCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getEnabledVideoSources, isAdultContent, isAdultSource } from "@/lib/contentFilter";

const ALL_SOURCES = "all";
const MAX_RESULTS = 18;
const MAX_RANDOM_PAGE = 5000;

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function fetchCatalog(source, page, signal) {
  const apiUrl = new URL(source.url);
  apiUrl.searchParams.set("ac", "detail");
  apiUrl.searchParams.set("pg", String(page));
  const response = await fetch("/api/detail?apiUrl=" + encodeURIComponent(apiUrl.toString()), { signal });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const data = await response.json();
  if (!data || !Array.isArray(data.list)) throw new Error("无效的视频目录");
  return data;
}

async function randomCatalogItems(source, signal, lastPages) {
  // First page provides the total number of pages for this specific API.
  const first = await fetchCatalog(source, 1, signal);
  const numberOfPages = Math.max(1, Math.min(MAX_RANDOM_PAGE, Number(first.pagecount) || 1));
  let page = Math.floor(Math.random() * numberOfPages) + 1;
  if (numberOfPages > 1 && page === lastPages.get(source.key)) {
    page = (page % numberOfPages) + 1;
  }
  lastPages.set(source.key, page);
  let data = page === 1 ? first : await fetchCatalog(source, page, signal);

  // Some providers advertise pages that are currently empty.
  if (data.list.length === 0 && page !== 1) data = first;
  return data.list.map((video) => ({
    id: video.vod_id == null ? "" : String(video.vod_id),
    title: video.vod_name || "",
    poster: video.vod_pic || "",
    source: source.key,
    source_name: source.name,
    source_url: source.url,
    type_name: video.type_name || "",
    class: video.vod_class || "",
    rating: video.vod_score || "",
  })).filter((video) => video.id && video.title);
}

export function RandomSourceBrowser({ adultOnly = false }) {
  const videoSources = useSettingsStore((state) => state.videoSources);
  const adultFilterEnabled = useSettingsStore((state) => state.adultFilterEnabled);
  const [selectedKey, setSelectedKey] = useState(ALL_SOURCES);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previousPages = useRef(new Map());

  const sources = useMemo(() => {
    const enabled = getEnabledVideoSources(videoSources, adultFilterEnabled);
    return adultOnly ? enabled.filter(isAdultSource) : enabled;
  }, [videoSources, adultFilterEnabled, adultOnly]);
  const selectedSource = sources.find((source) => source.key === selectedKey);
  const effectiveKey = selectedSource ? selectedKey : ALL_SOURCES;

  useEffect(() => {
    if ((adultOnly && adultFilterEnabled) || sources.length === 0) {
      setItems([]);
      setError("");
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setBusy(false);
      setError("请求超时，请选择其他视频源再试。");
    }, 18000);

    async function loadRandomVideos() {
      setBusy(true);
      setError("");
      setItems([]);
      const targets = effectiveKey === ALL_SOURCES
        ? shuffled(sources).slice(0, Math.min(3, sources.length))
        : sources.filter((source) => source.key === effectiveKey);

      try {
        const settled = await Promise.allSettled(
          targets.map((source) => randomCatalogItems(source, controller.signal, previousPages.current))
        );
        if (controller.signal.aborted) return;
        const allVideos = settled
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .filter((video) => !adultFilterEnabled || !isAdultContent(video));
        // Randomize cards independently of the upstream catalog's newest-first sort order.
        const unique = new Map();
        for (const video of shuffled(allVideos)) {
          const id = video.source + ":" + video.id;
          if (!unique.has(id)) unique.set(id, video);
        }
        const cards = [...unique.values()].slice(0, MAX_RESULTS);
        setItems(cards);
        if (cards.length === 0) {
          setError("当前源没有返回可展示的目录内容。可换一个源，或到设置页检测接口。");
        } else if (settled.some((result) => result.status === "rejected")) {
          setError("部分视频源连接失败，已展示成功获取的内容。");
        }
      } catch {
        if (!controller.signal.aborted) setError("无法加载目录，请稍后再试。");
      } finally {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setBusy(false);
      }
    }

    loadRandomVideos();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [sources, effectiveKey, shuffleCount, adultOnly, adultFilterEnabled]);

  if (adultOnly && adultFilterEnabled) {
    return (
      <section className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="font-bold text-lg text-gray-900">成人专区已隐藏</h2>
        <p className="text-sm text-gray-500 mt-2">如需显示此标签，请先前往设置关闭成人内容过滤。</p>
        <Link href="/settings" className="inline-block mt-3 text-primary font-medium">前往设置</Link>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 sm:p-6 md:p-8" aria-label={adultOnly ? "成人视频源随机浏览" : "API 视频源随机浏览"}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" aria-hidden="true" />
            {adultOnly ? "成人专区 · 随机发现" : "随机发现 · API 视频源"}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {adultOnly ? "从已启用的成人视频源随机选取目录内容。" : "选择已启用的 API，随机查看其中的影视条目。"}
          </p>
        </div>
        <Link href="/settings" className="text-sm text-gray-500 hover:text-primary self-start">管理视频源 →</Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 sm:flex-1">
          选择 API 源
          <select
            value={effectiveKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={sources.length === 0}
            className="min-h-11 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
            aria-label="随机浏览视频源"
          >
            <option value={ALL_SOURCES}>{adultOnly ? "全部已启用成人源（随机混合）" : "全部已启用视频源（随机混合）"}</option>
            {sources.map((source) => (
              <option key={source.id} value={source.key}>{source.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShuffleCount((count) => count + 1)}
          disabled={busy || sources.length === 0}
          className="min-h-11 rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 font-semibold text-gray-900 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {busy ? "正在加载…" : "↻ 换一批"}
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {adultOnly ? "暂无已启用的成人源。请到设置 → 视频源管理，启用你想浏览的成人源。" : "当前没有已启用的视频源，请先到设置页启用来源。"}
        </p>
      ) : (
        <>
          <div aria-live="polite">
            {error && <p role="status" className="text-sm text-amber-700 mb-4">{error}</p>}
          </div>
          {busy ? (
            <div aria-label="随机内容加载中" aria-busy="true" className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:gap-6">
              {Array.from({ length: 12 }, (_, index) => <SkeletonCard key={index} />)}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:gap-6">
              {items.map((video) => (
                <MovieCard key={video.source + ":" + video.id} movie={video} showSpeedTest={false} />
              ))}
            </div>
          ) : !error ? (
            <p className="text-sm text-gray-500 py-8 text-center">请选择视频源开始浏览。</p>
          ) : null}
          <p className="text-xs text-gray-400 mt-5">内容由第三方 API 提供。目录可用不代表视频链接可播放；随机抽取不会修改你的原始视频源配置。</p>
        </>
      )}
    </section>
  );
}
