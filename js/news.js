// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
//
// Версия 5.1
//
// Совместим с:
// - index.html
// - app.js
//
// Главная задача:
// НЕ оставлять "Сбор свежих новостей..." навсегда.
// ==========================================

(function () {

    'use strict';

    // ==========================================
    // НАСТРОЙКИ
    // ==========================================

    var CONFIG = {
        proxy: 'https://api.rss2json.com/v1/api.json?rss_url=',
        maxAgeMs: 48 * 60 * 60 * 1000,
        maxArticles: 15,
        timeoutMs: 7000,
        refreshMs: 5 * 60 * 1000,
        cacheKey: 'tt_news_cache_v51',
        cacheTtlMs: 30 * 60 * 1000
    };


    // ==========================================
    // ИСТОЧНИКИ
    // ==========================================

    var SOURCES = [

        {
            name: 'Sports.ru',
            rss: 'https://www.sports.ru/ping-pong/rss/',
            priority: 100
        },

        {
            name: 'Sports.ru',
            rss: 'https://www.sports.ru/rss/subscribe.xml?sport=ping-pong&class=Sports::News',
            priority: 95
        },

        {
            name: 'Sport.ru',
            rss: 'https://www.sport.ru/rssfeeds/news.rss',
            priority: 60
        }

    ];


    // ==========================================
    // КЛЮЧЕВЫЕ СЛОВА
    // ==========================================

    var INCLUDE_WORDS = [

        'настольный теннис',
        'настольного тенниса',
        'настольному теннису',
        'настольным теннисом',

        'пинг-понг',
        'пинг понг',

        'table tennis',
        'table-tennis',

        'wtt',
        'ittf',
        'ettu',
        'фнтр',

        'федерация настольного тенниса',

        'теннисист',
        'теннисистка',

        'world table tennis',

        'world championships',
        'world championship'

    ];


    // ==========================================
    // ИСКЛЮЧЕНИЯ
    // ==========================================

    var EXCLUDE_WORDS = [

        'большой теннис',

        'atp tour',
        'wta tour',

        'теннис atp',
        'теннис wta',

        'ролан гаррос',
        'уимблдон',
        'wimbledon',

        'us open',
        'australian open',
        'австралиан опен',

        'кубок дэви',
        'кубок федерации',

        'джокович',
        'надаль',
        'федерер',

        'алькарас',
        'синнер',

        'медведев даниил',

        'соболенко',
        'швентек',

        'зверев',
        'руне'

    ];


    // ==========================================
    // СОСТОЯНИЕ
    // ==========================================

    var isLoading = false;
    var lastLoadTime = 0;


    // ==========================================
    // ОТКРЫТЬ НОВОСТЬ
    // ==========================================

    window.openNewsLink = function (url) {

        if (!url || typeof url !== 'string') {
            return;
        }

        try {

            var parsed = new URL(url);

            if (
                parsed.protocol !== 'https:' &&
                parsed.protocol !== 'http:'
            ) {
                return;
            }

        } catch (e) {

            console.log(
                '[TT News] Некорректная ссылка:',
                url
            );

            return;
        }


        if (
            window.Telegram &&
            window.Telegram.WebApp &&
            typeof window.Telegram.WebApp.openLink === 'function'
        ) {

            try {

                window.Telegram.WebApp.openLink(
                    url,
                    {
                        try_instant_view: true
                    }
                );

                return;

            } catch (e) {

                console.log(
                    '[TT News] Telegram openLink error',
                    e
                );

            }

        }


        window.open(
            url,
            '_blank',
            'noopener,noreferrer'
        );

    };


    // ==========================================
    // HTML ESCAPE
    // ==========================================

    function escapeHtml(value) {

        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }


    // ==========================================
    // ОЧИСТКА RSS
    // ==========================================

    function cleanText(value) {

        return String(value || '')

            .replace(
                /<script[\s\S]*?<\/script>/gi,
                ''
            )

            .replace(
                /<style[\s\S]*?<\/style>/gi,
                ''
            )

            .replace(
                /<[^>]*>/g,
                ' '
            )

            .replace(
                /&nbsp;/gi,
                ' '
            )

            .replace(
                /&quot;/gi,
                '"'
            )

            .replace(
                /&amp;/gi,
                '&'
            )

            .replace(
                /&#39;/gi,
                "'"
            )

            .replace(
                /&#039;/gi,
                "'"
            )

            .replace(
                /\s+/g,
                ' '
            )

            .trim();

    }


    // ==========================================
    // НОРМАЛИЗАЦИЯ
    // ==========================================

    function normalizeText(value) {

        return cleanText(value)

            .toLowerCase()

            .replace(
                /ё/g,
                'е'
            )

            .replace(
                /[^а-яa-z0-9]+/gi,
                ' '
            )

            .replace(
                /\s+/g,
                ' '
            )

            .trim();

    }


    // ==========================================
    // ПРОВЕРКА НАСТОЛЬНОГО ТЕННИСА
    // ==========================================

    function isTableTennisNews(
        title,
        description
    ) {

        var text =
            normalizeText(title) +
            ' ' +
            normalizeText(description);


        var found = INCLUDE_WORDS.some(
            function (word) {

                return text.indexOf(
                    normalizeText(word)
                ) !== -1;

            }
        );


        if (!found) {
            return false;
        }


        var excluded = EXCLUDE_WORDS.some(
            function (word) {

                return text.indexOf(
                    normalizeText(word)
                ) !== -1;

            }
        );


        if (!excluded) {
            return true;
        }


        var strong =
            text.indexOf('настольн') !== -1 ||
            text.indexOf('пинг понг') !== -1 ||
            text.indexOf('wtt') !== -1 ||
            text.indexOf('ittf') !== -1 ||
            text.indexOf('фнтр') !== -1 ||
            text.indexOf('table tennis') !== -1;


        return strong;

    }


    // ==========================================
    // ДАТА
    // ==========================================

    function parseDate(value) {

        if (!value) {
            return null;
        }


        var date = new Date(value);


        if (!isNaN(date.getTime())) {
            return date.getTime();
        }


        var timestamp = Date.parse(
            String(value).replace(/-/g, '/')
        );


        if (!isNaN(timestamp)) {
            return timestamp;
        }


        return null;

    }


    // ==========================================
    // ПРОВЕРКА СВЕЖЕСТИ
    // ==========================================

    function isFresh(timestamp) {

        if (!timestamp) {
            return false;
        }


        var now = Date.now();

        var minDate =
            now - CONFIG.maxAgeMs;

        var maxDate =
            now + 10 * 60 * 1000;


        return (
            timestamp >= minDate &&
            timestamp <= maxDate
        );

    }


    // ==========================================
    // НОРМАЛИЗАЦИЯ ЗАГОЛОВКА
    // ==========================================

    function titleKey(title) {

        return normalizeText(title)
            .replace(/[^а-яa-z0-9]/gi, '')
            .substring(0, 120);

    }


    // ==========================================
    // ДЕДУПЛИКАЦИЯ
    // ==========================================

    function removeDuplicates(articles) {

        var seen = {};
        var result = [];


        articles.forEach(
            function (article) {

                var key =
                    titleKey(article.title);


                if (!key) {
                    return;
                }


                if (seen[key]) {
                    return;
                }


                seen[key] = true;

                result.push(article);

            }
        );


        return result;

    }


    // ==========================================
    // ФОРМАТ ДАТЫ
    // ==========================================

    function formatDate(timestamp) {

        var d =
            new Date(timestamp);


        if (
            isNaN(d.getTime())
        ) {
            return '';
        }


        var diff =
            Date.now() -
            d.getTime();


        var minute =
            60 * 1000;

        var hour =
            60 * minute;


        if (diff < minute) {
            return 'только что';
        }


        if (diff < hour) {

            return (
                Math.floor(
                    diff / minute
                ) +
                ' мин назад'
            );

        }


        var now =
            new Date();


        var today =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            ).getTime();


        if (
            d.getTime() >= today
        ) {

            return (
                'Сегодня, ' +
                String(
                    d.getHours()
                ).padStart(2, '0') +
                ':' +
                String(
                    d.getMinutes()
                ).padStart(2, '0')
            );

        }


        return (
            String(
                d.getDate()
            ).padStart(2, '0') +
            '.' +
            String(
                d.getMonth() + 1
            ).padStart(2, '0') +
            '.' +
            d.getFullYear()
        );

    }


    // ==========================================
    // ПОЛОЖЕНИЕ ЗАГРУЗКИ
    // ==========================================

    function showLoading(container) {

        container.innerHTML =
            '<div style="' +
            'padding:20px;' +
            'text-align:center;' +
            'color:var(--text-muted);' +
            'font-weight:600;' +
            '">' +

            'Сбор свежих новостей… 🏓' +

            '<div style="' +
            'font-size:11px;' +
            'font-weight:500;' +
            'margin-top:6px;' +
            'opacity:.7;' +
            '">' +

            'Обновляем ленту' +

            '</div>' +

            '</div>';

    }


    // ==========================================
    // ОШИБКА
    // ==========================================

    function showError(
        container,
        hasCache
    ) {

        if (hasCache) {

            var notice =
                document.createElement(
                    'div'
                );


            notice.style.cssText =
                'font-size:10px;' +
                'color:var(--text-muted);' +
                'text-align:center;' +
                'padding:4px 0 10px;' +
                'opacity:.7;';


            notice.textContent =
                'Не удалось обновить ленту. Повторим позже.';


            container.insertBefore(
                notice,
                container.firstChild
            );


            setTimeout(
                function () {

                    if (
                        notice &&
                        notice.parentNode
                    ) {

                        notice.parentNode.removeChild(
                            notice
                        );

                    }

                },
                5000
            );


            return;
        }


        container.innerHTML =
            '<div style="' +
            'padding:18px;' +
            'text-align:center;' +
            'color:var(--text-muted);' +
            '">' +

            '<div style="' +
            'font-size:14px;' +
            'font-weight:700;' +
            'margin-bottom:6px;' +
            '">' +

            'Новости временно недоступны' +

            '</div>' +

            '<div style="' +
            'font-size:11px;' +
            'opacity:.75;' +
            '">' +

            'Приложение работает. Попробуем обновить ленту позже.' +

            '</div>' +

            '</div>';

    }


    // ==========================================
    // РЕНДЕР НОВОСТЕЙ
    // ==========================================

    function renderNewsCards(
        articles,
        container
    ) {

        if (!container) {
            return;
        }


        if (
            !articles ||
            articles.length === 0
        ) {

            container.innerHTML =
                '<div style="' +
                'padding:18px;' +
                'text-align:center;' +
                'color:var(--text-muted);' +
                '">' +

                '<div style="' +
                'font-size:14px;' +
                'font-weight:700;' +
                'margin-bottom:6px;' +
                '">' +

                'Свежих новостей пока нет 🏓' +

                '</div>' +

                '<div style="' +
                'font-size:11px;' +
                'opacity:.7;' +
                '">' +

                'Лента автоматически обновится позже.' +

                '</div>' +

                '</div>';

            return;

        }


        var html = '';


        articles.forEach(
            function (
                article,
                index
            ) {

                html +=

                    '<div ' +

                    'class="card tt-news-card" ' +

                    'data-news-index="' +
                    index +
                    '" ' +

                    'style="' +
                    'border-color:rgba(59,130,246,.3);' +
                    'padding:12px;' +
                    'margin-bottom:10px;' +
                    'cursor:pointer;' +
                    'transition:opacity .15s;' +
                    '">' +

                    '<div style="' +
                    'display:flex;' +
                    'justify-content:space-between;' +
                    'align-items:center;' +
                    'gap:8px;' +
                    'margin-bottom:8px;' +
                    '">' +

                    '<div style="' +
                    'font-size:10px;' +
                    'background:rgba(59,130,246,.1);' +
                    'color:#60a5fa;' +
                    'padding:3px 8px;' +
                    'border-radius:6px;' +
                    'font-weight:800;' +
                    'text-transform:uppercase;' +
                    'white-space:nowrap;' +
                    'overflow:hidden;' +
                    'text-overflow:ellipsis;' +
                    'max-width:65%;' +
                    '">' +

                    '📰 ' +

                    escapeHtml(
                        article.source
                    ) +

                    '</div>' +

                    '<div style="' +
                    'font-size:11px;' +
                    'color:var(--text-muted);' +
                    'font-weight:600;' +
                    'white-space:nowrap;' +
                    '">' +

                    escapeHtml(
                        formatDate(
                            article.date
                        )
                    ) +

                    '</div>' +

                    '</div>' +

                    '<div style="' +
                    'font-size:14px;' +
                    'font-weight:600;' +
                    'color:#f8fafc;' +
                    'line-height:1.4;' +
                    '">' +

                    escapeHtml(
                        article.title
                    ) +

                    '</div>' +

                    '</div>';

            }
        );


        container.innerHTML =
            html;


        window.__TT_NEWS_ARTICLES =
            articles;


        var cards =
            container.querySelectorAll(
                '.tt-news-card'
            );


        cards.forEach(
            function (card) {

                card.addEventListener(
                    'click',
                    function () {

                        var index =
                            Number(
                                card.getAttribute(
                                    'data-news-index'
                                )
                            );


                        var article =
                            window.__TT_NEWS_ARTICLES[
                                index
                            ];


                        if (
                            article &&
                            article.link
                        ) {

                            openNewsLink(
                                article.link
                            );

                        }

                    }
                );


                card.addEventListener(
                    'touchstart',
                    function () {

                        card.style.opacity =
                            '0.65';

                    },
                    {
                        passive: true
                    }
                );


                card.addEventListener(
                    'touchend',
                    function () {

                        card.style.opacity =
                            '1';

                    },
                    {
                        passive: true
                    }
                );

            }
        );

    }


    // ==========================================
    // КЭШ
    // ==========================================

    function readCache() {

        try {

            var raw =
                localStorage.getItem(
                    CONFIG.cacheKey
                );


            if (!raw) {
                return null;
            }


            var data =
                JSON.parse(raw);


            if (
                !data ||
                !Array.isArray(data.items)
            ) {

                return null;

            }


            if (
                data.savedAt &&
                Date.now() - data.savedAt >
                CONFIG.cacheTtlMs
            ) {

                localStorage.removeItem(
                    CONFIG.cacheKey
                );

                return null;

            }


            return data;

        } catch (e) {

            console.log(
                '[TT News] Ошибка чтения кэша',
                e
            );

            return null;

        }

    }


    function saveCache(
        articles
    ) {

        try {

            localStorage.setItem(
                CONFIG.cacheKey,
                JSON.stringify({

                    savedAt:
                        Date.now(),

                    items:
                        articles

                })
            );

        } catch (e) {

            console.log(
                '[TT News] Ошибка записи кэша',
                e
            );

        }

    }


    // ==========================================
    // FETCH С TIMEOUT
    // ==========================================

    function fetchWithTimeout(
        url
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                var finished =
                    false;


                var controller =
                    typeof AbortController !==
                    'undefined'
                        ? new AbortController()
                        : null;


                var timer =
                    setTimeout(
                        function () {

                            if (finished) {
                                return;
                            }


                            finished = true;


                            if (controller) {

                                try {
                                    controller.abort();
                                } catch (e) {}

                            }


                            reject(
                                new Error(
                                    'timeout'
                                )
                            );

                        },
                        CONFIG.timeoutMs
                    );


                fetch(
                    url,
                    {
                        method: 'GET',

                        cache: 'no-store',

                        signal:
                            controller
                                ? controller.signal
                                : undefined,

                        headers: {
                            'Accept':
                                'application/json'
                        }
                    }
                )

                .then(
                    function (response) {

                        if (finished) {
                            return null;
                        }


                        if (!response.ok) {

                            throw new Error(
                                'HTTP ' +
                                response.status
                            );

                        }


                        return response.json();

                    }
                )

                .then(
                    function (data) {

                        if (finished) {
                            return;
                        }


                        finished = true;


                        clearTimeout(
                            timer
                        );


                        resolve(
                            data
                        );

                    }
                )

                .catch(
                    function (error) {

                        if (finished) {
                            return;
                        }


                        finished = true;


                        clearTimeout(
                            timer
                        );


                        reject(
                            error
                        );

                    }
                );

            }
        );

    }


    // ==========================================
    // ЗАПРОС ОДНОГО ИСТОЧНИКА
    // ==========================================

    function fetchSource(
        source
    ) {

        var proxyUrl =
            CONFIG.proxy +
            encodeURIComponent(
                source.rss
            );


        console.log(
            '[TT News] Запрашиваем:',
            source.name,
            source.rss
        );


        return fetchWithTimeout(
            proxyUrl
        )

        .then(
            function (data) {

                if (
                    !data ||
                    !Array.isArray(
                        data.items
                    )
                ) {

                    throw new Error(
                        'RSS items отсутствуют'
                    );

                }


                var articles = [];


                data.items.forEach(
                    function (item) {

                        var title =
                            cleanText(
                                item.title
                            );


                        var description =
                            cleanText(
                                item.description ||
                                item.content ||
                                ''
                            );


                        if (!title) {
                            return;
                        }


                        if (
                            !isTableTennisNews(
                                title,
                                description
                            )
                        ) {

                            return;

                        }


                        var date =
                            parseDate(
                                item.pubDate ||
                                item.isoDate ||
                                item.date
                            );


                        if (
                            !date ||
                            !isFresh(date)
                        ) {

                            return;

                        }


                        var link =
                            item.link ||
                            item.guid ||
                            '';


                        if (!link) {
                            return;
                        }


                        articles.push({

                            title:
                                title,

                            link:
                                link,

                            source:
                                source.name,

                            date:
                                date,

                            priority:
                                source.priority

                        });

                    }
                );


                console.log(
                    '[TT News]',
                    source.name,
                    'получено:',
                    articles.length
                );


                return articles;

            }
        );

    }


    // ==========================================
    // ЗАГРУЗКА ВСЕХ ИСТОЧНИКОВ
    // ==========================================

    function loadFreshNews(
        container
    ) {

        if (isLoading) {

            console.log(
                '[TT News] Загрузка уже идёт'
            );

            return;

        }


        var now =
            Date.now();


        if (
            now - lastLoadTime <
            60 * 1000
        ) {

            console.log(
                '[TT News] Слишком частый запрос'
            );

            return;

        }


        isLoading = true;

        lastLoadTime = now;


        console.log(
            '[TT News] Начинаем обновление'
        );


        var requests =
            SOURCES.map(
                function (source) {

                    return fetchSource(
                        source
                    )

                    .catch(
                        function (error) {

                            console.warn(
                                '[TT News] Источник недоступен:',
                                source.name,
                                error
                            );

                            return [];

                        }
                    );

                }
            );


        Promise.all(requests)

        .then(
            function (results) {

                var allArticles =
                    [];


                results.forEach(
                    function (items) {

                        if (
                            Array.isArray(
                                items
                            )
                        ) {

                            allArticles =
                                allArticles.concat(
                                    items
                                );

                        }

                    }
                );


                allArticles =
                    removeDuplicates(
                        allArticles
                    );


                allArticles.sort(
                    function (a, b) {

                        if (
                            b.date !==
                            a.date
                        ) {

                            return (
                                b.date -
                                a.date
                            );

                        }


                        return (
                            b.priority -
                            a.priority
                        );

                    }
                );


                allArticles =
                    allArticles.slice(
                        0,
                        CONFIG.maxArticles
                    );


                console.log(
                    '[TT News] Всего свежих новостей:',
                    allArticles.length
                );


                if (
                    allArticles.length > 0
                ) {

                    saveCache(
                        allArticles
                    );


                    renderNewsCards(
                        allArticles,
                        container
                    );

                } else {

                    showError(
                        container,
                        false
                    );

                }

            }
        )

        .catch(
            function (error) {

                console.error(
                    '[TT News] Общая ошибка:',
                    error
                );


                var cache =
                    readCache();


                showError(
                    container,
                    !!(
                        cache &&
                        cache.items &&
                        cache.items.length
                    )
                );

            }
        )

        .finally(
            function () {

                isLoading =
                    false;

            }
        );

    }


    // ==========================================
    // ГЛАВНАЯ ФУНКЦИЯ
    // ==========================================

    window.loadTableTennisNews =
        function () {

            console.log(
                '[TT News] loadTableTennisNews()'
            );


            var container =
                document.getElementById(
                    'news-container'
                );


            if (!container) {

                console.error(
                    '[TT News] Не найден #news-container'
                );

                return;

            }


            // ==================================
            // СНАЧАЛА КЭШ
            // ==================================

            var cache =
                readCache();


            var cachedArticles =
                [];


            if (
                cache &&
                Array.isArray(
                    cache.items
                )
            ) {

                cachedArticles =
                    cache.items.filter(
                        function (article) {

                            return (
                                article &&
                                article.title &&
                                article.link &&
                                isFresh(
                                    Number(
                                        article.date
                                    )
                                )
                            );

                        }
                    );


                cachedArticles.sort(
                    function (a, b) {

                        return (
                            b.date -
                            a.date
                        );

                    }
                );


                cachedArticles =
                    cachedArticles.slice(
                        0,
                        CONFIG.maxArticles
                    );


                if (
                    cachedArticles.length > 0
                ) {

                    console.log(
                        '[TT News] Показываем кэш:',
                        cachedArticles.length
                    );


                    renderNewsCards(
                        cachedArticles,
                        container
                    );

                }

            }


            // ==================================
            // ЕСЛИ НЕТ КЭША
            // ==================================

            if (
                cachedArticles.length === 0
            ) {

                showLoading(
                    container
                );

            }


            // ==================================
            // ЗАПУСКАЕМ RSS
            // ==================================

            setTimeout(
                function () {

                    loadFreshNews(
                        container
                    );

                },
                50
            );


            // ==================================
            // АВТООБНОВЛЕНИЕ
            // ==================================

            if (
                !window.__TT_NEWS_INTERVAL
            ) {

                window.__TT_NEWS_INTERVAL =
                    setInterval(
                        function () {

                            loadFreshNews(
                                container
                            );

                        },
                        CONFIG.refreshMs
                    );

            }


            // ==================================
            // ВОЗВРАТ В ПРИЛОЖЕНИЕ
            // ==================================

            if (
                !window.__TT_NEWS_VISIBILITY
            ) {

                document.addEventListener(
                    'visibilitychange',
                    function () {

                        if (
                            document.visibilityState ===
                            'visible'
                        ) {

                            loadFreshNews(
                                container
                            );

                        }

                    }
                );


                window.__TT_NEWS_VISIBILITY =
                    true;

            }

        };


    // ==========================================
    // ЗАЩИТА ОТ ОШИБОК
    // ==========================================

    window.__TT_NEWS_READY =
        true;


    console.log(
        '[TT News] Модуль v5.1 загружен'
    );


})();
```
