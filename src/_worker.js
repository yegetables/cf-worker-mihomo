import { buildConfig } from './utils/env.js';
import { handleRequest } from './utils/handler.js';

export default {
    async fetch(request, env) {
        // 先尝试从 Assets 读取模板文件
        if (env.ASSETS) {
            try {
                const asset = await env.ASSETS.fetch(request);
                if (asset.status === 200) {
                    return asset;
                }
            } catch {
                // 没有匹配的资产，继续走转换逻辑
            }
        }

        const e = buildConfig(request, env, false);
        try {
            const result = await handleRequest(e);

            return new Response(result.body, {
                status: result.status,
                headers: result.headers,
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            });
        }
    },
};
