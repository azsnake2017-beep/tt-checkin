// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
//
// Версия 8.0 (Чистая архитектура)
// ==========================================

(function () {
    'use strict';

    var CONFIG = {
        proxy: 'https://api.rss2json.com/v1/api.json?rss_url=',
        maxAgeMs: 48 * 60 * 60 * 1000, 
        maxArticles: 15, 
        timeoutMs: 8000,
        refreshMs: 5 * 60 * 1000, 
        cacheKey: 'tt_news_cache_v80', 
        cacheTtlMs: 30 * 60 * 1000 
    };

    var SOURCES = [
        {
            name: 'News',
            rss: 'https://www.bing.com/news/search?q=' + encodeURIComponent('настольный теннис') + '&cc=ru&setlang=ru&sortBy=Date&format=rss',
            priority: 100
        },
        {
            name: 'Sport.ru',
            rss: 'https://www.sport.ru/rssfeeds/news.rss',
            priority: 80
        }
    ];

    var INCLUDE_WORDS = [
        'настольный теннис', 'настольного тенниса', 'настольному теннису', 'настольным теннисом',
        'пинг-понг', 'пинг понг', 'table tennis', 'table-tennis',
        'wtt', 'ittf', 'ettu', 'фнтр', 'федерация настольного тенниса',
        'теннисист', 'теннисистка', 'world table tennis', 'world championships'
    ];

    var EXCLUDE_WORDS = [
        'большой теннис', 'atp tour', 'wta tour', 'теннис atp', 'теннис wta',
        'ролан гаррос', 'уимблдон', 'wimbledon', 'us open', 'australian open', 
        'кубок дэви', 'кубок федерации', 'джокович', 'надаль', 'федерер',
        'алькарас', 'синнер', 'медведев даниил', 'соболенко', 'швентек', 'зверев', 'руне'
    ];

    var isLoading = false;
    var lastLoadTime = 0;
    // Глобальная переменная для хранения скачанных новостей в памяти
    window.__TT_NEWS_ARTICLES = []; 

    window.openNewsLink = function (url) {
        if (!url || typeof url !== 'string') return;
        try {
            var parsed = new URL(url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
        } catch (e) { return; }

        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            try {
                window.Telegram.WebApp.openLink(url, { try_instant_view: true });
                return;
            } catch (e) {}
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    function escapeHtml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function cleanText(value) {
        return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&quot;/gi, '"').replace(/&amp;/gi, '&')
            .replace(/&#39;/gi, "'").replace(/&#039;/gi, "'").replace(/\s+/g, ' ').trim();
    }

    function normalizeText(value) {
        return cleanText(value).toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    function isTableTennisNews(title, description) {
        var text = normalizeText(title) + ' ' + normalizeText(description);
        var found = INCLUDE_WORDS.some(function (word) { return text.indexOf(normalizeText(word)) !== -1; });
        if (!found) return false;
        var excluded = EXCLUDE_WORDS.some(function (word) { return text.indexOf(normalizeText(word)) !== -1; });
        if (!excluded) return true;
        return (text.indexOf('настольн') !== -1 || text.indexOf('пинг понг') !== -1 || text.indexOf('wtt') !== -1);
    }

    function parseDate(value) {
        if (!value) return null;
        var date = new Date(value);
        if (!isNaN(date.getTime())) return date.getTime();
        var timestamp = Date.parse(String(value).replace(/-/g, '/'));
        if (!isNaN(timestamp)) return timestamp;
        return null;
    }

    function isFresh(timestamp) {
        if (!timestamp) return false;
        var now = Date.now();
        return (timestamp >= (now - CONFIG.maxAgeMs) && timestamp <= (now + 600000));
    }

    function titleKey(title) {
        return normalizeText(title).replace(/[^а-яa-z0-9]/gi, '').substring(0, 120);
    }

    function removeDuplicates(articles) {
        var seen = {};
        var result = [];
        articles.forEach(function (article) {
            var key = titleKey(article.title);
            if (!key || seen[key]) return;
            seen[key] = true;
            result.push(article);
        });
        return result;
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

    function showLoading() {
        var c = getContainer();
        if (c) c.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Сбор свежих новостей… 🏓</div>';
    }

    function showError(hasCache) {
        var c = getContainer();
        if (!c) return;
        if (hasCache) {
            var notice = document.createElement('div');
            notice.style.cssText = 'font-size:10px; color:var(--text-muted); text-align:center; padding:4px 0 10px; opacity:.7;';
            notice.textContent = 'Не удалось обновить ленту. Повторим позже.';
            c.insertBefore(notice, c.firstChild);
            setTimeout(function () { if (notice && notice.parentNode) notice.parentNode.removeChild(notice); }, 5000);
            return;
        }
        c.innerHTML = '<div style="padding:18px; text-align:center; color:var(--text-muted);"><div style="font-size:14px; font-weight:700; margin-bottom:6px;">Новости временно недоступны</div><div style="font-size:11px; opacity:.75;">Приложение работает. Попробуем обновить ленту позже.</div></div>';
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
        });
    }

    function readCache() {
        try {
            var raw = localStorage.getItem(CONFIG.cacheKey);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (data.savedAt && Date.now() - data.savedAt > CONFIG.cacheTtlMs) {
                localStorage.removeItem(CONFIG.cacheKey);
                return null;
            }
            return data;
        } catch (e) { return null; }
    }

    function saveCache(articles) {
        try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ savedAt: Date.now(), items: articles })); } catch (e) { }
    }

    function fetchWithTimeout(url) {
        return new Promise(function (resolve, reject) {
            var finished = false;
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var timer = setTimeout(function () {
                if (finished) return;
                finished = true;
                if (controller) { try { controller.abort(); } catch (e) {} }
                reject(new Error('timeout'));
            }, CONFIG.timeoutMs);

            fetch(url, { method: 'GET', cache: 'no-store', signal: controller ? controller.signal : undefined })
            .then(function (res) {
                if (finished) return null;
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (finished) return;
                finished = true; clearTimeout(timer); resolve(data);
            })
            .catch(function (error) {
                if (finished) return;
                finished = true; clearTimeout(timer); reject(error);
            });
        });
    }

    function fetchSource(source) {
        var cacheBuster = Math.floor(Date.now() / 3600000); 
        var rawRssUrl = source.rss + (source.rss.indexOf('?') > -1 ? '&' : '?') + 'cb=' + cacheBuster;
        return fetchWithTimeout(CONFIG.proxy + encodeURIComponent(rawRssUrl)).then(function (data) {
            if (!data || !Array.isArray(data.items)) throw new Error('No items');
            var articles = [];
            data.items.forEach(function (item) {
                var rawTitle = item.title || "";
                var sourceName = source.name;
                var cleanTitleText = rawTitle;
                var parts = rawTitle.split(' - ');
                if (source.name === 'News' && parts.length > 1) {
                    sourceName = parts.pop().trim();
                    cleanTitleText = parts.join(' - ').trim();
                }
                var title = cleanText(cleanTitleText);
                var description = cleanText(item.description || item.content || '');
                if (!title || !isTableTennisNews(title, description)) return;
                var date = parseDate(item.pubDate || item.isoDate || item.date);
                if (!date || !isFresh(date)) return;
                var link = item.link || item.guid || '';
                if (!link) return;
                articles.push({ title: title, link: link, source: sourceName.replace(/&quot;/g, '"'), date: date, priority: source.priority });
            });
            return articles;
        });
    }

    function loadFreshNews() {
        if (isLoading) return;
        var now = Date.now();
        if (now - lastLoadTime < 60000) return;
        isLoading = true;
        lastLoadTime = now;

        var requests = SOURCES.map(function (source) {
            return fetchSource(source).catch(function () { return []; });
        });

        Promise.all(requests).then(function (results) {
            var allArticles = [];
            results.forEach(function (items) { if (Array.isArray(items)) allArticles = allArticles.concat(items); });
            allArticles = removeDuplicates(allArticles);
            allArticles.sort(function (a, b) { return (b.date !== a.date) ? b.date - a.date : b.priority - a.priority; });
            allArticles = allArticles.slice(0, CONFIG.maxArticles);

            if (allArticles.length > 0) {
                saveCache(allArticles);
                renderNewsCards(allArticles);
            } else {
                showError(false);
            }
        }).catch(function (error) {
            showError(!!(readCache()));
        }).then(function () { isLoading = false; }, function () { isLoading = false; });
    }

    // ==========================================
    // ЛЕГАЛЬНОЕ ВОССТАНОВЛЕНИЕ (ДЛЯ APP.JS)
    // ==========================================
    window.restoreNewsFromMemory = function() {
        var c = getContainer();
        // Если контейнер пуст или содержит только заглушку, а в памяти есть скачанные новости:
        if (c && c.innerHTML.indexOf('tt-news-card') === -1 && window.__TT_NEWS_ARTICLES && window.__TT_NEWS_ARTICLES.length > 0) {
            renderNewsCards(window.__TT_NEWS_ARTICLES);
        }
    };

    window.loadTableTennisNews = function () {
        var cache = readCache();
        if (cache && Array.isArray(cache.items)) {
            var cachedArticles = cache.items.filter(function (article) { return article && article.title && isFresh(Number(article.date)); });
            cachedArticles.sort(function (a, b) { return b.date - a.date; });
            cachedArticles = cachedArticles.slice(0, CONFIG.maxArticles);
            if (cachedArticles.length > 0) renderNewsCards(cachedArticles);
            else showLoading();
        } else {
            showLoading();
        }

        setTimeout(loadFreshNews, 50);

        if (!window.__TT_NEWS_INTERVAL) {
            window.__TT_NEWS_INTERVAL = setInterval(loadFreshNews, CONFIG.refreshMs);
        }

        if (!window.__TT_NEWS_VISIBILITY) {
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') {
                    loadFreshNews();
                }
            });
            window.__TT_NEWS_VISIBILITY = true;
        }
    };

    console.log('[TT News] Модуль v8.0 (Чистая архитектура) загружен!');
})();
