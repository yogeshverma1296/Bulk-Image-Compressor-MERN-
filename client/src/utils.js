export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function savedPercent(original, compressed) {
  if (!original) return 0;
  return Math.max(0, Math.round((1 - compressed / original) * 100));
}
