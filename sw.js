const StatusType = {
    forbidden: { 'status': 403, 'statusText': 'forbidden' },
    ok: { 'status': 200, 'statusText': 'OK' }
}

const FontFamily = `-apple-system,'Noto Sans','Helvetica Neue',Helvetica,'Nimbus Sans L',Arial,'Liberation Sans','PingFang SC','Hiragino Sans GB','Noto Sans CJK SC','Source Han Sans SC','Source Han Sans CN','Microsoft YaHei','Wenquanyi Micro Hei','WenQuanYi Zen Hei','ST Heiti',SimHei,'WenQuanYi Zen Hei Sharp',sans-serif`;

const parseQuerys = (searchParams) => {
    let querys = {};
    for (const [key, value] of searchParams) {
        querys[key] = value;
    }
    return querys;
}

self.addEventListener('install', event => {
    const preCache = async () => {
        const cache = await caches.open("offline-cache");
        return cache.addAll([
            '/',
            '/index.html',
            '/favicon.ico',
            '/logo-144.png'
        ]);
    };
    event.waitUntil(preCache());
});

self.addEventListener('fetch', event => {
    if (event.request.method === 'GET') {
        const url = new URL(event.request.url);
        const pathname = url.pathname;
        const querys = parseQuerys(url.searchParams);

        if (/^\/(\d*)[*x](\d*)(?:.(svg|png|webp|jpeg|jpg))?$/.test(pathname)) {
            // 接口处理
            let { width, height, type = 'webp' } = pathname.match(/^\/(?<width>\d*)[*x](?<height>\d*)(?:.(?<type>svg|png|webp|jpeg|jpg))?$/).groups;

            if (!(width > 0 && height > 0)) {
                event.respondWith(new Response('You need to provide a verified size.', StatusType.forbidden));
                return;
            }

            let bgcolor = querys['bg'] ? querys['bg'] : 'cccccc';
            let fgcolor = querys['fg'] ? querys['fg'] : '666666';
            let text = querys['text'] ? querys['text'] : `${width}x${height}`;
            if (type === 'jpg') type = 'jpeg';
            fetch('https://api.daidr.me/apis/imgholder/1*1').catch(e => e)
            if (type !== 'svg') {
                const offscreen = new OffscreenCanvas(width, height);
                const ctx = offscreen.getContext('2d');
                ctx.fillStyle = `#${bgcolor}`;
                ctx.fillRect(0, 0, offscreen.width, offscreen.height);
                ctx.fillStyle = `#${fgcolor}`;
                ctx.font = `${width > height ? height / 4 : width / 7}px ${FontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, offscreen.width / 2, offscreen.height / 2);
                const genBlob = async () => {
                    const blob = await offscreen.convertToBlob({
                        type: `image/${type}`
                    });
                    return new Response(blob, {
                        headers: new Headers({
                            'content-type': `image/${type}`,
                            'access-control-allow-headers': 'Origin',
                            'access-control-allow-origin': '*'
                        }), ...StatusType.ok
                    });
                };
                event.respondWith(genBlob());
            } else {
                const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
    <rect x="0" y="0" width="${width}" height="${height}" style="fill:#${bgcolor};"/>
    <text x="50%" y="50%" style="font-family: ${FontFamily};text-anchor:middle;alignment-baseline:middle;font-size:${width > height ? height / 4 : width / 7}px;fill:#${fgcolor};">${text}</text>
</svg>
`
                event.respondWith(new Response(svg, {
                    headers: new Headers({
                        'content-type': `image/svg+xml`,
                        'access-control-allow-headers': 'Origin',
                        'access-control-allow-origin': '*'
                    }), ...StatusType.ok
                }));
            }
            return;
        } else {
            // 缓存处理
            event.respondWith(caches.match(event.request).catch(function () {
                return fetch(event.request);
            }).then(function (response) {
                if (response) {
                    caches.open("offline-cache").then(function (cache) {
                        cache.put(event.request, response);
                    });
                    return response.clone();
                } else {
                    fetch(event.request).then(function (response) {
                        caches.open("offline-cache").then(function (cache) {
                            cache.put(event.request, response);
                        });
                        return response.clone()
                    }).catch(function () {
                        return new Response("ERROR");
                    })
                }

            }).catch(function () {
                return "ERROR";
            }));
        }
    }
});