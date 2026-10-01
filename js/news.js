// ==========================================
// НОВОСТНОЙ МОДУЛЬ КЛУБА
// js/news.js
//
// Архитектура:
// Браузер -> /api/news -> сервер в РФ -> RSS/API источники
//
// ВАЖНО:
// news.js НЕ обращается напрямую к Google News,
// rss2json, зарубежным прокси и т.д.
// ==========================================

(function () {
  'use strict';

  // ------------------------------------------
  // НАСТРОЙКИ
  // ------------------------------------------

  var CONFIG = {
    apiUrl: '/api/news',

    // Новости старше этого времени не показываем.
    // 24 часа — хороший вариант для клубного блока.
    maxAgeMs: 24 * 60 * 60 * 1000,

    // Максимум карточек.
    maxItems: 12,

    // Как часто проверяем новые новости.
    refreshMs: 5 * 60 * 1000,

    // Через сколько миллисекунд считаем API зависшим.
    timeoutMs: 7000,

    // Кэш браузера.
    cacheKey: 'tt_news_cache_v30',

    // Время жизни локального кэша.
    cacheTtlMs: 30 * 60 * 1000
  };


  // ------------------------------------------
  // ОТКРЫТИЕ НОВОСТИ
  // ------------------------------------------

  window.openNewsLink = function (url) {
    if (!url || typeof url !== 'string') return;

    // Разрешаем только http/https.
    try {
      var parsed = new URL(url);

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return;
      }
    } catch (e) {
      return;
    }

    // Telegram Mini App
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      typeof window.Telegram.WebApp.openLink === 'function'
    ) {
      try {
        window.Telegram.WebApp.openLink(url, {
          try_instant_view: true
        });
        return;
      } catch (e) {
        // fallback ниже
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };


  // ------------------------------------------
  // ФОРМАТ ДАТЫ
  // ------------------------------------------

  function formatNewsDate(timestamp) {
    var d = new Date(timestamp);

    if (isNaN(d.getTime())) {
      return '';
    }

    var now = new Date();
    var diff = Date.now() - d.getTime();

    var minute = 60 * 1000;
    var hour = 60 * minute;

    if (diff < minute) {
      return 'только что';
    }

    if (diff < hour) {
      return Math.floor(diff / minute) + ' мин назад';
    }

    var todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    if (d.getTime() >= todayStart) {
      return (
        'Сегодня, ' +
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0')
      );
    }

    var yesterdayStart = todayStart - 24 * hour;

    if (d.getTime() >= yesterdayStart) {
      return (
        'Вчера, ' +
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0')
      );
    }

    return (
      String(d.getDate()).padStart(2, '0') +
      '.' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '.' +
      d.getFullYear()
    );
  }


  // ------------------------------------------
  // НОРМАЛИЗАЦИЯ НОВОСТИ
  // ------------------------------------------

  function normalizeArticle(article) {
    if (!article || typeof article !== 'object') {
      return null;
    }

    var title = String(article.title || '').trim();
    var link = String(article.link || '').trim();
    var source = String(article.source || 'Новости').trim();

    if (!title || !link) {
      return null;
    }

    // Проверяем URL.
    try {
      var parsedUrl = new URL(link);

      if (
        parsedUrl.protocol !== 'https:' &&
        parsedUrl.protocol !== 'http:'
      ) {
        return null;
      }

      link = parsedUrl.href;
    } catch (e) {
      return null;
    }

    var date = Number(article.date);

    if (!date) {
      date = Date.now();
    }

    // Если сервер прислал ISO дату.
    if (isNaN(date)) {
      date = new Date(article.date).getTime();
    }

    if (isNaN(date)) {
      return null;
    }

    return {
      title: title.substring(0, 220),
      link: link,
      source: source.substring(0, 80),
      date: date
    };
  }


  // ------------------------------------------
  // ДЕДУПЛИКАЦИЯ
  // ------------------------------------------

  function normalizeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9]+/gi, '')
      .substring(0, 100);
  }


  function uniqueArticles(articles) {
    var map = {};
    var result = [];

    articles.forEach(function (article) {
      var normalized = normalizeArticle(article);

      if (!normalized) return;

      var signature = normalizeTitle(normalized.title);

      if (!signature) return;

      if (map[signature]) {
        return;
      }

      map[signature] = true;
      result.push(normalized);
    });

    return result;
  }


  // ------------------------------------------
  // ФИЛЬТР СВЕЖЕСТИ
  // ------------------------------------------

  function filterFreshArticles(articles) {
    var now = Date.now();
    var minDate = now - CONFIG.maxAgeMs;

    return articles.filter(function (article) {
      return (
        article &&
        article.date &&
        article.date >= minDate &&
        article.date <= now + 5 * 60 * 1000
      );
    });
  }


  // ------------------------------------------
  // HTML
  // ------------------------------------------

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  function renderNewsCards(articles, container) {
    if (!container) return;

    if (!articles || articles.length === 0) {
      container.innerHTML =
        '<div style="padding:16px;text-align:center;color:var(--text-muted);font-weight:600;">' +
        'Свежих новостей пока нет' +
        '</div>';

      return;
    }

    var html = '';

    articles.forEach(function (article, index) {
      var safeTitle = escapeHtml(article.title);
      var safeSource = escapeHtml(article.source);
      var dateStr = formatNewsDate(article.date);

      html +=
        '<div class="card tt-news-card" ' +
          'data-news-index="' + index + '" ' +
          'style="' +
            'border-color:rgba(59,130,246,0.3);' +
            'padding:12px;' +
            'margin-bottom:10px;' +
            'cursor:pointer;' +
            'transition:opacity .15s,transform .15s;' +
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
              '📰 ' + safeSource +
            '</div>' +

            '<div style="' +
              'font-size:11px;' +
              'color:var(--text-muted);' +
              'font-weight:600;' +
              'white-space:nowrap;' +
            '">' +
              escapeHtml(dateStr) +
            '</div>' +

          '</div>' +

          '<div style="' +
            'font-size:14px;' +
            'font-weight:600;' +
            'color:#f8fafc;' +
            'line-height:1.4;' +
          '">' +
            safeTitle +
          '</div>' +

        '</div>';
    });

    container.innerHTML = html;

    // Обработчик кликов без onclick внутри HTML.
    var cards = container.querySelectorAll('.tt-news-card');

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var index = Number(card.getAttribute('data-news-index'));

        if (
          window.__TT_NEWS_ARTICLES &&
          window.__TT_NEWS_ARTICLES[index]
        ) {
          openNewsLink(
            window.__TT_NEWS_ARTICLES[index].link
          );
        }
      });

      card.addEventListener('mousedown', function () {
        card.style.opacity = '0.7';
      });

      card.addEventListener('mouseup', function () {
        card.style.opacity = '1';
      });

      card.addEventListener('mouseleave', function () {
        card.style.opacity = '1';
      });

      card.addEventListener('touchstart', function () {
        card.style.opacity = '0.7';
      }, { passive: true });

      card.addEventListener('touchend', function () {
        card.style.opacity = '1';
      }, { passive: true });
    });

    window.__TT_NEWS_ARTICLES = articles;
  }


  // ------------------------------------------
  // LOCAL STORAGE
  // ------------------------------------------

  function readCache() {
    try {
      var raw = localStorage.getItem(CONFIG.cacheKey);

      if (!raw) return null;

      var data = JSON.parse(raw);

      if (!data || !Array.isArray(data.items)) {
        return null;
      }

      return {
        items: data.items,
        savedAt: Number(data.savedAt || 0)
      };

    } catch (e) {
      return null;
    }
  }


  function saveCache(articles) {
    try {
      localStorage.setItem(
        CONFIG.cacheKey,
        JSON.stringify({
          items: articles,
          savedAt: Date.now()
        })
      );
    } catch (e) {
      // localStorage может быть переполнен/запрещён.
    }
  }


  // ------------------------------------------
  // API REQUEST
  // ------------------------------------------

  function fetchWithTimeout(url) {
    var controller = null;
    var timer = null;

    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();

      timer = setTimeout(function () {
        controller.abort();
      }, CONFIG.timeoutMs);
    }

    var options = {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    };

    if (controller) {
      options.signal = controller.signal;
    }

    return fetch(url, options)
      .then(function (response) {
        if (timer) {
          clearTimeout(timer);
        }

        if (!response.ok) {
          throw new Error(
            'News API HTTP ' + response.status
          );
        }

        return response.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) {
          throw new Error('Некорректный ответ News API');
        }

        return data.items;
      });
  }


  // ------------------------------------------
  // ЗАГРУЗКА НОВОСТЕЙ
  // ------------------------------------------

  function loadNewsFromServer(container, silent) {
    return fetchWithTimeout(CONFIG.apiUrl)
      .then(function (items) {

        var articles = items
          .map(normalizeArticle)
          .filter(Boolean);

        articles = filterFreshArticles(articles);

        articles.sort(function (a, b) {
          return b.date - a.date;
        });

        articles = uniqueArticles(articles);

        articles = articles.slice(
          0,
          CONFIG.maxItems
        );

        if (articles.length > 0) {
          saveCache(articles);
          renderNewsCards(articles, container);
        } else if (!silent) {
          renderNewsCards([], container);
        }

        return articles;
      })
      .catch(function (error) {

        console.log(
          '[TT News] Не удалось обновить новости:',
          error
        );

        // При ошибке ничего не ломаем.
        // Используем локальный кэш.
        var cached = readCache();

        if (
          cached &&
          Array.isArray(cached.items) &&
          cached.items.length > 0
        ) {
          var cachedArticles = cached.items
            .map(normalizeArticle)
            .filter(Boolean);

          cachedArticles = filterFreshArticles(
            cachedArticles
          );

          cachedArticles.sort(function (a, b) {
            return b.date - a.date;
          });

          cachedArticles = uniqueArticles(
            cachedArticles
          ).slice(0, CONFIG.maxItems);

          renderNewsCards(
            cachedArticles,
            container
          );

          return cachedArticles;
        }

        if (!silent) {
          renderNewsCards([], container);
        }

        return [];
      });
  }


  // ------------------------------------------
  // ОСНОВНАЯ ФУНКЦИЯ
  // ------------------------------------------

  window.loadTableTennisNews = function () {
    var container =
      document.getElementById('news-container');

    if (!container) return;

    // 1. Показываем кэш сразу.
    var cached = readCache();

    if (
      cached &&
      Array.isArray(cached.items)
    ) {
      var cachedArticles = cached.items
        .map(normalizeArticle)
        .filter(Boolean);

      cachedArticles = filterFreshArticles(
        cachedArticles
      );

      cachedArticles.sort(function (a, b) {
        return b.date - a.date;
      });

      cachedArticles = uniqueArticles(
        cachedArticles
      ).slice(0, CONFIG.maxItems);

      if (cachedArticles.length > 0) {
        renderNewsCards(
          cachedArticles,
          container
        );
      }
    } else {
      container.innerHTML =
        '<div style="padding:16px;text-align:center;color:var(--text-muted);font-weight:600;">' +
        'Загрузка свежих новостей… 🏓' +
        '</div>';
    }

    // 2. Обновляем сразу.
    loadNewsFromServer(container, true);

    // 3. Обновляем каждые 5 минут.
    if (!window.__TT_NEWS_INTERVAL) {
      window.__TT_NEWS_INTERVAL = setInterval(
        function () {
          loadNewsFromServer(container, true);
        },
        CONFIG.refreshMs
      );
    }

    // 4. Если пользователь вернулся в приложение.
    if (!window.__TT_NEWS_VISIBILITY) {
      document.addEventListener(
        'visibilitychange',
        function () {
          if (
            document.visibilityState === 'visible'
          ) {
            loadNewsFromServer(
              container,
              true
            );
          }
        }
      );

      window.__TT_NEWS_VISIBILITY = true;
    }
  };

})();
