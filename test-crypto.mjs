// Test script to verify the crypto implementation matches protozoa-cryptography
// Run with: node test-crypto.mjs

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function b64Encode(input) {
    const bytes = [];
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

function b64Decode(input) {
    const lookup = {};
    for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS[i]] = i;
    let padded = input;
    while (padded.length % 4 !== 0) padded += "=";
    padded = padded.replace(/-/g, "+").replace(/_/g, "/");
    try {
        const decoded = atob(padded);
        let result = "";
        for (let i = 0; i < decoded.length; i++) result += String.fromCharCode(decoded.charCodeAt(i));
        return result;
    } catch {
        // Manual fallback
        const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const stdLookup = {};
        for (let i = 0; i < STD.length; i++) stdLookup[STD[i]] = i;
        const result = [];
        let i = 0;
        while (i < padded.length) {
            const a = stdLookup[padded[i++]] ?? 0;
            const b = stdLookup[padded[i++]] ?? 0;
            const c = padded[i] === "=" ? 0 : (stdLookup[padded[i++]] ?? 0);
            const d = padded[i] === "=" ? 0 : (stdLookup[padded[i++]] ?? 0);
            result.push((a << 2) | (b >> 4));
            if (padded[i - 2] !== "=") result.push(((b & 0xF) << 4) | (c >> 2));
            if (padded[i - 1] !== "=") result.push(((c & 0x3) << 6) | d);
        }
        let str = "";
        for (let j = 0; j < result.length; j++) str += String.fromCharCode(result[j]);
        return str;
    }
}

function rc4(key, data) {
    const s = [];
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    const keyCodes = [];
    for (let i = 0; i < key.length; i++) keyCodes.push(key.charCodeAt(i));
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + keyCodes[i % keyCodes.length]) % 256;
        [s[i], s[j]] = [s[j], s[i]];
    }
    let ii = 0; j = 0;
    const res = [];
    for (let k = 0; k < data.length; k++) {
        ii = (ii + 1) % 256;
        j = (j + s[ii]) % 256;
        [s[ii], s[j]] = [s[j], s[ii]];
        const kk = s[(s[ii] + s[j]) % 256];
        res.push((data.charCodeAt(k) ^ kk) & 0xFF);
    }
    let out = "";
    for (let i = 0; i < res.length; i++) out += String.fromCharCode(res[i]);
    return out;
}

function reverseStr(s) { return s.split("").reverse().join(""); }

function charReplace(input, search, replace) {
    const map = {};
    for (let i = 0; i < search.length; i++) map[search[i]] = replace[i] || search[i];
    let out = "";
    for (let i = 0; i < input.length; i++) out += map[input[i]] || input[i];
    return out;
}

