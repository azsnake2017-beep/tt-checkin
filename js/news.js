// ==========================================
// НОВОСТНОЙ МОДУЛЬ КЛУБА (Файл: js/news.js)
// ==========================================

function openNewsLink(url) {
  if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
    window.Telegram.WebApp.openLink(url, { try_instant_view: true });
  } else {
    window.open(url, '_blank');
  }
}

function renderNewsCards(articles, container) {
  if (!articles || articles.length === 0) return;
  var html = '';
  var todayStart = new Date().setHours(0, 0, 0, 0);

  articles.forEach(function(a) {
    var d = new Date(a.date);
    var isToday = d.getTime() >= todayStart;
    var dateStr = isToday 
      ? ('Сегодня, ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)) 
      : (('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear());

    html += '<div class="card" style="border-color: rgba(59, 130, 246, 0.3); padding: 12px; margin-bottom: 10px; cursor: pointer; transition: 0.2s;" onclick="openNewsLink(\'' + escapeJS(a.link) + '\')" onmousedown="this.style.opacity=\'0.7\'" onmouseup="this.style.opacity=\'1\'">' +
              '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                '<div style="font-size: 10px; background: rgba(59,130,246,0.1); color: #60a5fa; padding: 3px 8px; border-radius: 6px; font-weight: 800; text-transform: uppercase;">📰 ' + cleanHtml(a.source) + '</div>' +
                '<div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">' + dateStr + '</div>' +
              '</div>' +
              '<div style="font-size: 14px; font-weight: 600; color: #f8fafc; line-height: 1.4; margin-bottom: 10px;">' + cleanHtml(a.title) + '</div>' +
            '</div>';
  });
  container.innerHTML = html;
}

function loadTableTennisNews() {
  var container = document.getElementById('news-container');
  if (!container) return;

  var cacheKey = 'tt_news_cache_v28'; 
  var cachedData = localStorage.getItem(cacheKey);
  var allArticles = [];

  if (cachedData) {
    try {
      allArticles = JSON.parse(cachedData);
      renderNewsCards(allArticles, container);
    } catch(e) {}
  } else {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-weight: 600;">Сбор свежих новостей... 🏓</div>';
  }

  setTimeout(function() {
    var sources = [
      { name: 'Sports.ru', rss: 'https://www.sports.ru/table-tennis/rss/all.xml' },
      { name: 'Google News', rss: 'https://news.google.com/rss/search?q=' + encodeURIComponent('настольный теннис when:14d') + '&hl=ru&gl=RU&ceid=RU:ru' }
    ];

    var pendingRequests = sources.length;
    var newItemsFound = false;
    var cacheBuster = Math.floor(Date.now() / 3600000); 

    function checkDone() {
      pendingRequests--;
      if (pendingRequests <= 0) {
        if (newItemsFound && allArticles.length > 0) {
          allArticles.sort(function(a, b) { return b.date - a.date; });
          allArticles = allArticles.slice(0, 20); 
          localStorage.setItem(cacheKey, JSON.stringify(allArticles));
          renderNewsCards(allArticles, container);
        } else if (allArticles.length === 0 && !cachedData) {
          container.innerHTML = '<div class="card" style="border-color: rgba(59, 130, 246, 0.3); padding: 16px; text-align: center; cursor: pointer;" onclick="openNewsLink(\'https://www.sports.ru/table-tennis/\')">' +
                                '<div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">Не удалось загрузить ленту</div>' +
                                '<div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Новые турниры пока не начались.</div>' +
                                '<div style="font-size: 13px; color: #3b82f6;">Читать напрямую на Sports.ru ↗</div>' +
                                '</div>';
        }
      }
    }

    sources.forEach(function(source) {
      var rawRssUrl = source.rss + (source.rss.indexOf('?') > -1 ? '&' : '?') + 'cb=' + cacheBuster;
      var proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rawRssUrl);
      
      var fetchPromise = fetch(proxyUrl).then(function(res) { return res.json(); });
      var timeoutPromise = new Promise(function(resolve, reject) { 
        setTimeout(function() { reject(new Error('timeout')); }, 8000);
      });

      Promise.race([fetchPromise, timeoutPromise])
        .then(function(data) {
           if (data && data.items) {
             data.items.forEach(function(item) {
                var parts = (item.title || "").split(' - ');
                var sourceName = source.name; 
                var cleanTitle = item.title;

                if (source.name === 'Google News' && parts.length > 1) {
                  sourceName = parts.pop().trim(); 
                  cleanTitle = parts.join(' - ').trim(); 
                } else if (source.name === 'Sports.ru') {
                  cleanTitle = (item.title || "").trim();
                }

                cleanTitle = cleanTitle.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                sourceName = sourceName.replace(/&quot;/g, '"');

                var dateMs = item.pubDate ? new Date(item.pubDate.replace(/-/g, '/')).getTime() : Date.now();
                var signature = cleanTitle.toLowerCase().replace(/[^а-яa-z0-9]/gi, '').substring(0, 30);
                
                var isDuplicate = allArticles.some(function(a) {
                  return a.title.toLowerCase().replace(/[^а-яa-z0-9]/gi, '').substring(0, 30) === signature;
                });

                var threeWeeksAgo = Date.now() - (21 * 24 * 60 * 60 * 1000);

                if (!isDuplicate && !isNaN(dateMs) && dateMs > threeWeeksAgo) {
                  allArticles.push({ title: cleanTitle, link: item.link, source: sourceName, date: dateMs });
                  newItemsFound = true;
                }
             });
           }
        })
        .catch(function(e) { console.log("Ошибка API новостей:", e); })
        .then(checkDone, checkDone); 
    });
  }, 1000); 
}
