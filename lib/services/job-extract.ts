function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
  )
    .replace(/\n +/g, "\n")
    .replace(/ +\n/g, "\n")
    .trim();
}

function extractJsonDescription(html: string) {
  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const blocks = Array.isArray(parsed) ? parsed : [parsed];

      for (const block of blocks) {
        const description =
          typeof block?.description === "string"
            ? block.description
            : typeof block?.hiringOrganization?.description === "string"
              ? block.hiringOrganization.description
              : null;

        if (description) {
          return stripHtml(description);
        }
      }
    } catch {
      continue;
    }
  }

  return "";
}

function extractMainContent(html: string) {
  const mainLikeMatch =
    html.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i) ??
    html.match(/<div[^>]+class=["'][^"']*(job|description|content|details)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (!mainLikeMatch) {
    return "";
  }

  return stripHtml(mainLikeMatch[2] ?? mainLikeMatch[1] ?? "");
}

export async function extractJobDescriptionFromUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Could not fetch the job page (${response.status}).`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtmlEntities((titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim());

  const fromJson = extractJsonDescription(html);
  const fromMain = extractMainContent(html);
  const fromBody = stripHtml(html).slice(0, 16000);

  const description = [fromJson, fromMain, fromBody]
    .find((value) => value && value.length > 200)
    ?.slice(0, 16000)
    .trim();

  if (!description) {
    throw new Error("Could not extract a usable job description from that URL.");
  }

  return {
    title: title || "Job Description",
    description
  };
}
