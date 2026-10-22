"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MovieCard } from "@/components/MovieCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useSettingsStore } from "@/store/useSettingsStore";
import { isAdultContent, isAdultSource } from "@/lib/contentFilter";
import { latestFirst, loadCatalog, shuffleItems, similarityScore, toProviderMovies } from "@/lib/catalogFeed";

const MODES = [
  { key: "related", label: "相关" },
  { key: "latest", label: "最新" },
  { key: "popular", label: "热度" },
];
const LIMIT = 12;
const MAX_PAGE = 5000;

function relatedCategory(categories, video) {
  const current = String(video?.type_name || "").trim();
  if (!current || !Array.isArray(categories)) return null;
  const match = categories.find((category) => String(category.type_name || "").trim() === current);
  return match?.type_id ?? null;
}

function getAnotherPage(pageCount, visited) {
  const max = Math.max(1, Math.min(MAX_PAGE, Number(pageCount) || 1));
  if (max <= 1) return 1;
  let page = Math.floor(Math.random() * max) + 1;
  if (visited.has(page)) page = (page % max) + 1;
  visited.add(page);
  return page;
}

export function PlayerRecommendations({ videoDetail, sourceKey }) {
  const videoSources = useSettingsStore((state) => state.videoSources);
  const adultFilterEnabled = useSettingsStore((state) => state.adultFilterEnabled);
  const [mode, setMode] = useState("related");
  const [batch, setBatch] = useState(0);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [supportsPopularity, setSupportsPopularity] = useState(null);
  const sampledPages = useRef(new Set([1]));

  const source = useMemo(
    () => videoSources.find((entry) => entry.key === sourceKey && entry.enabled),
    [videoSources, sourceKey],
  );
  const permitted = Boolean(source && (!adultFilterEnabled || !isAdultSource(source)));

  useEffect(() => {
    if (!permitted || !source?.url || !videoDetail?.id) {
      setCards([]);
      setLoading(false);
      setMessage("");
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      setLoading(false);
      setMessage("相关推荐请求超时，请稍后再试。");
    }, 17000);

    async function load() {
      setCards([]);
      setLoading(true);
      setMessage("");
      setSupportsPopularity(null);
      try {
        const first = await loadCatalog(source.url, {
          page: 1,
          signal: controller.signal,
          refresh: batch > 0 && mode === "latest",
        });
        if (controller.signal.aborted) return;
        let collected = toProviderMovies(first.list, source, adultFilterEnabled);
        const visited = sampledPages.current;
        const selectedCategory = mode === "related" ? relatedCategory(first.class, videoDetail) : null;

        // Related items: prioritize the same classification, with a fallback to
        // source-level suggestions when the provider has no matching category ID.
        if (mode === "related" && selectedCategory !== null) {
          const categorized = await loadCatalog(source.url, {
            page: 1, categoryId: selectedCategory, signal: controller.signal,
          });
          collected = toProviderMovies(categorized.list, source, adultFilterEnabled);
          if (Number(categorized.pagecount) > 1) {
            const page = getAnotherPage(categorized.pagecount, visited);
            if (page > 1) {
              const extra = await loadCatalog(source.url, { page, categoryId: selectedCategory, signal: controller.signal });
              collected.push(...toProviderMovies(extra.list, source, adultFilterEnabled));
            }
          }
        } else if (mode !== "latest" && Number(first.pagecount) > 1) {
          const possible = Math.min(2, Number(first.pagecount) - 1);
          const pages = [];
          for (let i = 0; i < possible; i++) {
            const page = getAnotherPage(first.pagecount, visited);
            if (page > 1 && !pages.includes(page)) pages.push(page);
          }
          const extras = await Promise.allSettled(pages.map((page) =>
            loadCatalog(source.url, { page, signal: controller.signal })
          ));
          for (const result of extras) {
            if (result.status === "fulfilled") collected.push(...toProviderMovies(result.value.list, source, adultFilterEnabled));
          }
        }
        if (controller.signal.aborted) return;
        const distinct = new Map();
        for (const item of collected) {
          if (String(item.id) === String(videoDetail.id)) continue;
          if (adultFilterEnabled && isAdultContent(item)) continue;
          if (!distinct.has(item.id)) distinct.set(item.id, item);
        }
        let suggestions = [...distinct.values()];
        if (mode === "related") {
          suggestions = shuffleItems(suggestions).sort(
            (a, b) => similarityScore(b, videoDetail) - similarityScore(a, videoDetail)
          );
        } else if (mode === "latest") {
          suggestions = latestFirst(suggestions);
        } else {
          const hasRealHits = suggestions.some((item) => item.hits !== null);
          setSupportsPopularity(hasRealHits);
          if (hasRealHits) {
            suggestions = suggestions.sort((a, b) => (b.hits ?? -1) - (a.hits ?? -1));
          } else {
            suggestions = shuffleItems(suggestions);
            setMessage("这个 API 没有提供可用的播放量统计，以下仅为同源推荐，并非热度榜。");
          }
        }
        setCards(suggestions.slice(0, LIMIT));
        if (!suggestions.length) setMessage("这个视频源暂时没有其他可用条目，可以换一个来源浏览。");
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error?.message || "推荐内容加载失败");
      } finally {
        clearTimeout(timer);
        if (!controller.signal.aborted && !timedOut) setLoading(false);
      }
    }

    load();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [
    adultFilterEnabled, permitted, source?.url, source?.key,
    videoDetail?.id, videoDetail?.type_name, videoDetail?.genre,
    videoDetail?.year, mode, batch,
  ]);

  function changeMode(next) {
    sampledPages.current = new Set([1]);
    setMode(next);
    setBatch(0);
  }

  if (!permitted) {
    return (
      <section className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-7">
        <h2 className="text-xl font-bold text-gray-900">相关视频 · 更多推荐</h2>
        <p className="mt-2 text-sm text-gray-500">
          当前来源未启用，或已被成人内容过滤隐藏。可以在设置中调整视频源后查看推荐。
        </p>
        <Link href="/settings" className="inline-block mt-3 text-primary text-sm font-medium">管理来源 →</Link>
      </section>
    );
  }

  return (
    <section aria-label="相关推荐" className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" /> 相关视频 · 更多推荐
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            基于当前来源“{source.name}”的分类、题材及目录数据推荐。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1" role="group" aria-label="推荐排序">
            {MODES.map((option) => (
              <button key={option.key} type="button" onClick={() => changeMode(option.key)}
                aria-pressed={mode === option.key}
                className={"rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (mode === option.key ? "bg-primary text-gray-900" : "text-gray-600 hover:bg-gray-200")}>
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={loading}
            onClick={() => setBatch((value) => value + 1)}
            className="min-h-10 rounded-xl px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm font-medium">
            {loading ? "加载中…" : mode === "latest" ? "↻ 刷新" : "↻ 换一批"}
          </button>
        </div>
      </div>

      {message && <p role="status" className="text-sm text-amber-700 mb-4">{message}</p>}
      {mode === "popular" && supportsPopularity === true &&
        <p className="text-xs text-gray-500 mb-3">热度使用此视频源提供的播放量字段，不代表全网排行榜。</p>}
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-4" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-4">
          {cards.map((item) => <MovieCard key={item.source + ":" + item.id} movie={item} showSpeedTest={false} />)}
        </div>
      ) : !message ? <p className="text-sm text-gray-500 py-8">暂无推荐视频。</p> : null}
      <p className="mt-5 text-xs text-gray-400">推荐内容依赖第三方目录；不保证视频可播放，且同源数据未必包含准确的观看热度。</p>
    </section>
  );
}
