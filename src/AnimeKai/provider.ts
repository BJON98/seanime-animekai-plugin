/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts"/>

// ============================================================
// AnimeKai Streaming Provider v2.1
// Uses enc-dec.app for crypto (current algorithm) with retry
// Fixed domain, search, URL construction, error handling
// ============================================================

interface GenericResponse {
    status: number | string;
    result: string;
}

interface EncDecResponse {
    status: number;
    result: string;
}

const ENC_DEC_API = "https://enc-dec.app/api";

// --- HTTP ---

const DEFAULT_HEADERS: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "DNT": "1",
    "Cookie": "__ddg1_=;__ddg2_=;",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
};

async function fetchWithRetry(url: string, retries = 2, delay = 1000, extraHeaders?: Record<string, string>): Promise<Response> {
    const headers = Object.assign({}, DEFAULT_HEADERS, extraHeaders || {});
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { method: "GET", headers: headers });
            if (response.ok) return response;
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (e: any) {
            lastError = e;
        }
        if (attempt < retries && delay > 0) {
            $sleep(delay);
        }
    }
    throw lastError || new Error("Fetch failed after retries");
}

// --- enc-dec.app wrappers with retry ---

async function encKai(text: string): Promise<string> {
    const url = `${ENC_DEC_API}/enc-kai?text=${encodeURIComponent(text)}`;
    const resp = await fetchWithRetry(url, 2, 1000);
    const json: EncDecResponse = await resp.json();
    if (json.status !== 200 || !json.result) throw new Error("enc-kai failed");
    return json.result;
}

async function encKai(text: string): Promise<string> {
    const url = `${ENC_DEC_API}/enc-kai?text=${encodeURIComponent(text)}`;
    const resp = await fetchWithRetry(url, 2, 1000);
    const json: { status: number; result: string } = await resp.json();
    if (json.status !== 200 || !json.result) throw new Error("enc-kai failed");
    return json.result;
}

