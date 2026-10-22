export const ItemTypes = {
  MOVIE: "movie",
  TV: "tv",
};

// Imported from the owner's supplied LibreTV source list (deduplicated).
// verifiedList means the catalog endpoint returned JSON entries during an external check;
// it does NOT guarantee playable links or legal availability. Unknowns default disabled.
// Adult providers remain hidden while adultFilterEnabled is true.
export const DEFAULT_VIDEO_SOURCES = [
  { id: "1", key: "rycj", name: "如意资源", url: "https://cj.rycjapi.com/api.php/provide/vod", enabled: true, adult: false, type: "video" },
  { id: "2", key: "wwdj", name: "旺旺短剧", url: "https://api.wwzy.tv/api.php/provide/vod", enabled: true, adult: false, type: "video" },
  { id: "builtin-dyttzy", key: "dyttzy", name: "电影天堂资源", url: "http://caiji.dyttzyapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-bfzy", key: "bfzy", name: "暴风资源", url: "https://bfzyapi.com/api.php/provide/vod", enabled: true, adult: false, verifiedList: true, type: "video" },
  { id: "builtin-tyyszy", key: "tyyszy", name: "天涯资源", url: "https://tyyszy.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-xiaomaomi", key: "xiaomaomi", name: "小猫咪资源", url: "https://zy.xmm.hk/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-ffzy", key: "ffzy", name: "非凡影视", url: "http://ffzy5.tv/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-heimuer", key: "heimuer", name: "黑木耳", url: "https://json.heimuer.xyz/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-zy360", key: "zy360", name: "360资源", url: "https://360zy.com/api.php/provide/vod", enabled: true, adult: false, verifiedList: true, type: "video" },
  { id: "builtin-iqiyi", key: "iqiyi", name: "iqiyi资源", url: "https://www.iqiyizyapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-wolong", key: "wolong", name: "卧龙资源", url: "https://wolongzyw.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-hwba", key: "hwba", name: "华为吧资源", url: "https://cjhwba.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-jisu", key: "jisu", name: "极速资源", url: "https://jszyapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-dbzy", key: "dbzy", name: "豆瓣资源", url: "https://dbzy.tv/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-mozhua", key: "mozhua", name: "魔爪资源", url: "https://mozhuazy.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-mdzy", key: "mdzy", name: "魔都资源", url: "https://www.mdzyapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-zuid", key: "zuid", name: "最大资源", url: "https://api.zuidapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-yinghua", key: "yinghua", name: "樱花资源", url: "https://m3u8.apiyhzy.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-baidu", key: "baidu", name: "百度云资源", url: "https://api.apibdzy.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-wujin", key: "wujin", name: "无尽资源", url: "https://api.wujinapi.me/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-ikun", key: "ikun", name: "iKun资源", url: "https://ikunzyapi.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-lzi", key: "lzi", name: "量子资源站", url: "https://cj.lziapi.com/api.php/provide/vod/", enabled: true, adult: false, verifiedList: true, type: "video" },
  { id: "builtin-ckzy", key: "ckzy", name: "CK资源", url: "https://ckzy.me/api.php/provide/vod/", enabled: true, adult: true, verifiedList: true, type: "video" },
  { id: "builtin-jkun", key: "jkun", name: "jkun资源", url: "https://jkunzyapi.com/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-bwzy", key: "bwzy", name: "百万资源", url: "https://api.bwzym3u8.com/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-souav", key: "souav", name: "souav资源", url: "https://api.souavzy.vip/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-r155", key: "r155", name: "155资源", url: "https://155api.com/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-lsb", key: "lsb", name: "lsb资源", url: "https://apilsbzy1.com/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-huangcang", key: "huangcang", name: "黄色仓库", url: "https://hsckzy.vip/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-yutu", key: "yutu", name: "玉兔资源", url: "https://yutuzy10.com/api.php/provide/vod", enabled: false, adult: true, verifiedList: false, type: "video" },
  { id: "builtin-subo", key: "subo", name: "速播资源", url: "https://subocaiji.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-fczy", key: "fczy", name: "蜂巢资源", url: "https://api.fczy888.me/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
  { id: "builtin-ukzy", key: "ukzy", name: "U酷资源", url: "https://api.ukuapi88.com/api.php/provide/vod", enabled: false, adult: false, verifiedList: false, type: "video" },
];

export const DEFAULT_DANMAKU_SOURCES = [];
