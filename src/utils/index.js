// import fetch from 'node-fetch';
import YAML from 'yaml';
export const backimg = base64DecodeUtf8('aHR0cHM6Ly90LmFsY3kuY2MveWN5');
export const subapi = base64DecodeUtf8('aHR0cHM6Ly9zdWItc3RvcnQtbm9kZWpzLnBhZ2VzLmRldg==');
export const beiantext = base64DecodeUtf8('6JCMSUNQ5aSHMjAyNTAwMDHlj7c=');
export const beiandizi = base64DecodeUtf8('aHR0cHM6Ly90Lm1lL01hcmlzYV9rcmlzdGk=');
// 实现base64解码UTF-8字符串的函数
export function base64DecodeUtf8(str) {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}
// 订阅链接
export function buildApiUrl(rawUrl, BASE_API, ua) {
    const params = new URLSearchParams({
        target: ua,
        url: rawUrl,
    });
    return `${BASE_API}/sub?${params}`;
}
// 处理请求
export async function fetchResponse(url, userAgent) {
    if (!userAgent) {
        userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    }
    let response;
    try {
        response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent,
            },
        });
    } catch {
        return true;
    }
    const rawHeaders = Object.fromEntries(response.headers.entries());
    const hopByHopHeaders = ['transfer-encoding', 'content-length', 'content-encoding', 'connection'];
    const headers = {};
    for (const [key, value] of Object.entries(rawHeaders)) {
        if (!hopByHopHeaders.includes(key.toLowerCase())) {
            headers[key] = value;
        }
    }
    const textData = await response.text();
    let data;
    try {
        data = YAML.parse(textData, { maxAliasCount: -1, merge: true });
    } catch {
        try {
            data = JSON.parse(textData);
        } catch {
            data = textData;
        }
    }

    return {
        status: response.status,
        headers,
        data,
    };
}
// 将订阅链接和代理地址分离
export function splitUrlsAndProxies(urls) {
    const result = [];
    let proxyText = '';

    for (const url of urls) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            result.push(url);
        } else {
            if (proxyText) {
                proxyText += ',';
            }
            proxyText += url;
        }
    }
    if (proxyText) {
        result.push(proxyText);
    }
    return result;
}

/**
 * 获取应用包名列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchpackExtract() {
    const processNames = new Set();
    const excludeList = [
        { pkg: 'com.android.chrome', comment: 'Chrome浏览器' },
        { pkg: 'mark.via', comment: 'Via浏览器' },
        { pkg: 'com.baidu.browser.apps', comment: '百度浏览器' },
        { pkg: 'com.browser2345', comment: '2345浏览器' },
        { pkg: 'com.cat.readall', comment: '悟空浏览器' },
        { pkg: 'com.estrongs.android.pop', comment: 'ES文件浏览器' },
        { pkg: 'com.mmbox.xbrowser.pro', comment: 'X浏览器' },
        { pkg: 'com.mx.browser', comment: '傲游浏览器' },
        { pkg: 'com.oupeng.browser', comment: '欧朋浏览器极速版' },
        { pkg: 'com.oupeng.mini.android', comment: '欧朋浏览器' },
        { pkg: 'com.qihoo.browser', comment: '360浏览器' },
        { pkg: 'com.tencent.mtt', comment: 'QQ浏览器' },
        { pkg: 'com.UCMobile', comment: 'UC浏览器' },
        { pkg: 'com.ucmobile.lite', comment: 'UC浏览器极速版' },
        { pkg: 'com.ume.browser', comment: '微米浏览器' },
        { pkg: 'com.vivo.browser', comment: 'vivo浏览器' },
        { pkg: 'org.mozilla.fennec_mylinux', comment: '蚂蚁浏览器' },
        { pkg: 'sogou.mobile.explorer', comment: '搜狗浏览器极速版' },
    ];

    const excludeNames = new Set(excludeList.map((i) => i.pkg));

    const urls = [
        'https://cdn.jsdelivr.net/gh/mnixry/direct-android-ruleset@rules/@Merged/GAME.mutated.yaml',
        'https://cdn.jsdelivr.net/gh/mnixry/direct-android-ruleset@rules/@Merged/APP.mutated.yaml',
    ];

    const results = await Promise.allSettled(urls.map((url) => fetchResponse(url)));
    for (const res of results) {
        if (!res?.data?.payload?.length) continue;
        for (const line of res.data.payload) {
            const match = line.match(/PROCESS-NAME\s*,\s*([^\s,]+)/);
            if (!match) continue;
            const name = match[1];
            if (excludeNames.has(name)) continue;
            processNames.add(name);
        }
    }
    return [...processNames];
}
/**
 * 获取IPCIDR列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchipExtract() {
    const url = 'https://cdn.jsdelivr.net/gh/Kwisma/clash-rules@release/cncidr.yaml';

    let res;
    try {
        res = await fetchResponse(url);
    } catch (err) {
        console.error(`❌ 请求异常: ${url}`, err);
        return null;
    }

    const payload = res?.data?.payload;

    if (!Array.isArray(payload) || payload.length === 0) {
        console.error(`❌ 请求失败或数据为空: ${url} - ${res?.status}`);
        return null;
    }

    return payload;
}

/**
 * 尝试使用原始URL请求，如果失败则使用构建的API URL进行请求
 * @param {string} url - 请求的URL
 * @param {Object} options - 请求选项，包括userAgent、sub、target等
 * @returns {Promise<Object>} - 返回请求结果对象
 */
