/// <reference path="./online-streaming-provider.d.ts" />
/// <reference path="./core.d.ts"/>

// ============================================================
// AnimeKai Streaming Provider - Self-Contained v2.0
// Implements encryption/decryption natively (from protozoa-cryptography)
// No dependency on enc-dec.app
// ============================================================

// --- Base64 URL-safe no-pad ---

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function b64Encode(input: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) bytes.push(input.charCodeAt(i) & 0xFF);
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
        const bits = (a << 16) | (b << 8) | c;
        out += B64_CHARS[(bits >> 18) & 0x3F];
        out += B64_CHARS[(bits >> 12) & 0x3F];
        if (i + 1 < bytes.length) out += B64_CHARS[(bits >> 6) & 0x3F];
        if (i + 2 < bytes.length) out += B64_CHARS[bits & 0x3F];
    }
    return out;
}

function b64Decode(input: string): string {
    const lookup: Record<string, number> = {};
    for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS[i]] = i;
    const result: number[] = [];
    let i = 0;
    while (i < input.length) {
        const a = lookup[input[i++]] ?? 0;
        const b = lookup[input[i++]] ?? 0;
        const c = i < input.length ? (lookup[input[i++]] ?? 0) : 0;
        const d = i < input.length ? (lookup[input[i++]] ?? 0) : 0;
        result.push((a << 2) | (b >> 4));
        if (i - 2 < input.length) result.push(((b & 0xF) << 4) | (c >> 2));
        if (i - 1 < input.length) result.push(((c & 0x3) << 6) | d);
    }
    let str = "";
    for (let j = 0; j < result.length; j++) str += String.fromCharCode(result[j]);
    return str;
}

// --- RC4 cipher (UTF-16 code unit mode, matches protozoa-cryptography) ---

function rc4(key: string, data: string): string {
    const s: number[] = [];
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    const keyCodes: number[] = [];
    for (let i = 0; i < key.length; i++) keyCodes.push(key.charCodeAt(i));
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + keyCodes[i % keyCodes.length]) % 256;
        const tmp = s[i]; s[i] = s[j]; s[j] = tmp;
    }
    let ii = 0; j = 0;
    const res: number[] = [];
    for (let k = 0; k < data.length; k++) {
        ii = (ii + 1) % 256;
        j = (j + s[ii]) % 256;
        const tmp = s[ii]; s[ii] = s[j]; s[j] = tmp;
        const kk = s[(s[ii] + s[j]) % 256];
        res.push((data.charCodeAt(k) ^ kk) & 0xFF);
    }
    let out = "";
    for (let i = 0; i < res.length; i++) out += String.fromCharCode(res[i]);
    return out;
}

// --- Helpers ---

function reverseStr(s: string): string {
    return s.split("").reverse().join("");
}

function charReplace(input: string, search: string, replace: string): string {
    const map: Record<string, string> = {};
    for (let i = 0; i < search.length; i++) map[search[i]] = replace[i] || search[i];
    let out = "";
    for (let i = 0; i < input.length; i++) out += map[input[i]] || input[i];
    return out;
}

function safeUrlDecode(s: string): string {
    try { return decodeURIComponent(s); } catch { return s; }
}

// --- AnimeKai encrypt (replaces enc-dec.app /api/enc-kai) ---

function animekaiEncrypt(input: string): string {
    const text = encodeURIComponent(input);
    const a = rc4("0DU8ksIVlFcia2", text);
    const b = b64Encode(a);
    const c = reverseStr(b);
    const d = charReplace(c, "1wctXeHqb2", "1tecHq2Xbw");
    const e = charReplace(d, "48KbrZx1ml", "Km8Zb4lxr1");
    const f = rc4("kOCJnByYmfI", e);
    const g = b64Encode(f);
    const h = rc4("sXmH96C4vhRrgi8", g);
    const i = b64Encode(h);
    const j = charReplace(i, "hTn79AMjduR5", "djn5uT7AMR9h");
    return b64Encode(j);
}

// --- AnimeKai decrypt (replaces enc-dec.app /api/dec-kai) ---

function animekaiDecrypt(input: string): string {
    const a = b64Decode(input);
    const b = charReplace(a, "djn5uT7AMR9h", "hTn79AMjduR5");
    const c = b64Decode(b);
    const d = rc4("sXmH96C4vhRrgi8", c);
    const e = b64Decode(d);
    const f = rc4("kOCJnByYmfI", e);
    const g = charReplace(f, "Km8Zb4lxr1", "48KbrZx1ml");
    const h = charReplace(g, "1tecHq2Xbw", "1wctXeHqb2");
    const i = reverseStr(h);
    const j = b64Decode(i);
    const k = rc4("0DU8ksIVlFcia2", j);
    return safeUrlDecode(k);
}

// --- MegaUp decrypt (replaces enc-dec.app /api/dec-mega) ---

function megaupDecrypt(input: string): string {
    const a = b64Decode(input);
    const b = reverseStr(a);
    const c = charReplace(b, "OdilCbZWmrtUeYg", "YirdmeZblOtgCWU");
    const d = b64Decode(c);
    const e = rc4("HCcYA9gQqxUD", d);
    const f = charReplace(e, "K9lQq2SsnjkObe", "l9j2sSnekQOqKb");
    const g = reverseStr(f);
    const h = b64Decode(g);
    const i = rc4("ENZqBfw54cgsJ", h);
    const j = b64Decode(i);
    const k = reverseStr(j);
    const l = rc4("XvxVdt4eTSnCyG", k);
    const m = charReplace(l, "nMW7qCTpe6SQhco", "nqce7WMQC6pSTho");
    return safeUrlDecode(m);
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
            const response = await fetch(url, {
                method: "GET",
                headers: headers,
            });
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

// --- Provider ---

interface GenericResponse {
    status: number | string;
    result: string;
}

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
        const url = `${this.api}/browser?keyword=${encodeURIComponent(normalizedQuery)}`;

        const data = await fetchWithRetry(url).then(r => r.text());
        const $ = LoadDoc(data);
        const animes: SearchResult[] = [];

        $("div.aitem-wrapper>div.aitem").each((_, elem) => {
            const id = elem.find("a.poster").attr("href")?.slice(1) ?? "";
            const title = elem.find("a.title").attr("title") ?? "";
            const subOrDub: SubOrDub = this.isSubOrDubOrBoth(elem);
            const animeUrl = `${this.api}/${id}`;

            animes.push({
                id: `${id}?dub=${query["dub"]}`,
                url: animeUrl,
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

        const token = animekaiEncrypt(aniId);
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
                const epToken = animekaiEncrypt(item.data);
                const dubPart = id.split("?dub=")[1];
                // FIX: &dub= instead of ?dub= (original plugin had this bug)
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
                const encId = animekaiEncrypt(entry.id);
                const viewUrl = `${this.api}/ajax/links/view?id=${entry.id}&_=${encId}`;
                const viewResp: GenericResponse = await fetchWithRetry(viewUrl, 1, 500, { "Referer": `${this.api}/` }).then(r => r.json());
                if (viewResp.result) {
                    const decrypted = animekaiDecrypt(viewResp.result);
                    const parsed = JSON.parse(decrypted) as { url: string };
                    decryptedUrls[entry.type] = parsed.url;
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

        const decryptedMega = megaupDecrypt(encryptedResult);
        const parsed = JSON.parse(decryptedMega);
        const sources = parsed?.sources || parsed?.result?.sources || [];
        const tracks = parsed?.tracks || parsed?.result?.tracks || [];

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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
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