function animekaiEncrypt(input) {
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

function animekaiDecrypt(input) {
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
    return decodeURIComponent(k);
}

function megaupDecrypt(input) {
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
    try { return decodeURIComponent(m); } catch { return m; }
}

// --- Tests ---
let passed = 0, failed = 0;
function assert(cond, name) {
    if (cond) { console.log(`  PASS: ${name}`); passed++; }
    else { console.log(`  FAIL: ${name}`); failed++; }
}

console.log("=== RC4 Tests ===");
const rc4Result = rc4("key", "Plaintext");
const rc4Expected = "[\0UJû2<";
assert(rc4Result === rc4Expected, "RC4 encrypt matches Rust output");
assert(rc4("key", rc4("key", "Plaintext")) === "Plaintext", "RC4 decrypt (self-inverse)");

console.log("\n=== Base64 Tests ===");
assert(b64Encode("Hello, World!") === "SGVsbG8sIFdvcmxkIQ", "URL-safe base64 encode");
assert(b64Decode("SGVsbG8sIFdvcmxkIQ") === "Hello, World!", "URL-safe base64 decode");
assert(b64Decode(b64Encode("Test123!@#")) === "Test123!@#", "Base64 roundtrip special chars");
assert(b64Decode(b64Encode("a")) === "a", "Base64 roundtrip single char");
assert(b64Decode(b64Encode("ab")) === "ab", "Base64 roundtrip two chars");

console.log("\n=== AnimeKai Encrypt/Decrypt Roundtrip ===");
const testInputs = ["test123", "one-piece", "naruto-1234", "12345", "hello world"];
for (const input of testInputs) {
    const encrypted = animekaiEncrypt(input);
    const decrypted = animekaiDecrypt(encrypted);
    assert(decrypted === input, `Roundtrip: "${input}"`);
}

console.log("\n=== AnimeKai Decrypt Known Vector ===");
const knownEncrypted = "UVJNWkZQbWl0WnRfN0lVdUFXajFKYXE5enpCcTN6Nm9rcTc5UW1ta1JIeldoUnBjYkJFUmNHME9rSFBfVzZTSTY0VUpaZHFOcFo2dFVLV19lQ2lUWmVnVmwtWTNDS0kxeHlWcmxPbzV0UUo0ajVMeXJMclRyQTZiMURieHJBd1p5MmZOdl9KRGs0bzhWYVVyQ3VYeTZoeDc1T2ZKX2dUbzJOTE04a3JkTzJHSEtkZzVjWV9JR2xCblM4QjVYR1BkLThZSDY4cFloU0stWGM0ZElaNk5hRmN2QzBuRW9DQkU5WklISzN3b3dhSXVIOHVXWW5FamN2ZnNwZ3pFZG1INDN5TUg4VzdpNDV1UE5fQUptN2Z3YlYtdEZLbm83RmZ2SWtXNndmQ0JMZnJEamQ5NUFRamJvUTdySTBodlBJRzBocnJ5MnZ3aHAtLWFuSzd0ZUxmTDlMWkRwV0NuWlV2RlBLamw2UGdobk1iMGFDTkhzd0RFTk5va0J3bEN4YTFIMDM2Qm92RkN5UnBod19iaE1WZEZzQnJ2Mk9QcWlzTm9aZFFD";
try {
    const decrypted = animekaiDecrypt(knownEncrypted);
    console.log(`  Decrypted: ${decrypted.substring(0, 120)}...`);
    assert(decrypted.includes("megaup.cc"), "Contains megaup.cc URL");
    assert(decrypted.includes("skip"), "Contains skip data");
} catch (e) {
    console.log(`  FAIL: Known decrypt - ${e.message}`);
    failed++;
}

console.log("\n=== MegaUp Decrypt Known Vector ===");
const megaupEncrypted = "Z2kzaDYyWkdWRGdiM3oxaTJZSHM3c3lYamZwQ2dFeS1UQl9VYktIWVphWWJ4dFllTTRDbkdCcEk1MGIyWHpKbV85aHE0VGdSeUhoUklvYVZyYl9GYXBWRF9yaHd3NWN1cWw2M1B6LTl6clFSR2lOMVlxVXhVN2ZBelF0S0dQQUVxT3hnTFJhbTBwd01nTVE4MkpnVWZhSjZOVjBNMW93Wi1JY3R3LXRUUzB6NWtqd1lIdzE0dGY1Z1kzbUFTMDF2dFhjbzJtUjRRU3NhQTZmRGlTWGNwTWtrdWQxMU9ERjBtTmg0em15SDZiNWFjRE5xNjljUFVCbG9FMzhNX2NKR3E2ckFNSXQ4NGxiVHFpcGl4MTMzY0F1blA0RjZ4TUpnZzc5anpzRzg0VkJvVmpUZXlXNVVkREhDVi1Ud1IzZkI2cDY0U1F4ZGJGcGZMclhkQWdGT2dRUDIxV1ZSNFNVWnhwQzZ4cHB3cTQ5cGVEc1A3ak1MNXZ6aDhILXBfUi1LYTBtMnpyZC1PMjE0NkhzQkptVXdXUzhYaV9BOVUwUkZ6QlpUOTFYR2lXWVBIVWZLTHVfcFE3NENZZjRLQTZRUnYyVkx4VE5vX1Zhd3kwNTdabGdvYzhvNDBIdXRnbkZoY1RhYzdMdnRoRm92OUZ3WGZkTUlBcERCYXRXbVdONWoyUzBEYzBXejdMcE1HS2doemphTXp6dDFlQWpfNkpxeVJPb3ZGeThMeUFZeXZtYVlmR05ZMWZaWEh4VFNPQWhhZktPUjY3WWJkSnh1Y3NQXzRYRjktSGpuZEpPZ2YySVFxclJtUlNPcjdUQ2pGOU5MaS1ZZ0hTUmF4am9SQ1ljZ3BrTzljVnYyU0xfem5lVG91U3VnQUZVS0hvUnJTU3F2M3JsVjZjak9BVnZzZl9yNDZidXlyeTZWRW9rWTNmeDYzU1NCUy1BWmJxYVVTVVRnN2lQQlVhYlN5Zjk1d3k3VFBwaDY5U0dpb3BkRVdQU0NpZ2JWUUFRckt6bW5BUXJMS25iRU0zRmxCV0pTcVJaTWh1T0FVbEZ6dEtkeHl2N1RaVl9CUE93SkF5ckJVVS1GOWFhc0FwR2I2RXNONXVxUVRJOFY2YVNKLUVEQkl6S0hRa3pYemRfdmdFUGFZeWdaUS1pcWdTOVZhWUlzSURabEpqZEJFdGpkSHF4dURobFMtN3BPR1RPN3FxWlA2bUNuSkxSMzkwQmZMdlRxRlpLR2pIajU0VUZDQlNzbmRQdjFaUHlYR0o5Mktld1paTEJWQ2s0TE05VlR6M05YcmJOY2ZFejRsZlRjZ1hJcmlHc2NQelNxektWdkJ5NFdDM1F3VzlTWGRwSzZmcGxRUXRrZzB5UXJrTGpUbG1Lb1dDZkhBY1E0VEY2bl95MF9SczdJem02VnhPQnhqdVNiZVg2ekVkakNwU05YLTFLMDh6WS1hMHcwZWwyeFQtR3Nod3A5MGYyZG54bnh3c1RYRWpyQkpubDZkU21LbzdUdlVKWWUyRmNVYUJfd1p5QUpITUExRVJvZWMzdEg1aVc0U0FvbnF5NU9Sa2VySzJkYTBJUlR2QW54SGJNX1hjTkRzZXVsVlVlT2NVcmhNWkE5S0UzUkdhMUxrR1NUQ1FTMjdUSWdDaFZ4WTNnU1FMSDdoc2lKWGdZdERYaXhwQmtnNC0zVVlHdW5DaVFicHpWNlNUaDZHZEhYb19XMmRLaks4SUxjNC01am9MRVktR09USWdyZXFZd29VSThvUzBoaHdVVF9aWXBTVmp1MWV1MXZva1pQVk03NHE0WHdIN3FSRWM3VlhtSFRtRl85bTMxV1pyRXRyYTE1NHNaR082RWdZRkxNTnVvVDBDRnlQR0tFaE1sRHo4WGZHbFcteTNSLTZpQ0pwQUZsUTdRRnhOZ1VEcFN0RkRTX3RoSXB0Z0tjS0p4QVVYQ3hDaWx4MlItSFJ5RWVoRDQyVExnRTY5VDdGcHhiendPb3VabF95clFHS3JaaTdHeG9RRXJVVVI4V3pXOVE4OXd5Rk9nV000Zl9TMWc1eUs5VzNjWXh4SEJFX05IM3NsUkUyTUJyaTk1UG9jNUpmbExrMXBTb2NqdXp3OHdjMlhkUE5HQ3VMU19FYnp0emlGb2RTYy1OSDR3ektQTlFBUzZBNjVaN2pramllTTUxcmtsV244SGk5Q3pUMW1hZ1NMcEVuVVU1blpXNHpEZDZIN205bHBxTTVRU2xqSlcyZlNEamctS3JaMXp0cXhVNi1fRU80V3BKRTA3UkxScTd5WkIwdkw1TFdOaENwTDFIM0R5RDNwbWxhdm90dFpTSWRpWHFVVG13aXRyanllNHRNeXZLdmNDVlQtX3YxOUlOaVdEcW42UHo5aWR4QTlHT0RuYlFyRmh4blppaXVDc0ZYYVdndU9EZ0dXbW5pRHluR0FRTGFlVWRxTVAySG5YTlN0TTFyUmNzSENJV25oSWhNMVpxLTVraEVVZHRnMEFLS3libkNpc01KZUd5NWJlMkRuMktTdXlxenN4WG90bEE5MTNHcE1SQmRrX3ZOaWIwcUNKMlR5NVRCT3dTSG1nNFRJbTBrSVBmV19LSGJJX3R2ZHJBVV9FTmtkS1ZxdU9SNUhMankxNFNJQUstN01LSDlid3ZGT0x3VDlvdmRhUWJrZk94Snd5MnJhYXlSbG0wdWtFUF85WkVRMFBxMVpFbmYwMkZ1ZXhuM0FPalB4Wg";
try {
    const decrypted = megaupDecrypt(megaupEncrypted);
    console.log(`  Decrypted (first 200 chars): ${decrypted.substring(0, 200)}`);
    assert(typeof decrypted === "string" && decrypted.length > 0, "MegaUp decrypt produces output");
} catch (e) {
    console.log(`  FAIL: MegaUp decrypt - ${e.message}`);
    failed++;
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);