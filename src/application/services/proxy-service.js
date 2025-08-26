const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');

class ProxyService {
    constructor() {
        this.proxyCache = new Map();
    }

    createHttpProxy() {
        return createProxyMiddleware({
            target: '', // Será definido dinamicamente
            changeOrigin: true,
            router: (req) => {
                // Extrai a URL original dos parâmetros
                const targetUrl = req.query.url;
                if (!targetUrl) {
                    throw new Error('Missing target URL');
                }

                // Valida se é HTTP (não HTTPS)
                if (!targetUrl.startsWith('http://')) {
                    throw new Error('Proxy only supports HTTP URLs');
                }

                // Remove o protocolo e retorna apenas o host
                const urlObj = new URL(targetUrl);
                return `http://${urlObj.host}`;
            },
            pathRewrite: (path, req) => {
                const targetUrl = req.query.url;
                const urlObj = new URL(targetUrl);
                return urlObj.pathname + urlObj.search;
            },
            onProxyReq: (proxyReq, req, res) => {
                // Remove headers que podem causar problemas
                proxyReq.removeHeader('referer');
                proxyReq.removeHeader('origin');
                
                // Adiciona headers para evitar cache excessivo
                proxyReq.setHeader('cache-control', 'no-cache');
            },
            onProxyRes: (proxyRes, req, res) => {
                // Adiciona headers CORS
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
                proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
                proxyRes.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type';
                
                // Remove headers que podem vazar informações
                delete proxyRes.headers['server'];
                delete proxyRes.headers['x-powered-by'];
            },
            onError: (err, req, res) => {
                console.error('Proxy error:', err);
                res.status(500).json({
                    success: false,
                    message: 'Proxy error occurred',
                    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
                });
            }
        });
    }

    async validateProxyUrl(url) {
        if (!url.startsWith('http://')) {
            throw new Error('Only HTTP URLs can be proxied');
        }

        try {
            const response = await axios.head(url, {
                timeout: 5000,
                maxRedirects: 3
            });

            const contentType = response.headers['content-type'] || '';
            const contentLength = response.headers['content-length'];

            // Verifica se é um tipo de conteúdo suportado
            const supportedTypes = [
                'video/',
                'audio/',
                'application/octet-stream'
            ];

            const isSupported = supportedTypes.some(type => 
                contentType.startsWith(type)
            );

            if (!isSupported) {
                throw new Error('Unsupported content type for proxying');
            }

            return {
                isValid: true,
                contentType,
                contentLength: contentLength ? parseInt(contentLength) : null,
                supportsRangeRequests: response.headers['accept-ranges'] === 'bytes'
            };
        } catch (error) {
            throw new Error(`Cannot validate proxy URL: ${error.message}`);
        }
    }

    generateProxyUrl(originalUrl, baseUrl) {
        const encodedUrl = encodeURIComponent(originalUrl);
        return `${baseUrl}/api/v1/streaming/proxy?url=${encodedUrl}`;
    }
}

module.exports = ProxyService;