// dec-kai returns {status: 200, result: {url: "...", skip: {...}}}
async function decKai(text: string): Promise<{ url: string; skip?: { intro: [number, number]; outro: [number, number] } }> {
    const resp = await fetch(`${ENC_DEC_API}/dec-kai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
    });
    const json: { status: number; result: { url: string; skip?: { intro: [number, number]; outro: [number, number] } } } = await resp.json();
    if (json.status !== 200 || !json.result) throw new Error("dec-kai failed");
    return json.result;
}

// dec-mega returns {status: 200, result: {sources: [...], tracks: [...], download: "..."}}
async function decMega(text: string, agent: string): Promise<{ sources: { file: string }[]; tracks: { file: string; label: string; kind: string; default?: boolean }[]; download?: string }> {
    const resp = await fetch(`${ENC_DEC_API}/dec-mega`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, agent: agent }),
    });
    const json: { status: number; result: { sources: { file: string }[]; tracks: { file: string; label: string; kind: string; default?: boolean }[]; download?: string } } = await resp.json();
    if (json.status !== 200 || !json.result) throw new Error("dec-mega failed");
    return json.result;
}

// --- Utility ---

function cleanJsonHtml(jsonHtml: string): string {
    if (!jsonHtml) return "";
    return jsonHtml
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// --- Provider ---

class Provider {
    private api: string = "{{baseUrl}}";

    getSettings(): Settings {
        return {
            episodeServers: ["Server 1", "Server 2"],
            supportsDub: true,
        };
    }

    async search(query: SearchOptions): Promise<SearchResult[]> {
        const normalizedQuery = this.normalizeQuery(query["query"]);

        // Try AJAX search first (faster, returns JSON)
        try {
            const ajaxUrl = `${this.api}/ajax/anime/search?keyword=${encodeURIComponent(normalizedQuery)}`;
            const ajaxResp = await fetchWithRetry(ajaxUrl, 1, 500, { "X-Requested-With": "XMLHttpRequest" });
            const ajaxJson: { status: string; result: { html: string } } = await ajaxResp.json();
            if (ajaxJson.status === "ok" && ajaxJson.result?.html) {
                const $ = LoadDoc(ajaxJson.result.html);
                const animes: SearchResult[] = [];
                $("a.aitem").each((_, elem) => {
                    const href = elem.attr("href")?.slice(1) ?? "";
                    const title = elem.find("h6.title").attr("data-jp") || elem.find("h6.title").text() || "";
                    const subOrDub: SubOrDub = this.isSubOrDubOrBoth(elem);
                    animes.push({
                        id: `${href}?dub=${query["dub"]}`,
                        url: `${this.api}/${href}`,
                        title: title,
                        subOrDub: subOrDub,
                    });
                });
                return animes;
            }
        } catch (e: any) {
            console.error("AJAX search failed, falling back to HTML:", e);
        }

        // Fallback: HTML page scraping
        const url = `${this.api}/browser?keyword=${encodeURIComponent(normalizedQuery)}`;
        const data = await fetchWithRetry(url).then(r => r.text());
        const $ = LoadDoc(data);
        const animes: SearchResult[] = [];

        $("div.aitem-wrapper>div.aitem").each((_, elem) => {
            const id = elem.find("a.poster").attr("href")?.slice(1) ?? "";
            const title = elem.find("a.title").attr("title") ?? "";
            const subOrDub: SubOrDub = this.isSubOrDubOrBoth(elem);
            animes.push({
                id: `${id}?dub=${query["dub"]}`,
                url: `${this.api}/${id}`,
                title: title,
                subOrDub: subOrDub,
            });
        });

        return animes;
    }

    async findEpisodes(id: string): Promise<EpisodeDetails[]> {
        const slug = id.split("?dub")[0];
        const url = `${this.api}/${slug}`;

        const pageHtml = await fetchWithRetry(url).then(r => r.text());
        const idMatch = pageHtml.match(/<div class="rate-box"[^>]*data-id="([^"]+)"/);
        const aniId = idMatch ? idMatch[1] : null;
        if (!aniId) throw new Error("Anime ID not found in page");

        const token = await encKai(aniId);
        const episodesUrl = `${this.api}/ajax/episodes/list?ani_id=${aniId}&_=${token}`;

        const ajaxResult: GenericResponse = await fetchWithRetry(episodesUrl).then(r => r.json());
        const $ = LoadDoc(ajaxResult.result);

        const episodeData = $("ul.range>li>a").map((_, elem) => ({
            name: `Episode ${elem.attr("num")}`,
            number: parseInt(elem.attr("num")!, 10),
            data: elem.attr("token")!,
            title: elem.find("span").text().replace(/\s/g, " "),
        }));

        const episodes: EpisodeDetails[] = [];
        for (const item of episodeData) {
            try {
                const epToken = await encKai(item.data);
                const dubPart = id.split("?dub=")[1];
                episodes.push({
                    id: item.data ?? "",
                    number: item.number,
                    title: item.title,
                    url: `${this.api}/ajax/links/list?token=${item.data}&_=${epToken}&dub=${dubPart}`,
                });
            } catch (e: any) {
                console.error("Error processing episode:", e);
            }
        }

        return episodes;
    }

    async findEpisodeServer(
        episode: EpisodeDetails,
        _server: string
    ): Promise<EpisodeServer> {
        const server = _server !== "default" ? _server : "Server 1";
        const episodeUrl = episode.url.replace("&", "&").split("&dub")[0];
        const dubRequested = episode.url.split("&dub=")[1];

        const responseJson: GenericResponse = await fetchWithRetry(episodeUrl).then(r => r.json());

        if ((responseJson.status !== "ok" && responseJson.status !== 200) || !responseJson.result) {
            throw new Error(`Failed to fetch episode page: ${responseJson.status}`);
        }

        const cleanedHtml = cleanJsonHtml(responseJson.result);
        const subMatch = /<div class="server-items lang-group" data-id="sub"[^>]*>([\s\S]*?)<\/div>/.exec(cleanedHtml);
        const softsubMatch = /<div class="server-items lang-group" data-id="softsub"[^>]*>([\s\S]*?)<\/div>/.exec(cleanedHtml);
        const dubMatch = /<div class="server-items lang-group" data-id="dub"[^>]*>([\s\S]*?)<\/div>/.exec(cleanedHtml);

        const sub = subMatch ? subMatch[1].trim() : "";
        const softsub = softsubMatch ? softsubMatch[1].trim() : "";
        const dub = dubMatch ? dubMatch[1].trim() : "";

        const serverRegex = server === "Server 1"
            ? /<span class="server"[^>]*data-lid="([^"]+)"[^>]*>Server 1<\/span>/
            : /<span class="server"[^>]*data-lid="([^"]+)"[^>]*>Server 2<\/span>/;

        const serverIdSub = serverRegex.exec(sub)?.[1];
        const serverIdSoftsub = serverRegex.exec(softsub)?.[1];
        const serverIdDub = serverRegex.exec(dub)?.[1];

        const streamEntries: { type: string; id: string }[] = [];
        if (serverIdDub) streamEntries.push({ type: "Dub", id: serverIdDub });
        if (serverIdSoftsub) streamEntries.push({ type: "Softsub", id: serverIdSoftsub });
        if (serverIdSub) streamEntries.push({ type: "Sub", id: serverIdSub });

        const decryptedUrls: Record<string, string> = {};
        for (const entry of streamEntries) {
            try {
                const encId = await encKai(entry.id);
                const viewUrl = `${this.api}/ajax/links/view?id=${entry.id}&_=${encId}`;
                const viewResp: GenericResponse = await fetchWithRetry(viewUrl, 1, 500, { "Referer": `${this.api}/` }).then(r => r.json());
                if (viewResp.result) {
                    const decrypted = await decKai(viewResp.result);
                    decryptedUrls[entry.type] = decrypted.url;
                }
            } catch (e: any) {
                console.error(`Error fetching ${entry.type} stream:`, e);
            }
        }

        const streamUrl = dubRequested === "true"
            ? (decryptedUrls["Dub"] || decryptedUrls["Sub"] || decryptedUrls["Softsub"])
            : (decryptedUrls["Sub"] || decryptedUrls["Softsub"] || decryptedUrls["Dub"]);

        if (!streamUrl) throw new Error("Unable to find a valid source");

        const mediaUrl = streamUrl.replace("/e/", "/media/");
        const mediaHeaders: Record<string, string> = Object.assign({}, DEFAULT_HEADERS, {
            "Referer": `${this.api}/`,
        });

        const mediaResp = await fetch(mediaUrl, { headers: mediaHeaders });
        const mediaJson = await mediaResp.json();
        const encryptedResult = mediaJson?.result;

        if (!encryptedResult) throw new Error("No encrypted result from media endpoint");

        const megaResult = await decMega(encryptedResult, DEFAULT_HEADERS["User-Agent"]);
        const sources = megaResult.sources || [];
        const tracks = megaResult.tracks || [];

        if (!sources || sources.length === 0) throw new Error("No video sources found");

        const m3u8Link = sources[0].file;
        const playlistResp = await fetchWithRetry(m3u8Link, 1, 500, { "Referer": `${this.api}/` });
        const playlistText = await playlistResp.text();

        const regex = /#EXT-X-STREAM-INF:BANDWIDTH=\d+,RESOLUTION=(\d+x\d+)\s*(.*)/g;
        const videoSources: VideoSource[] = [];
        let resolutionMatch;

        while ((resolutionMatch = regex.exec(playlistText)) !== null) {
            let url = "";
            if (resolutionMatch[2].includes("list")) {
                url = `${m3u8Link.split(",")[0]}/${resolutionMatch[2]}`;
            } else {
                url = `${m3u8Link.split("/list")[0]}/${resolutionMatch[2]}`;
            }
            videoSources.push({
                quality: resolutionMatch[1].split("x")[1] + "p",
                subtitles: tracks.map((t: any) => ({
                    url: t.file,
                    lang: t.label || "Unknown",
                    type: t.kind || "subtitles",
                })),
                type: "m3u8",
                url: url,
            });
        }

        if (videoSources.length === 0) {
            videoSources.push({
                quality: "auto",
                subtitles: tracks.map((t: any) => ({
                    url: t.file,
                    lang: t.label || "Unknown",
                    type: t.kind || "subtitles",
                })),
                type: "m3u8",
                url: m3u8Link,
            });
        }

        return {
            server: server,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
            },
            videoSources: videoSources,
        };
    }

    normalizeQuery(query: string): string {
        return query
            .replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1")
            .replace(/\s+/g, " ")
            .replace(/(\d+)\s*Season/i, "$1")
            .replace(/Season\s*(\d+)/i, "$1")
            .trim();
    }

    isSubOrDubOrBoth(elem: DocSelection): SubOrDub {
        const hasSub = elem.find("span.sub").text() !== "";
        const hasDub = elem.find("span.dub").text() !== "";
        if (hasSub && hasDub) return "both";
        if (hasSub) return "sub";
        return "dub";
    }
}