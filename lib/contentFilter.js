// A preference-based content filter, not a parental-control or security boundary.
const ADULT_CATEGORY_PATTERN = /成人|情色|伦理|福利|限制级|三級|三级|色情|无码|有码/i;

export function isAdultCategory(category) {
  if (!category) return false;
  const label = typeof category === "string" ? category : category.type_name || category.name || "";
  return ADULT_CATEGORY_PATTERN.test(label);
}

export function isAdultContent(video) {
  return isAdultCategory(video?.type_name) || isAdultCategory(video?.vod_class) || isAdultCategory(video?.genre) || isAdultCategory(video?.class);
}

export function getEnabledVideoSources(sources, adultFilterEnabled = true) {
  return (Array.isArray(sources) ? sources : []).filter((source) => source.enabled && (!adultFilterEnabled || !source.adult));
}
