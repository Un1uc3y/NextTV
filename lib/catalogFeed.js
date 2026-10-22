/**
 * Shared catalog helpers for NextTV provider APIs.
 * API metadata is provider-supplied: upload dates/hit counts may be missing.
 */

export async function loadCatalog(sourceUrl, { page = 1, categoryId, signal, refresh = false } = {}) {
  const endpoint = new URL(sourceUrl);
  endpoint.searchParams.set("ac", "detail");
  endpoint.searchParams.set("pg", String(Math.max(1, Math.floor(page))));
  if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
    endpoint.searchParams.set("t", String(categoryId));
  }
  const params = new URLSearchParams({ apiUrl: endpoint.toString() });
  if (refresh) params.set("refresh", "1");
  const response = await fetch("/api/detail?" + params.toString(), { signal });
  if (!response.ok) throw new Error("API 请求失败（" + response.status + "）");
  const data = await response.json();
  if (!data || !Array.isArray(data.list)) throw new Error("API 没有返回可用的目录格式");
  return data;
}

function popularityValue(video) {
  const raw = video.vod_hits_all ?? video.vod_hits ?? video.vod_hits_day ?? video.vod_hits_week;
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function dateValue(video) {
  const raw = video.vod_time ?? video.vod_time_add ?? video.vod_addtime ?? video.vod_pubdate;
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number" || /^\d{10,13}$/.test(String(raw))) {
    const n = Number(raw);
    return n > 100000000000 ? n : n * 1000;
  }
  const parsed = Date.parse(String(raw).replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function providerToMovie(video, source) {
  const id = video?.vod_id;
  if (id === undefined || id === null || !String(video?.vod_name ?? "").trim()) return null;
  return {
    id: String(id),
    title: String(video.vod_name).trim(),
    poster: video.vod_pic || "",
    source: source.key,
    source_name: source.name,
    source_url: source.url,
    type_name: video.type_name || "",
    class: video.vod_class || "",
    year: String(video.vod_year || ""),
    rating: video.vod_score || "",
    hits: popularityValue(video),
    updatedAt: dateValue(video),
  };
}

export function toProviderMovies(rows, source, adultFilterEnabled) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).map((raw) => {
    const item = providerToMovie(raw, source);
    return { item, raw };
  }).filter(({ item, raw }) => {
    if (!item || (adultFilterEnabled && /\b(?:18\+)\b/i.test(item.title))) return false;
    // Use the same category exclusion as the search/source-browser pages.
    if (adultFilterEnabled) {
      const adult = /成人|情色|伦理|福利|限制级|三級|三级|色情|无码|有码/i;
      if (adult.test(String(raw.type_name || "") + " " + String(raw.vod_class || ""))) return false;
    }
    const key = item.source + ":" + item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ item }) => item);
}

export function latestFirst(items) {
  // Fall back to upstream ordering when no trustworthy update time was supplied.
  return [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const pick = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]];
  }
  return shuffled;
}

export function similarityScore(movie, current) {
  let score = 0;
  const movieType = String(movie.type_name || "").trim();
  const currentType = String(current.type_name || "").trim();
  if (movieType && currentType && movieType === currentType) score += 5;
  const tokens = String(current.genre || current.class || "")
    .split(/[,，、/\s]+/).map((value) => value.trim()).filter((value) => value.length > 1);
  const tagString = String(movie.class || "");
  for (const token of tokens) if (tagString.includes(token)) score += 3;
  if (movie.year && current.year && movie.year === String(current.year)) score += 1;
  return score;
}
