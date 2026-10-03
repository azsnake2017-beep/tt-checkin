// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
//
// Версия 11.0 (Российские + Мировые источники)
// ==========================================

(function () {
    'use strict';

    var CONFIG = {
        // Тройное резервирование прокси (обходим блокировки РФ и CORS)
        proxies: [
            'https://corsproxy.io/?url=',
            'https://api.allorigins.win/raw?url=',
            'https://api.codetabs.com/v1/proxy?quest=' // Доп. резерв
        ],
        maxAgeMs: 72 * 60 * 60 * 1000, // Новости за последние 3 дня
        maxArticles: 20, // Увеличили лимит, так как источников стало больше
        timeoutMs: 6000, 
        refreshMs: 5 * 60 * 1000, 
        cacheKey: 'tt_news_cache_v11', 
        cacheTtlMs: 30 * 60 * 1000 
    };

    // ==========================================
    // ИСТОЧНИКИ (РФ + Мир)
    // ==========================================
    var SOURCES = [
        {
            name: 'ITTF', // Международная федерация
            rss: 'https://www.ittf.com/feed/',
            priority: 100
        },
        {
            name: 'Sport.ru', // Россия
            rss: 'https://www.sport.ru/rssfeeds/news.rss',
            priority: 90
        },
        {
            name: 'World News', // Весь мир (через Google News USA)
            rss: 'https://news.google.com/rss/search?q=' + encodeURIComponent('table tennis when:7d') + '&hl=en-US&gl=US&ceid=US:en',
            priority: 80
        },
        {
            name: 'Lenta', // Россия
            rss: 'https://lenta.ru/rss/sport',
            priority: 70
        }
    ];

    // ==========================================
    // СЛОВА-МАРКЕРЫ (Русские + Английские)
    // ==========================================
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
    window.__TT_NEWS_ARTICLES = []; 

    window.openNewsLink = function (url) {
        if (!url || typeof url !== 'string') return;
        try {
            var parsed = new URL(url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;
        } catch (e) { return; }

        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            try { window.Telegram.WebApp.openLink(url, { try_instant_view: true }); return; } catch (e) {}
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
        return (text.indexOf('настольн') !== -1 || text.indexOf('пинг понг') !== -1 || text.indexOf('wtt') !== -1 || text.indexOf('table tennis') !== -1);
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
        if (c) c.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Сбор свежих новостей (РФ и Мир)… 🌍🏓</div>';
    }

    function showError() {
        var c = getContainer();
        if (!c) return;
        c.innerHTML = '<div style="padding:18px; text-align:center; color:var(--text-muted);"><div style="font-size:14px; font-weight:700; margin-bottom:6px;">Новости пока недоступны</div><div style="font-size:11px; opacity:.75; margin-bottom: 12px;">Проверьте интернет и попробуйте еще раз.</div><button class="btn-info" style="width: auto; padding: 6px 16px; font-size: 12px; height: auto;" onclick="window.loadTableTennisNews(true)">Повторить</button></div>';
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
            var sourceColor = article.source === 'ITTF' || article.source === 'World News' ? '#f59e0b' : '#60a5fa';
            var sourceBg = article.source === 'ITTF' || article.source === 'World News' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59,130,246,.1)';
            
            html += '<div class="card tt-news-card" data-news-index="' + index + '" style="border-color:rgba(59,130,246,.3); padding:12px; margin-bottom:10px; cursor:pointer; transition:opacity .15s;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">' +
                    '<div style="font-size:10px; background:' + sourceBg + '; color:' + sourceColor + '; padding:3px 8px; border-radius:6px; font-weight:800; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:65%;">📰 ' + escapeHtml(article.source) + '</div>' +
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

            var options = { method: 'GET', cache: 'no-store' };
            if (controller) options.signal = controller.signal;

            fetch(url, options)
            .then(function (res) {
                if (finished) return null;
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (text) {
                if (finished) return;
                finished = true; clearTimeout(timer); resolve(text);
            })
            .catch(function (error) {
                if (finished) return;
                finished = true; clearTimeout(timer); reject(error);
            });
        });
    }

    // Рекурсивный перебор прокси (если первый не ответил, пробуем второй)
    function fetchWithProxyFallback(rawUrl, proxyIndex) {
        if (proxyIndex >= CONFIG.proxies.length) {
            return Promise.reject(new Error('All proxies failed'));
        }
        var proxyUrl = CONFIG.proxies[proxyIndex] + encodeURIComponent(rawUrl);
        
        return fetchWithTimeout(proxyUrl).catch(function() {
            console.log('[TT News] Прокси ' + proxyIndex + ' не ответил, пробуем следующий...');
            return fetchWithProxyFallback(rawUrl, proxyIndex + 1);
        });
    }

    function fetchSource(source) {
        var cb = Math.floor(Date.now() / 3600000); 
        var rawUrl = source.rss + (source.rss.indexOf('?') > -1 ? '&' : '?') + 'cb=' + cb;

        return fetchWithProxyFallback(rawUrl, 0).then(function (xmlText) {
            if (!xmlText || xmlText.indexOf('<rss') === -1 && xmlText.indexOf('<feed') === -1) throw new Error('Invalid XML');

            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlText, "text/xml");
            
            // Поддержка как RSS (<item>), так и Atom (<entry> у Google)
            var items = xmlDoc.getElementsByTagName("item");
            if (items.length === 0) items = xmlDoc.getElementsByTagName("entry");
            
            var articles = [];
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var getTag = function(name) {
                    var el = item.getElementsByTagName(name)[0];
                    return el ? (el.textContent || el.innerHTML) : '';
                };

                var title = cleanText(getTag("title"));
                var description = cleanText(getTag("description") || getTag("content") || getTag("summary"));

                if (!title || !isTableTennisNews(title, description)) continue;

                var date = parseDate(getTag("pubDate") || getTag("published") || getTag("updated") || getTag("dc:date"));
                if (!date || !isFresh(date)) continue;

                // Для Atom ссылки лежат в атрибуте href тега <link>
                var linkEl = item.getElementsByTagName("link")[0];
                var link = '';
                if (linkEl) {
                    link = linkEl.textContent || linkEl.getAttribute("href") || '';
                }
                if (!link) link = getTag("guid");
                if (!link) continue;

                var sourceName = source.name;
                var parts = title.split(' - ');
                if (source.name === 'World News' && parts.length > 1) {
                    sourceName = parts.pop().trim();
                    title = parts.join(' - ').trim();
                }

                articles.push({
                    title: cleanText(title),
                    link: link,
                    source: sourceName.replace(/&quot;/g, '"'),
                    date: date,
                    priority: source.priority
                });
            }
            return articles;
        }).catch(function() {
            return []; // Игнорируем ошибку одного источника, другие загрузятся
        });
    }

    function loadFreshNews(force) {
        if (isLoading && !force) return;
        isLoading = true;
        lastLoadTime = Date.now();
        if (force) showLoading();

        var requests = SOURCES.map(function (source) { return fetchSource(source); });

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
                showError();
            }
        }).catch(function () {
            var cache = readCache();
            if (cache && cache.items && cache.items.length > 0) renderNewsCards(cache.items);
            else showError();
        }).finally(function () {
            isLoading = false;
        });
    }

    window.loadTableTennisNews = function (forceReload) {
        if (forceReload) {
            localStorage.removeItem(CONFIG.cacheKey);
            loadFreshNews(true);
            return;
        }

        var cache = readCache();
        if (cache && Array.isArray(cache.items) && cache.items.length > 0) {
            renderNewsCards(cache.items);
        } else {
            showLoading();
        }

        setTimeout(loadFreshNews, 50);

        if (!window.__TT_NEWS_INTERVAL) window.__TT_NEWS_INTERVAL = setInterval(loadFreshNews, CONFIG.refreshMs);
        
        if (!window.__TT_NEWS_RESTORE_INTERVAL) {
            window.__TT_NEWS_RESTORE_INTERVAL = setInterval(function() {
                var c = getContainer();
                if (c && c.innerHTML.indexOf('tt-news-card') === -1 && window.__TT_NEWS_ARTICLES && window.__TT_NEWS_ARTICLES.length > 0) {
                    renderNewsCards(window.__TT_NEWS_ARTICLES);
                }
            }, 1000);
        }
    };

    console.log('[TT News] Модуль v11.0 загружен (Россия + Мир)');
})();