export async function fetchWithFallback(url, options) {
    if (options.fallback) {
        let res = await fetchResponse(url, options.userAgent);
        if (options.target === 'mihomo') {
            if (res?.data?.proxies && Array.isArray(res.data.proxies) && res.data.proxies.length > 0) {
                return res;
            }
        }
        if (options.target === 'singbox') {
            if (res?.data?.outbounds && Array.isArray(res.data.outbounds)) {
                return res;
            }
        }
    }
    // 如果第一次请求失败，尝试使用构建的API URL
    const apiUrl = buildApiUrl(url, options.sub, options.target);
    return await fetchResponse(apiUrl, options.userAgent);
}

/**
 * 解析优选IP行：支持 ip:port#名称、sub://、URL、IPv6
 */
function parseCFIPLine(line) {
    const raw = line.trim();
    if (!raw) return null;

    // sub:// 协议 → 作为需要异步抓取的标记
    if (raw.toLowerCase().startsWith('sub://')) {
        return { type: 'sub', raw };
    }

    // URL 链接 → 标记为需要异步抓取
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return { type: 'url', raw };
    }

    // 提取 #备注
    const hashPos = raw.indexOf('#');
    const addrPart = hashPos !== -1 ? raw.substring(0, hashPos).trim() : raw;
    const namePart = hashPos !== -1 ? raw.substring(hashPos + 1).trim() : null;

    // IPv6: [::]:port
    if (addrPart.startsWith('[')) {
        const bracketEnd = addrPart.indexOf(']');
        if (bracketEnd === -1) return null;
        const ip = addrPart.substring(1, bracketEnd);
        const rest = addrPart.substring(bracketEnd + 1);
        let port = 443;
        if (rest.startsWith(':')) port = parseInt(rest.substring(1), 10);
        if (isNaN(port)) return null;
        return { type: 'direct', ip, port, name: namePart || `[${ip}]-${port}` };
    }

    // 检测是否包含 ://（LINK 内容，如 vless://）
    if (addrPart.includes('://')) {
        return { type: 'link', raw };
    }

    // 标准 IPv4: ip:port 或 ip
    const colonPos = addrPart.lastIndexOf(':');
    if (colonPos === -1) {
        return { type: 'direct', ip: addrPart, port: 443, name: namePart || addrPart };
    }
    const ip = addrPart.substring(0, colonPos);
    const port = parseInt(addrPart.substring(colonPos + 1), 10);
    if (isNaN(port)) return null;
    return { type: 'direct', ip, port, name: namePart || `${ip}-${port}` };
}

