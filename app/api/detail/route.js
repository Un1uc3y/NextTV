import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getDetailData = unstable_cache(
  async (url) => {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  },
  ["detail-api"],
  {
    revalidate: 3600,
    tags: ["detail"],
  }
);
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiUrl = searchParams.get("apiUrl");

    if (!apiUrl) {
      return NextResponse.json({ error: "缺少 apiUrl 参数" }, { status: 400 });
    }

    // Explicit user refresh bypasses the one-hour catalog cache.
    const refresh = searchParams.get("refresh") === "1";
    let data;
    if (refresh) {
      const response = await fetch(apiUrl, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      data = await response.json();
    } else {
      data = await getDetailData(apiUrl);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("详情 API 代理错误:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}
