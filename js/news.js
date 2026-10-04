// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
// Версия 13.0 (Строго прямые RU-источники, анти-блок)
// ==========================================

(function () {
    'use strict';

    var CONFIG = {
        proxy: 'https://api.rss2json.com/v1/api.json?rss_url=',
        maxAgeMs: 120 * 60 * 60 * 1000, // Увеличили до 5 дней (в РФ пишут реже)
        maxArticles: 15,
        refreshMs: 5 * 60 * 1000,
        cacheKey: 'tt_news_cache_v13',
        cacheTtlMs: 30 * 60 * 1000
    };

    // Только прямые российские сайты. Открываются без VPN у всех провайдеров.
    var SOURCES = [
        {
            name: 'Sportbox',
            rss: 'https://news.sportbox.ru/Vidy_sporta/nastolniy_tennis/rss'
        },
        {
            name: 'Sport.ru',
            rss: 'https://www.sport.ru/rssfeeds/news.rss'
        },
        {
            name: 'Lenta.ru',
            rss: 'https://lenta.ru/rss/sport'
        }
    ];

    var isLoading = false;
    window.__TT_NEWS_ARTICLES = [];

    window.openNewsLink = function (url) {
        if (!url) return;
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            try { window.Telegram.WebApp.openLink(url, { try_instant_view: true }); return; } catch (e) {}
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    function escapeHtml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function cleanText(value) {
        return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
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

    function fetchSource(source) {
        var cb = Math.floor(Date.now() / 3600000); 
        var fetchUrl = CONFIG.proxy + encodeURIComponent(source.rss + (source.rss.indexOf('?') > -1 ? '&' : '?') + 'cb=' + cb);

        return fetch(fetchUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (!data || !Array.isArray(data.items)) return [];
                
                var articles = [];
                data.items.forEach(function(item) {
                    var cleanTitle = cleanText(item.title || "");
                    var description = cleanText(item.description || item.content || '');
                    
                    var dateMs = item.pubDate ? new Date(item.pubDate.replace(/-/g, '/')).getTime() : Date.now();
                    
                    var tl = (cleanTitle + ' ' + description).toLowerCase();
                    
                    // Жесткий фильтр: оставляем только настольный теннис (особенно важно для Lenta.ru)
                    var isPingPong = tl.indexOf('настольн') !== -1 || tl.indexOf('пинг-понг') !== -1 || tl.indexOf('пинг понг') !== -1;
                    if (!isPingPong) return;

                    // Отсекаем большой теннис
                    if (tl.indexOf('большой теннис') !== -1 || tl.indexOf('уимблдон') !== -1 || tl.indexOf('медведев') !== -1) return;

                    articles.push({
                        title: cleanTitle,
                        link: item.link,
                        source: source.name,
                        date: dateMs
                    });
                });
                return articles;
            }).catch(function() { return []; });
    }

    function loadFreshNews() {
        if (isLoading) return;
        isLoading = true;

        var c = getContainer();
        if (c && (!window.__TT_NEWS_ARTICLES || window.__TT_NEWS_ARTICLES.length === 0)) {
            c.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Сбор новостей… 🏓</div>';
        }

        Promise.all(SOURCES.map(fetchSource)).then(function(results) {
            var all = [];
            results.forEach(function(res) { all = all.concat(res); });
            
            all.sort(function(a, b) { return b.date - a.date; });
            
            var unique = [];
            var seen = {};
            all.forEach(function(a) {
                var sig = a.title.toLowerCase().replace(/[^а-яa-z]/gi, '').substring(0, 30);
                if (!seen[sig] && a.date >= (Date.now() - CONFIG.maxAgeMs)) {
                    seen[sig] = true;
                    unique.push(a);
                }
            });

            unique = unique.slice(0, CONFIG.maxArticles);

            if (unique.length > 0) {
                localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ savedAt: Date.now(), items: unique }));
                renderNewsCards(unique);
            } else {
                if (c) c.innerHTML = '<div style="padding:18px; text-align:center; color:var(--text-muted);"><div style="font-size:14px; font-weight:700; margin-bottom:6px;">Свежих новостей пока нет</div></div>';
            }
        }).finally(function() {
            isLoading = false;
        });
    }

    window.loadTableTennisNews = function () {
        try {
            var cache = JSON.parse(localStorage.getItem(CONFIG.cacheKey));
            if (cache && cache.items && cache.items.length > 0 && (Date.now() - cache.savedAt < CONFIG.cacheTtlMs)) {
                renderNewsCards(cache.items);
            }
        } catch(e) {}

        setTimeout(loadFreshNews, 100);

        if (!window.__TT_NEWS_RESTORE_INTERVAL) {
            window.__TT_NEWS_RESTORE_INTERVAL = setInterval(function() {
                var c = getContainer();
                if (c && c.innerHTML.indexOf('tt-news-card') === -1 && window.__TT_NEWS_ARTICLES.length > 0) {
                    renderNewsCards(window.__TT_NEWS_ARTICLES);
                }
            }, 1000);
        }
    };

    console.log('[TT News] Модуль v13.0 загружен (Прямые RU-источники)');
})();