/**
 * 从文本行中提取直接 IP 条目（忽略 URL/sub 等需要异步处理的）
 */
function parseDirectIPs(text) {
    if (!text || typeof text !== 'string') return [];
    return text.split('\n').map(l => parseCFIPLine(l.trim())).filter(r => r && r.type === 'direct');
}

/**
 * 异步获取优选IP结果，支持 URL、sub:// 和内联文本
 */
export async function resolveCFIP(cfipText, userAgent, fetchOptions = {}) {
    if (!cfipText) return null;
    const lines = cfipText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const results = [];

    for (const line of lines) {
        const parsed = parseCFIPLine(line);

        if (!parsed) continue;

        if (parsed.type === 'direct') {
            results.push({ ip: parsed.ip, port: parsed.port, name: parsed.name });
            continue;
        }

        // 异步类型：需要 fetch 获取远程内容
        let fetchUrl = parsed.raw;
        if (parsed.type === 'sub') {
            // sub://host → https://host/sub?host=example.com...
            fetchUrl = fetchUrl.replace(/^sub:\/\//i, 'https://');
            // 添加必要参数
            const subUrl = new URL(fetchUrl);
            if (!subUrl.pathname || subUrl.pathname === '/') {
                subUrl.pathname = '/sub';
            }
            if (!subUrl.searchParams.has('host')) subUrl.searchParams.set('host', 'example.com');
            fetchUrl = subUrl.toString();
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), fetchOptions.timeout || 10000);
            const res = await fetch(fetchUrl, {
                headers: { 'User-Agent': userAgent || 'Mozilla/5.0' },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            let text = await res.text();

            // 尝试 base64 解码（订阅内容常用格式）
            const cleanText = text.replace(/\s/g, '');
            if (cleanText.length > 0 && cleanText.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(cleanText)) {
                try {
                    const bytes = Uint8Array.from(atob(cleanText), c => c.charCodeAt(0));
                    const decoded = new TextDecoder('utf-8').decode(bytes);
                    if (decoded.includes(':') || decoded.includes('#')) text = decoded;
                } catch { /* 不是 base64，保持原样 */ }
            }

            // 解析获取到的文本内容
            const fetchedResults = text.split('\n')
                .map(l => parseCFIPLine(l.trim()))
                .filter(r => r && r.type === 'direct')
                .map(r => ({ ip: r.ip, port: r.port, name: r.name }));
            results.push(...fetchedResults);
        } catch {
            continue; // 抓取出错时跳过该条目
        }
    }

    return results.length > 0 ? results : null;
}

export function parseCFIP(text) {
    // 兼容旧接口
    const direct = parseDirectIPs(text);
    return direct.length > 0 ? direct : null;
}

/**
 * 将优选IP结果应用到 mihomo proxies 数组
 * 保留原始节点的 type/uuid/cipher/tls 等协议参数，仅替换 server/port/name
 */
export function applyCFIPToProxies(proxies, cfipResults) {
    if (!cfipResults || !proxies?.length) return proxies;
    return cfipResults.map((r, i) => {
        const origin = proxies[i % proxies.length];
        return { ...origin, server: r.ip, port: r.port, name: r.name };
    });
}

/**
 * 将优选IP结果应用到 singbox outbounds 数组
 * singbox 使用 server/server_port/tag 字段
 */
export function applyCFIPToOutbounds(outbounds, cfipResults) {
    if (!cfipResults || !outbounds?.length) return outbounds;
    return cfipResults.map((r, i) => {
        const origin = outbounds[i % outbounds.length];
        return { ...origin, server: r.ip, server_port: r.port, tag: r.name };
    });
}
