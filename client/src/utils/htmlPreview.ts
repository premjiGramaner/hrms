const imageToken = "[Image]";

export function htmlToPreview(value = "", maxLength = 140) {
  const withImageTokens = value.replace(/<img\b[^>]*>/gi, ` ${imageToken} `);
  const withoutDataUris = withImageTokens.replace(
    /data:image\/[a-zA-Z]+;base64,[^\s"'<>]+/g,
    imageToken,
  );
  const fallbackText = withoutDataUris
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const text = parseHtmlText(fallbackText).replace(/\s+/g, " ").trim();

  if (!text) return "-";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function parseHtmlText(value: string) {
  if (typeof DOMParser === "undefined") return value;
  return (
    new DOMParser().parseFromString(value, "text/html").body.textContent ||
    value
  );
}
