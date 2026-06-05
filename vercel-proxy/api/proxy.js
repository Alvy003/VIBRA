export default async function handler(req, res) {
  // ─── CORS Headers ───
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Range, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Only GET and HEAD requests are supported.' });
  }

  // Extract URL parameter
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing required query parameter "url".' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    // ─── Whitelist Validation ───
    const allowedDomains = ['jiosaavn.com', 'saavn.com', 'saavncdn.com'];
    const isAllowedDomain = allowedDomains.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Domain not whitelisted. Access restricted to JioSaavn content.'
      });
    }

    // ─── SSRF Protection (Block Localhost, Private, and Link-Local IPs) ───
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]';
    const isPrivateIp = hostname.startsWith('10.') || 
                        hostname.startsWith('192.168.') || 
                        (hostname.startsWith('172.') && (() => {
                          const parts = hostname.split('.');
                          if (parts.length < 2) return false;
                          const secondOctet = parseInt(parts[1], 10);
                          return secondOctet >= 16 && secondOctet <= 31;
                        })()) ||
                        hostname.startsWith('169.254.'); // Link-local

    if (isLocalhost || isPrivateIp) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid target URL destination (SSRF protection).'
      });
    }

    // ─── Header Construction ───
    const headers = {
      'Accept': req.headers['accept'] || 'application/json, text/plain, */*',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
      'Referer': req.headers['referer'] || 'https://www.jiosaavn.com/',
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    };

    if (req.headers['origin']) {
      headers['Origin'] = req.headers['origin'];
    }

    // ─── Timeout Management ───
    // Vercel Hobby plan has a strict 10s timeout. We abort at 8.5s to return a clean error response.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);

    // ─── Outbound Request ───
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Forward status code
    res.status(response.status);

    // Forward content type
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    // Forward headers from JioSaavn that might be important (like Cache-Control or content-range)
    const forwardHeaders = ['cache-control', 'content-range', 'accept-ranges'];
    for (const headerName of forwardHeaders) {
      const headerVal = response.headers.get(headerName);
      if (headerVal) {
        res.setHeader(headerName, headerVal);
      }
    }

    // Return raw response text
    const text = await response.text();
    return res.send(text);

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The outbound request to JioSaavn exceeded the safe execution limit (8.5s).'
      });
    }
    console.error('[Proxy Error]:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
}
