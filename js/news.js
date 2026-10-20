// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
// Версия 17.1 (RU СМИ без VPN + Прямые ссылки + Мульти-прокси)
// ==========================================

(function () {
    'use strict';

    var CONFIG = {
        rss2jsonProxy: 'https://api.rss2json.com/v1/api.json?rss_url=',
        xmlProxies: [
            'https://api.allorigins.win/raw?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ],
        maxAgeMs: 14 * 24 * 60 * 60 * 1000, // До 14 дней
        maxArticles: 15,
        refreshMs: 10 * 60 * 1000,
        cacheKey: 'tt_news_cache_v17_ru',
        cacheTtlMs: 30 * 60 * 1000
    };

    // 4 сгруппированных запроса вместо 10 (не перегружают прокси)
    var SOURCES = [
        {
            name: 'Главное',
            rss: 'https://www.bing.com/news/search?q=' + encodeURIComponent('настольный теннис') + '&cc=ru&setlang=ru&format=rss',
            priority: 100
        },
        {
            name: 'ФНТР и Пинг-понг',
            rss: 'https://www.bing.com/news/search?q=' + encodeURIComponent('ФНТР OR пинг-понг настольный теннис') + '&cc=ru&setlang=ru&format=rss',
            priority: 95
        },
        {
            name: 'Мировые турниры',
            rss: 'https://www.bing.com/news/search?q=' + encodeURIComponent('WTT OR ITTF настольный теннис') + '&cc=ru&setlang=ru&format=rss',
            priority: 90
        },
        {
            name: 'Чемпионаты и Лига Про',
            rss: 'https://www.bing.com/news/search?q=' + encodeURIComponent('чемпионат России OR турнир настольный теннис') + '&cc=ru&setlang=ru&format=rss',
            priority: 85
        }
    ];

    var isLoading = false;
    window.__TT_NEWS_ARTICLES = [];

    // Извлекаем прямую ссылку на российский сайт из редиректа Bing (чтобы всё летало без VPN)
    function extractDirectUrl(rawLink) {
        if (!rawLink) return '';
        try {
            var match = String(rawLink).match(/[?&]url=([^&]+)/i);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        } catch (e) {}
        return rawLink;
    }

    window.openNewsLink = function (url) {
        if (!url) return;
        var directUrl = extractDirectUrl(url);
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            try { window.Telegram.WebApp.openLink(directUrl, { try_instant_view: true }); return; } catch (e) {}
        }
        window.open(directUrl, '_blank', 'noopener,noreferrer');
    };

    function escapeHtml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function parseSafeDate(rawDate) {
        if (!rawDate) return Date.now();
        var ms = Date.parse(rawDate);
        if (isNaN(ms)) {
            ms = Date.parse(String(rawDate).replace(/-/g, '/'));
        }
        if (isNaN(ms) || ms > Date.now() + 86400000) {
            return Date.now();
        }
        return ms;
    }

    function formatDate(timestamp) {
        var d = new Date(timestamp);
        if (isNaN(d.getTime())) return '';
        var diff = Date.now() - d.getTime();
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (d.getTime() >= today) return 'Сегодня, ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
    }

    function getContainer() {
        return document.getElementById('news-container');
    }

    function renderNewsCards(articles) {
        var c = getContainer();
        if (!c) return;

        if (!articles || articles.length === 0) {
            c.innerHTML = '<div style="padding:18px; text-align:center; color:var(--text-muted);"><div style="font-size:14px; font-weight:700; margin-bottom:6px;">Свежих новостей пока нет 🏓</div><div style="font-size:11px; opacity:.7;">Загляните сюда немного позже.</div></div>';
            return;
        }

        var html = '';
        articles.forEach(function (article, index) {
            html += '<div class="card tt-news-card" data-news-index="' + index + '" style="border-color:rgba(59,130,246,.3); padding:12px; margin-bottom:10px; cursor:pointer; transition:opacity .15s;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">' +
                    '<div style="font-size:10px; background:rgba(59,130,246,.1); color:#60a5fa; padding:3px 8px; border-radius:6px; font-weight:800; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">📰 ' + escapeHtml(article.source) + '</div>' +
                    '<div style="font-size:11px; color:var(--text-muted); font-weight:600; white-space:nowrap;">' + escapeHtml(formatDate(article.date)) + '</div>' +
                    '</div><div style="font-size:14px; font-weight:600; color:#f8fafc; line-height:1.4;">' + escapeHtml(article.title) + '</div></div>';
        });

        c.innerHTML = html;
        window.__TT_NEWS_ARTICLES = articles;

        var cards = c.querySelectorAll('.tt-news-card');
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                var idx = Number(card.getAttribute('data-news-index'));
                if (window.__TT_NEWS_ARTICLES[idx]) openNewsLink(window.__TT_NEWS_ARTICLES[idx].link);
            });
            card.addEventListener('touchstart', function () { card.style.opacity = '0.65'; }, { passive: true });
            card.addEventListener('touchend', function () { card.style.opacity = '1'; }, { passive: true });
        });
    }

    function normalizeAndFilterItems(rawItems, sourceObj) {
        var articles = [];
        rawItems.forEach(function (item) {
            var rawTitle = item.title || '';
            var parts = rawTitle.split(' - ');
            var realSource = item.sourceName || 'Новости';
            var cleanTitle = rawTitle;

            if (parts.length > 1) {
                realSource = parts.pop().trim();
                cleanTitle = parts.join(' - ').trim();
            }

            cleanTitle = cleanTitle.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
            if (!cleanTitle) return;

            var tl = cleanTitle.toLowerCase();
            // Отсекаем большой теннис
            if (tl.indexOf('большой теннис') !== -1 || tl.indexOf('уимблдон') !== -1 || tl.indexOf('медведев') !== -1 || tl.indexOf('джокович') !== -1 || tl.indexOf('синнер') !== -1 || tl.indexOf('рублев') !== -1 || tl.indexOf('алькарас') !== -1 || tl.indexOf('ролан гаррос') !== -1) {
                return;
            }

            var directUrl = extractDirectUrl(item.link);
            // Если имя источника не нашлось в заголовке, берем домен сайта (например, championat.com)
            if (realSource === 'Новости' && directUrl) {
                try {
                    realSource = new URL(directUrl).hostname.replace(/^www\./, '');
                } catch (e) {}
            }

            articles.push({
                title: cleanTitle,
                link: directUrl,
                source: realSource,
                date: parseSafeDate(item.pubDate),
                priority: sourceObj.priority
            });
        });
        return articles;
    }

    function parseXmlItems(xmlText, source) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        var nodes = xmlDoc.querySelectorAll('item');
        var rawItems = [];
        nodes.forEach(function (node) {
            var titleNode = node.querySelector('title');
            var linkNode = node.querySelector('link');
            var dateNode = node.querySelector('pubDate');
            var sourceNode = node.querySelector('source');
            rawItems.push({
                title: titleNode ? titleNode.textContent : '',
                link: linkNode ? linkNode.textContent : '',
                pubDate: dateNode ? dateNode.textContent : '',
                sourceName: sourceNode ? sourceNode.textContent : ''
            });
        });
        return normalizeAndFilterItems(rawItems, source);
    }

    function fetchViaXmlFallback(source, proxyIndex) {
        var idx = proxyIndex || 0;
        if (idx >= CONFIG.xmlProxies.length) return Promise.resolve([]);

        var url = CONFIG.xmlProxies[idx] + encodeURIComponent(source.rss);
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('Proxy error');
                return res.text();
            })
            .then(function (xmlText) {
                var items = parseXmlItems(xmlText, source);
                if (!items || items.length === 0) {
                    return fetchViaXmlFallback(source, idx + 1);
                }
                return items;
            })
            .catch(function () {
                return fetchViaXmlFallback(source, idx + 1);
            });
    }

    function fetchSource(source) {
        var fetchUrl = CONFIG.rss2jsonProxy + encodeURIComponent(source.rss);

        return fetch(fetchUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data || data.status !== 'ok' || !Array.isArray(data.items) || data.items.length === 0) {
                    return fetchViaXmlFallback(source, 0);
                }
                return normalizeAndFilterItems(data.items, source);
            })
            .catch(function () {
                return fetchViaXmlFallback(source, 0);
            });
    }

    function loadFreshNews() {
        if (isLoading) return;
        isLoading = true;

        var c = getContainer();
        if (c && (!window.__TT_NEWS_ARTICLES || window.__TT_NEWS_ARTICLES.length === 0)) {
            c.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Сбор новостей… 🏓</div>';
        }

        Promise.all(SOURCES.map(fetchSource)).then(function (results) {
            var all = [];
            results.forEach(function (res) { all = all.concat(res); });

            var unique = [];
            var seen = {};
            all.sort(function (a, b) { return b.date - a.date; });

            all.forEach(function (a) {
                var sig = a.title.toLowerCase().replace(/[^а-яёa-z0-9]/gi, '').substring(0, 35);
                if (!sig || seen[sig]) return;
                seen[sig] = true;
                unique.push(a);
            });

            var recent = unique.filter(function (a) {
                return a.date >= (Date.now() - CONFIG.maxAgeMs);
            });
            var finalArticles = (recent.length >= 3 ? recent : unique).slice(0, CONFIG.maxArticles);

            if (finalArticles.length > 0) {
                localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ savedAt: Date.now(), items: finalArticles }));
                renderNewsCards(finalArticles);
            } else if (!window.__TT_NEWS_ARTICLES || window.__TT_NEWS_ARTICLES.length === 0) {
                renderNewsCards([]);
            }
        }).finally(function () {
            isLoading = false;
        });
    }

    window.loadTableTennisNews = function () {
        try {
            var cache = JSON.parse(localStorage.getItem(CONFIG.cacheKey));
            if (cache && cache.items && cache.items.length > 0) {
                renderNewsCards(cache.items);
                if (Date.now() - cache.savedAt < CONFIG.cacheTtlMs) {
                    return;
                }
            }
        } catch (e) {}

        setTimeout(loadFreshNews, 100);

        if (!window.__TT_NEWS_RESTORE_INTERVAL) {
            window.__TT_NEWS_RESTORE_INTERVAL = setInterval(function () {
                var c = getContainer();
                if (c && c.innerHTML.indexOf('tt-news-card') === -1 && window.__TT_NEWS_ARTICLES.length > 0) {
                    renderNewsCards(window.__TT_NEWS_ARTICLES);
                }
            }, 1000);
        }
    };

    console.log('[TT News] Модуль v17.1 загружен (RU СМИ без VPN + прямые ссылки)');
})();
