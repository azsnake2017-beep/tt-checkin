```javascript
// ==========================================
// НОВОСТНОЙ МОДУЛЬ TT-CHECKIN
// js/news.js
//
// Версия 4.0
//
// GitHub Pages compatible
//
// Источники:
// - Sports.ru / настольный теннис
// - российские спортивные RSS
// - русскоязычные мировые новости
// - мировые новости WTT / ITTF через русскоязычные
//   спортивные источники
//
// ВАЖНО:
// GitHub Pages не является сервером.
// Поэтому временно используется rss2json.
// ==========================================

(function () {

  'use strict';


  // ==========================================
  // НАСТРОЙКИ
  // ==========================================

  var CONFIG = {

    proxy:
      'https://api.rss2json.com/v1/api.json?rss_url=',

    // Только последние 24 часа.
    maxAgeMs:
      24 * 60 * 60 * 1000,

    // Максимум карточек.
    maxArticles:
      15,

    // Таймаут одного RSS.
    timeoutMs:
      7000,

    // Обновление.
    refreshMs:
      5 * 60 * 1000,

    // Минимальный интервал между запросами.
    minRefreshMs:
      60 * 1000,

    // Кэш.
    cacheKey:
      'tt_news_cache_v40',

    // Кэш считается актуальным 30 минут.
    cacheTtlMs:
      30 * 60 * 1000

  };


  // ==========================================
  // ИСТОЧНИКИ
  // ==========================================
  //
  // priority:
  // 100 = основной источник
  // 80  = хороший
  // 60  = дополнительный
  //
  // category:
  // table-tennis = строго НТ
  // russian-sport = российский спорт
  // world-sport = мировой спорт
  //
  // Мировые новости здесь нужны только
  // для расширения ленты.
  // Фильтр ниже оставит только НТ.
  // ==========================================

  var SOURCES = [

    // ----------------------------------------
    // ОСНОВНЫЕ
    // ----------------------------------------

    {
      name: 'Sports.ru',
      rss: 'https://www.sports.ru/ping-pong/rss/',
      priority: 100,
      category: 'table-tennis'
    },

    {
      name: 'Sports.ru',
      rss: 'https://www.sports.ru/rss/subscribe.xml?sport=ping-pong&class=Sports::News',
      priority: 98,
      category: 'table-tennis'
    },


    // ----------------------------------------
    // РОССИЙСКИЙ СПОРТ
    // ----------------------------------------

    {
      name: 'РИА Спорт',
      rss: 'https://rsport.ria.ru/export/rss2/archive/index.xml',
      priority: 82,
      category: 'russian-sport'
    },

    {
      name: 'Sport.ru',
      rss: 'https://www.sport.ru/rssfeeds/news.rss',
      priority: 72,
      category: 'russian-sport'
    },


    // ----------------------------------------
    // ДОПОЛНИТЕЛЬНЫЕ РОССИЙСКИЕ ИСТОЧНИКИ
    // ----------------------------------------

    {
      name: 'ТАСС Спорт',
      rss: 'https://tass.ru/rss/v2.xml',
      priority: 68,
      category: 'russian-sport'
    },

    {
      name: 'Матч ТВ',
      rss: 'https://matchtv.ru/rss',
      priority: 65,
      category: 'russian-sport'
    }

  ];


  // ==========================================
  // КЛЮЧЕВЫЕ СЛОВА
  // ==========================================

  var INCLUDE_WORDS = [

    // Русский
    'настольный теннис',
    'настольного тенниса',
    'настольному теннису',
    'настольным теннисом',

    'пинг-понг',
    'пинг понг',

    'теннисист',
    'теннисистка',
    'теннисисты',
    'теннисистки',

    // Международные
    'table tennis',
    'table-tennis',

    'wtt',
    'ittf',

    // Организации
    'фнтр',
    'федерация настольного тенниса',
    'европейский союз настольного тенниса',
    'ettu',

    // Турниры
    'world cup',
    'world championships',
    'world championship',
    'world team',
    'smash',
    'champions',
    'contender',
    'star contender',

    // Игроки / известные фамилии
    'фан чжэньдун',
    'ма лун',
    'ван манью',
    'сун инша',
    'линь гаоюань',
    'трульс морегар',
    'феликс лебрен',
    'алексис лебрен',
    'томокадзу харимото',
    'михайла гергер',
    'трулс морегард'

  ];


  // ==========================================
  // ИСКЛЮЧЕНИЯ
  // ==========================================

  var EXCLUDE_WORDS = [

    // Большой теннис
    'большой теннис',
    'теннис atp',
    'теннис wta',
    'atp tour',
    'wta tour',

    'ролан гаррос',
    'уимблдон',
    'wimbledon',

    'us open',
    'australian open',
    'австралиан опен',

    'кубок дэви',
    'кубок федерации',

    'теннисный корт',

    // Известные игроки большого тенниса
    'медведев даниил',
    'алькарас',
    'синнер',
    'соболенко',
    'швентек',
    'джокович',
    'надаль',
    'федерер',
    'руне',
    'зверев',

    // Очевидно не НТ
    'теннисный матч',
    'теннисный турнир'

  ];


  // ==========================================
  // ОТКРЫТИЕ НОВОСТИ
  // ==========================================

  window.openNewsLink =
    function (url) {

      if (
        !url ||
        typeof url !== 'string'
      ) {
        return;
      }


      try {

        var parsed =
          new URL(url);


        if (
          parsed.protocol !== 'https:' &&
          parsed.protocol !== 'http:'
        ) {
          return;
        }

      } catch (e) {

        return;

      }


      // Telegram Mini App

      if (
        window.Telegram &&
        window.Telegram.WebApp &&
        typeof window.Telegram.WebApp.openLink ===
          'function'
      ) {

        try {

          window.Telegram.WebApp.openLink(
            url,
            {
              try_instant_view: true
            }
          );

          return;

        } catch (e) {}

      }


      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );

    };


  // ==========================================
  // HTML
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
        /&lt;/gi,
        '<'
      )

      .replace(
        /&gt;/gi,
        '>'
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
  // ПРОВЕРКА НОВОСТИ
  // ==========================================

  function isTableTennisNews(
    title,
    description
  ) {

    var text =
      normalizeText(title) +
      ' ' +
      normalizeText(description);


    var hasInclude =
      INCLUDE_WORDS.some(
        function (word) {

          return (
            text.indexOf(
              normalizeText(word)
            ) !== -1
          );

        }
      );


    if (!hasInclude) {
      return false;
    }


    var hasExclude =
      EXCLUDE_WORDS.some(
        function (word) {

          return (
            text.indexOf(
              normalizeText(word)
            ) !== -1
          );

        }
      );


    if (!hasExclude) {
      return true;
    }


    // Если одновременно присутствуют
    // сильные признаки НТ — оставляем.

    var strongTableTennis =
      text.indexOf(
        'настольн'
      ) !== -1 ||

      text.indexOf(
        'пинг понг'
      ) !== -1 ||

      text.indexOf(
        'wtt'
      ) !== -1 ||

      text.indexOf(
        'ittf'
      ) !== -1 ||

      text.indexOf(
        'фнтр'
      ) !== -1;


    return strongTableTennis;

  }


  // ==========================================
  // ДАТА
  // ==========================================

  function parseDate(value) {

    if (!value) {
      return Date.now();
    }


    var date =
      new Date(value);


    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return date.getTime();

    }


    var timestamp =
      Date.parse(
        String(value)
          .replace(
            /-/g,
            '/'
          )
      );


    if (
      !isNaN(timestamp)
    ) {

      return timestamp;

    }


    return Date.now();

  }


  // ==========================================
  // СВЕЖЕСТЬ
  // ==========================================

  function isFresh(date) {

    var now =
      Date.now();


    var minDate =
      now -
      CONFIG.maxAgeMs;


    var maxDate =
      now +
      10 * 60 * 1000;


    return (
      date >= minDate &&
      date <= maxDate
    );

  }


  // ==========================================
  // ДЕДУПЛИКАЦИЯ
  // ==========================================

  function normalizeTitle(
    title
  ) {

    return normalizeText(
      title
    )
      .replace(
        /[^а-яa-z0-9]/gi,
        ''
      )
      .substring(
        0,
        120
      );

  }


  function similarityKey(
    title
  ) {

    var text =
      normalizeText(
        title
      );


    var words =
      text
        .split(' ')
        .filter(
          function (word) {

            return (
              word.length >= 4
            );

          }
        );


    return words
      .slice(0, 12)
      .join(' ');

  }


  function removeDuplicates(
    articles
  ) {

    var exact = {};
    var similar = {};

    var result = [];


    articles.forEach(
      function (article) {

        var exactKey =
          normalizeTitle(
            article.title
          );


        var similarKeyValue =
          similarityKey(
            article.title
          );


        if (
          exact[exactKey]
        ) {
          return;
        }


        if (
          similarKeyValue &&
          similar[
            similarKeyValue
          ]
        ) {
          return;
        }


        exact[exactKey] =
          true;


        if (
          similarKeyValue
        ) {

          similar[
            similarKeyValue
          ] =
            true;

        }


        result.push(
          article
        );

      }
    );


    return result;

  }


  // ==========================================
  // ФОРМАТ ДАТЫ
  // ==========================================

  function formatDate(
    timestamp
  ) {

    var d =
      new Date(timestamp);


    if (
      isNaN(
        d.getTime()
      )
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


    if (
      diff < minute
    ) {

      return 'только что';

    }


    if (
      diff < hour
    ) {

      return (
        Math.floor(
          diff / minute
        ) +
        ' мин назад'
      );

    }


    var now =
      new Date();


    var todayStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();


    if (
      d.getTime() >=
      todayStart
    ) {

      return (
        'Сегодня, ' +
        String(
          d.getHours()
        ).padStart(
          2,
          '0'
        ) +
        ':' +
        String(
          d.getMinutes()
        ).padStart(
          2,
          '0'
        )
      );

    }


    return (
      String(
        d.getDate()
      ).padStart(
        2,
        '0'
      ) +
      '.' +
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        '0'
      ) +
      '.' +
      d.getFullYear()
    );

  }


  // ==========================================
  // РЕНДЕР
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
        'font-weight:600;' +
        '">' +
        'Свежих новостей пока нет 🏓' +
        '</div>';

      return;

    }


    var html =
      '';


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
          'transition:.15s;' +
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
      container.queryS
```
