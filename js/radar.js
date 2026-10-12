// js/radar.js — Логика столов, чекинов, таймеров и отказоустойчивой погоды

// ==========================================
// ПОГОДНЫЙ ВИДЖЕТ (Идеальная версия: Fail-Fast 2.5 сек)
// ==========================================
function loadParkWeather() {
  var container = document.getElementById('weather-park'); 
  if (!container) return;
  
  var cachedW = localStorage.getItem('tt_weather_cache');
  var cachedTime = localStorage.getItem('tt_weather_cache_ts');
  if (cachedW && cachedTime && (Date.now() - parseInt(cachedTime, 10) < 600000)) {
    container.innerHTML = cachedW;
    return;
  }

  var getWindDirection = function(deg) {
    if (deg >= 337.5 || deg < 22.5) return 'С';
    if (deg >= 22.5 && deg < 67.5) return 'СВ';
    if (deg >= 67.5 && deg < 112.5) return 'В';
    if (deg >= 112.5 && deg < 157.5) return 'ЮВ';
    if (deg >= 157.5 && deg < 202.5) return 'Ю';
    if (deg >= 202.5 && deg < 247.5) return 'ЮЗ';
    if (deg >= 247.5 && deg < 292.5) return 'З';
    return 'СЗ';
  };

  var url = 'https://api.open-meteo.com/v1/forecast?latitude=55.25&longitude=61.40&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&wind_speed_unit=ms&timezone=auto&_t=' + Date.now();

  var fetchPromise = fetch(url, { cache: 'no-store' }).then(function(res) { return res.json(); });
  
  var timeoutPromise = new Promise(function(_, reject) {
    setTimeout(function() { reject(new Error('Weather timeout')); }, 2500);
  });

  Promise.race([fetchPromise, timeoutPromise])
  .then(function(data) {
    try {
      var c = data.current, d = data.daily;
      if (!c) throw new Error("No current data");
      
      var getW = function(code) { 
        if(code <= 3) return code == 0 ? "☀️ Ясно" : "⛅️ Облачно"; 
        if(code <= 67) return "🌧 Дождь"; 
        if(code <= 77) return "❄️ Снег"; 
        return "🌧 Ливень"; 
      };
      
      var tmrStr = '';
      if (d && d.weather_code && d.weather_code.length > 1 && d.temperature_2m_min && d.temperature_2m_max) {
          tmrStr = '<div class="weather-badge" style="background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.2); color: #9333ea; margin-top: 4px;"><span>Завтра: ' + getW(d.weather_code[1]).split(' ')[1].toLowerCase() + ', от ' + Math.round(d.temperature_2m_min[1]) + '° до ' + Math.round(d.temperature_2m_max[1]) + '°C</span></div>';
      }
      
      var weatherDesc = getW(c.weather_code); 
      var weatherHtml = '<div class="weather-badge"><span>' + weatherDesc + ', ' + Math.round(c.temperature_2m) + '°C • ветер ' + Math.round(c.wind_speed_10m) + ' м/с (' + getWindDirection(c.wind_direction_10m) + ')</span></div>' + tmrStr;
      
      container.innerHTML = weatherHtml;
      localStorage.setItem('tt_weather_cache', weatherHtml);
      localStorage.setItem('tt_weather_cache_ts', Date.now().toString());

    } catch (innerE) { 
      if (cachedW) container.innerHTML = cachedW;
      else container.innerHTML = '<div class="weather-badge"><span>Парк: столы на открытом воздухе 🌳</span></div>'; 
    }
  }).catch(function(e) { 
    if (cachedW) container.innerHTML = cachedW;
    else container.innerHTML = '<div class="weather-badge"><span>Парк: столы на открытом воздухе 🌳</span></div>';
  });
}

function handleCheckInClick(loc) { 
  if (isUserVerified()) { checkIn(loc); } 
  else { if(typeof customAlert==='function') customAlert("❌ Только авторизованные игроки могут занимать столы!"); }
}

function handlePlanClick(loc) { 
  if (isUserVerified()) { activePlanningLoc = loc; openModalSmoothly('plan-modal'); } 
  else { if(typeof customAlert==='function') customAlert("❌ Только авторизованные игроки могут планировать тренировки!"); }
}

function closePlanModal() { 
  if(typeof closeModalSmoothly === 'function') closeModalSmoothly('plan-modal'); 
  activePlanningLoc = null; 
}

function recordTrainingTime(uid, name, durationMinutes) {
  if (!uid || durationMinutes <= 0) return Promise.resolve();
  var userRef = db.collection('leaderboard').doc(uid);
  return db.runTransaction(function(t) {
    return t.get(userRef).then(function(doc) {
        var data = doc.exists ? doc.data() : { name: name, totalMinutes: 0, sessions: 0 };
        t.set(userRef, {
          name: name,
          uid: uid,
          totalMinutes: (data.totalMinutes || 0) + durationMinutes,
          sessions: (data.sessions || 0) + 1,
          lastPlayed: Date.now()
        }, { merge: true });
    });
  }).catch(function(e) {});
}

window.isTableActionRunning = false; 

// ==========================================
// БЕЗОПАСНЫЙ CHECK-IN (Не стирает чужих игроков)
// ==========================================
function checkIn(loc) {
  var uid = getVerifiedUserId(); if (!uid) return;
  if (window.isTableActionRunning) return; 
  window.isTableActionRunning = true;

  var btnBox = document.getElementById('btn-container-' + loc);
  if (btnBox) btnBox.innerHTML = '<div style="padding: 12px; font-size: 13px; font-weight: bold; color: var(--accent-sky); text-align: center;">⏳ Отмечаем...</div>';

  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  var now = Date.now(), otherLoc = loc === 'park' ? 'vostok' : 'park'; var finalList = [];
  
  db.runTransaction(function(t) {
      return Promise.all([t.get(db.collection('locations').doc(loc)), t.get(db.collection('locations').doc(otherLoc))]).then(function(docs) {
          var tDoc = docs[0], oDoc = docs[1];
          var tP = tDoc.exists ? tDoc.data().players || [] : [], oP = oDoc.exists ? oDoc.data().players || [] : [], tPl = tDoc.exists ? tDoc.data().plans || [] : [];
          
          var alreadyIn = false;
          for(var i=0; i<tP.length; i++) { if ((tP[i].uid || tP[i]) === uid) alreadyIn = true; }
          if (alreadyIn) return; // Мы уже тут

          // Удаляем себя из всех списков. Чужих игроков НЕ ТРОГАЕМ.
          var fFn = function(p) { return (p.uid || p) !== uid; };
          tP = tP.filter(fFn); oP = oP.filter(fFn); tPl = tPl.filter(fFn);
          
         tP.unshift({ 
    name: currentUserProfile.name || 'Игрок', 
    time: now, 
    uid: uid, 
    avatarSvg: currentUserProfile.avatarSvg || '', 
    maxLimitMs: (typeof DEFAULT_LIMIT_MS !== 'undefined' ? DEFAULT_LIMIT_MS : 7200000) 
});
          finalList = tP;
          
          t.set(db.collection('locations').doc(loc), { players: tP, plans: tPl }, { merge: true }); 
          t.set(db.collection('locations').doc(otherLoc), { players: oP }, { merge: true });
      });
  }).then(function() {
      if(typeof hasTriggeredPush !== 'undefined') hasTriggeredPush = false; 
      if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_checkin_' + loc + '_' + uid)) {
          var lName = typeof LOCATION_NAMES !== 'undefined' ? LOCATION_NAMES[loc] : (loc === 'vostok' ? 'в ДК «Восток»' : 'в парке им. Тищенко');
          if (typeof sendTelegramAlert === 'function') sendTelegramAlert("🏓 игрок <b>" + cleanHtml(currentUserProfile.name || 'Игрок') + "</b> уже у стола " + lName + "!" + (typeof buildBlockquoteList === 'function' ? buildBlockquoteList(finalList, "Сейчас за столом") : "") + "\n\nКто составит компанию?");
      }
      window.isTableActionRunning = false; 
      if(typeof renderAll === 'function') renderAll(); 
  }).catch(function(e) { 
      window.isTableActionRunning = false; 
      if(typeof renderAll === 'function') renderAll(); 
  });
}

function leave(loc) {
  var uid = getVerifiedUserId(); if (!uid) return; 
  if (window.isTableActionRunning) return; 
  window.isTableActionRunning = true;

  var btnBox = document.getElementById('btn-container-' + loc);
  if (btnBox) btnBox.innerHTML = '<div style="padding: 12px; font-size: 13px; font-weight: bold; color: var(--text-muted); text-align: center;">⏳ Выходим...</div>';

  var spentMins = 0, spentStr = "", finalList = [];
  
  db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(loc)).then(function(d) {
          if (!d.exists) return;
          var p = d.data().players || [];
          var cPlayer = null;
          for(var i=0; i<p.length; i++) { if ((p[i].uid || p[i]) === uid) cPlayer = p[i]; }
          
          if (cPlayer) { 
              var tParsed = typeof parseTime === 'function' ? parseTime(cPlayer.time) : cPlayer.time;
              if (tParsed > 0) {
                spentMins = Math.floor((Date.now() - tParsed) / 60000); 
                var limitMins = Math.floor((cPlayer.maxLimitMs || 7200000) / 60000);
                if (spentMins > limitMins) spentMins = limitMins;
                if(typeof formatDuration === 'function') spentStr = formatDuration(tParsed); 
              }
          }
          p = p.filter(function(pl) { return (pl.uid || pl) !== uid; }); finalList = p;
          t.set(db.collection('locations').doc(loc), { players: p }, { merge: true });
      });
  }).then(function() {
      if (spentMins > 0) recordTrainingTime(uid, currentUserProfile.name || 'Игрок', spentMins);
      if(typeof closeModalSmoothly === 'function') closeModalSmoothly('extend-modal'); 
      if(typeof hasTriggeredPush !== 'undefined') hasTriggeredPush = false;
      
      if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_leave_' + loc + '_' + uid)) {
          var lName = typeof LOCATION_NAMES !== 'undefined' ? LOCATION_NAMES[loc] : (loc === 'vostok' ? 'в ДК «Восток»' : 'в парке им. Тищенко');
          if (typeof sendTelegramAlert === 'function') sendTelegramAlert("👋 игрок <b>" + cleanHtml(currentUserProfile.name || 'Игрок') + "</b> закончил тренировку и покинул стол " + lName + (spentStr ? " (время: <code>" + spentStr + "</code>)." : ".") + (finalList.length > 0 && typeof buildBlockquoteList === 'function' ? buildBlockquoteList(finalList, "Остались у столов") : "\n\n<i>(столы освободились)</i>"));
      }
      window.isTableActionRunning = false; 
      if(typeof renderAll === 'function') renderAll(); 
  }).catch(function(e) { 
      window.isTableActionRunning = false; 
      if(typeof renderAll === 'function') renderAll(); 
  });
}

function confirmLeaveFromModal() { if (typeof currentUserActiveLoc !== 'undefined' && currentUserActiveLoc) leave(currentUserActiveLoc); }

function extendSession(addMins) {
  var uid = getVerifiedUserId(); if (!uid || typeof currentUserActiveLoc === 'undefined' || !currentUserActiveLoc) return;
  db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(currentUserActiveLoc)).then(function(d) {
          if(!d.exists) return;
          var p = (d.data().players || []).map(function(pl) {
              if ((pl.uid||pl) === uid) {
                  var nPl = {};
                  for(var k in pl) nPl[k] = pl[k];
                  nPl.maxLimitMs = (pl.maxLimitMs || 7200000) + (addMins*60000);
                  return nPl;
              }
              return pl;
          });
          t.set(db.collection('locations').doc(currentUserActiveLoc), { players: p }, { merge: true });
      });
  }).then(function() {
      if(typeof hasTriggeredPush !== 'undefined') hasTriggeredPush = false; 
      if(typeof closeModalSmoothly === 'function') closeModalSmoothly('extend-modal');
  }).catch(function(e) {});
}

function submitQuickPlan(m) { applyPlan(Date.now() + m * 60000); }

function submitExactPlan() { 
    var val = document.getElementById('exact-time-input').value; if(!val) return; 
    var parts = val.split(':'); var d = new Date(); d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0); 
    if(d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); 
    applyPlan(d.getTime()); 
}

function applyPlan(ts) {
  var uid = getVerifiedUserId(), loc = activePlanningLoc; if(!uid || !loc) return; closePlanModal();
  db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(loc)).then(function(d) {
          var pl = (d.exists ? d.data().plans || [] : []).filter(function(p) { return (p.uid||p) !== uid; });
          pl.push({ 
    name: currentUserProfile.name || 'Игрок', 
    planTime: ts, 
    uid: uid, 
    avatarSvg: currentUserProfile.avatarSvg || '' 
}); 
          t.set(db.collection('locations').doc(loc), { plans: pl }, { merge: true });
      });
  }).then(function() {
      if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_plan_' + loc + '_' + uid)) {
          var lName = typeof LOCATION_NAMES !== 'undefined' ? LOCATION_NAMES[loc] : (loc === 'vostok' ? 'в ДК «Восток»' : 'в парке им. Тищенко');
          if(typeof sendTelegramAlert === 'function') sendTelegramAlert("⏳ игрок <b>" + cleanHtml(currentUserProfile.name || 'Игрок') + "</b> планирует быть у стола " + lName + " <b>" + (typeof formatUntil==='function' ? formatUntil(ts) : '') + "</b>!\n\nКто готов составить пару?");
      }
  }).catch(function(e) {});
}

function cancelPlan(loc) { 
    var uid = getVerifiedUserId(); if(!uid) return; 
    db.runTransaction(function(t) { 
        return t.get(db.collection('locations').doc(loc)).then(function(d) { 
            if(!d.exists) return; 
            t.set(db.collection('locations').doc(loc), { plans: (d.data().plans || []).filter(function(p) { return (p.uid||p) !== uid; }) }, { merge: true }); 
        }); 
    }).catch(function(e) {}); 
}

function closeExtendModal() {
  if(typeof closeModalSmoothly === 'function') closeModalSmoothly('extend-modal');
}

// ==========================================
// УМНЫЙ МОНИТОРИНГ (Удаляет ТОЛЬКО себя)
// ==========================================
function monitorSessions() {
  var myUid = getVerifiedUserId();
  var now = Date.now();
  
  ['park', 'vostok'].forEach(function(loc) {
    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(loc)).then(function(doc) {
        if (!doc.exists) return null;
        
        var players = doc.data().players || [];
        var plans = doc.data().plans || [];
        var changed = false;
        var activePlayers = [];
        var activePlans = [];
        var leftPlayers = [];
        
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            var pTime = typeof parseTime === 'function' ? parseTime(p.time) : p.time;
            var elapsed = now - (pTime || now);
            var limit = p.maxLimitMs || 7200000;
            
            var isMe = myUid && ((p.uid || p) === myUid);
            
            if (isMe && elapsed >= limit) {
                // Мое время вышло - выгоняем САМОГО СЕБЯ
                changed = true;
                leftPlayers.push({ uid: p.uid, name: p.name || 'Игрок', recordedMins: Math.floor(limit / 60000) });
            } else if (!isMe && elapsed >= limit + 10800000) { 
                // Чужое время вышло 3 часа назад (защита от сломанных часов/приложений)
                changed = true;
            } else {
                activePlayers.push(p);
            }
        }
        
        for (var j = 0; j < plans.length; j++) {
            var pl = plans[j];
            var pt = typeof parseTime === 'function' ? parseTime(pl.planTime) : pl.planTime;
            var isMyPlan = myUid && ((pl.uid || pl) === myUid);
            if (!pt) continue;
            
            if (isMyPlan && now > pt + 300000) { 
                changed = true; // Свой план истек 5 мин назад
            } else if (!isMyPlan && now > pt + 10800000) { 
                changed = true; // Чужой план висит 3 часа
            } else {
                activePlans.push(pl);
            }
        }

        if (changed) {
            t.set(db.collection('locations').doc(loc), { players: activePlayers, plans: activePlans }, { merge: true });
            return { leftPlayers: leftPlayers, locName: typeof LOCATION_NAMES !== 'undefined' ? LOCATION_NAMES[loc] : (loc === 'vostok' ? 'в ДК «Восток»' : 'в парке им. Тищенко') };
        }
        return null;
      });
    }).then(function(res) {
        if (res && res.leftPlayers && res.leftPlayers.length > 0) {
            res.leftPlayers.forEach(function(lp) {
                recordTrainingTime(lp.uid, lp.name, lp.recordedMins);
                if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_leave_' + loc + '_' + lp.uid)) {
                    if (typeof sendTelegramAlert === 'function') sendTelegramAlert('👋 игрок <b>' + cleanHtml(lp.name) + '</b> закончил тренировку (время вышло) и покинул стол ' + res.locName + '.');
                }
            });
        }
    }).catch(function(e) {});
  });
}

function renderAll() {
  var myUid = getVerifiedUserId(); var now = Date.now();
  if (typeof currentUserActiveLoc !== 'undefined') currentUserActiveLoc = null; 
  if (typeof currentUserActivePlayer !== 'undefined') currentUserActivePlayer = null;

  ['park', 'vostok'].forEach(function(loc) {
    try {
      var rawData = (typeof locationsData !== 'undefined' && locationsData[loc]) ? locationsData[loc] : { players: [], plans: [] };
      
      var players = (rawData.players || []).filter(function(p) { 
        var pt = typeof parseTime === 'function' ? parseTime(p.time) : p.time;
        if (!pt) return true;
        return (now - pt) < (p.maxLimitMs || 7200000); 
      });

      var plans = (rawData.plans || []).filter(function(p) { 
        var pt = typeof parseTime === 'function' ? parseTime(p.planTime) : p.planTime;
        if (!pt) return false;
        return pt + 300000 > now; 
      });
      
      var badge = document.getElementById('badge-' + loc); 
      if(badge) { badge.innerText = players.length + ' ' + (typeof getPlayersCountSuffix === 'function' ? getPlayersCountSuffix(players.length) : 'игр.'); badge.className = players.length > 0 ? 'counter has-players' : 'counter'; }

      // 1. РЕНДЕР ИГРОКОВ ЗА СТОЛОМ (С МИНИ-АВАТАРАМИ)
      var listEl = document.getElementById('list-' + loc);
      if(listEl) {
        if (players.length === 0) { listEl.innerHTML = '<span class="empty-note">У столов пока свободно</span>'; } 
        else { 
            var pRows = [];
            for(var i=0; i<players.length; i++) {
                var item = players[i];
                var itemTime = typeof parseTime === 'function' ? parseTime(item.time) : (item.time || Date.now());
                var avatarHtml = item.avatarSvg ? '<div class="mini-avatar">' + item.avatarSvg + '</div>' : '<div class="mini-avatar">👤</div>';
                
                pRows.push('<div class="player-row"><div class="player-name">' + avatarHtml + '<span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(item.uid) + '\')">' + cleanHtml(item.name || 'Игрок') + '</span></div><div style="display: flex; align-items: center; gap: 8px;"><div class="player-time-box"><span>с ' + (typeof formatTime === 'function' ? formatTime(itemTime) : '') + '</span><span class="time-badge">'+ (typeof formatDuration === 'function' ? formatDuration(itemTime) : '') + '</span></div>' + (item.uid ? '<button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(item.uid) + '\')">i</button>' : '') + '</div></div>');
            }
            listEl.innerHTML = pRows.join(''); 
        }
      }

      // 2. РЕНДЕР ПЛАНИРУЮЩИХ (С МИНИ-АВАТАРАМИ)
      var planListEl = document.getElementById('plan-list-' + loc);
      if(planListEl) {
        if (plans.length === 0) { planListEl.innerHTML = '<span class="empty-note">Никто не планировал</span>'; } 
        else { 
            var plRows = [];
            for(var j=0; j<plans.length; j++) {
                var p = plans[j];
                var pPlanTime = typeof parseTime === 'function' ? parseTime(p.planTime) : p.planTime;
                var avatarHtml = p.avatarSvg ? '<div class="mini-avatar">' + p.avatarSvg + '</div>' : '<div class="mini-avatar">👤</div>';
                
                plRows.push('<div class="player-row"><div class="player-name">' + avatarHtml + '<span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(p.uid) + '\')">' + cleanHtml(p.name || 'Игрок') + '</span></div><div style="display: flex; align-items: center; gap: 8px;"><div class="player-time-box"><span>к ' + (typeof formatTime === 'function' ? formatTime(pPlanTime) : '') + '</span><span class="time-badge-plan">' + (typeof formatUntil === 'function' ? formatUntil(pPlanTime) : '') + '</span></div>' + (p.uid ? '<button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(p.uid) + '\')">i</button>' : '') + '</div></div>');
            }
            planListEl.innerHTML = plRows.join(''); 
        }
      }

      var activePlayerObj = null; for(var x=0; x<players.length; x++) { if((players[x].uid||players[x])===myUid) activePlayerObj = players[x]; }
      var isUserOpened = false; for(var y=0; y<plans.length; y++) { if((plans[y].uid||plans[y])===myUid) isUserOpened = true; }
      var btnBox = document.getElementById('btn-container-' + loc);
      
      if(btnBox) {
        if (!myUid) {
          btnBox.innerHTML = '<button class="btn btn-join" style="background: var(--card-border);" onclick="customAlert(\'Сначала авторизуйтесь!\')">🔐 Войти в клуб</button>';
        } else if (activePlayerObj) { 
            if(typeof currentUserActiveLoc !== 'undefined') currentUserActiveLoc = loc; 
            if(typeof currentUserActivePlayer !== 'undefined') currentUserActivePlayer = activePlayerObj; 
            btnBox.innerHTML = '<div style="font-size: 11px; color: #059669; text-align: center; margin-bottom: 2px;">✅ Вы у этого стола</div><button class="btn btn-leave" onclick="leave(\'' + loc + '\')">👋 Покинуть стол</button>'; 
        } else if (isUserOpened) { 
            btnBox.innerHTML = '<button class="btn btn-join" onclick="handleCheckInClick(\'' + loc + '\')">🏓 Я уже пришел</button><button class="btn btn-leave" style="padding: 8px; font-size: 13px;" onclick="cancelPlan(\'' + loc + '\')">Отменить визит</button>'; 
        } else { 
            btnBox.innerHTML = '<button class="btn btn-join" onclick="handleCheckInClick(\'' + loc + '\')">🏓 Я уже у стола</button><button class="btn btn-plan" onclick="handlePlanClick(\'' + loc + '\')">⏳ Буду позже...</button>'; 
        }
      }
    } catch(e) {}
  });

  if (typeof currentUserActiveLoc !== 'undefined' && currentUserActiveLoc && currentUserActivePlayer) {
    var pTime = typeof parseTime === 'function' ? parseTime(currentUserActivePlayer.time) : (currentUserActivePlayer.time || Date.now());
    var elap = Date.now() - pTime;
    var lim = currentUserActivePlayer.maxLimitMs || 7200000;
    var rem = typeof REMIND_BEFORE_MS !== 'undefined' ? REMIND_BEFORE_MS : 900000;
    if (elap >= (lim - rem) && elap < lim) { 
        document.getElementById('extend-modal').style.display = 'flex'; 
        if(typeof hasTriggeredPush !== 'undefined' && !hasTriggeredPush) { 
            hasTriggeredPush = true; 
            if (typeof sendDevicePushNotification === 'function') sendDevicePushNotification("🏓 Настольный теннис ЧМЗ", "Вы уже давно у стола! Продлите визит."); 
        } 
    } else { document.getElementById('extend-modal').style.display = 'none'; } 
  } else { 
      var extModal = document.getElementById('extend-modal');
      if (extModal) extModal.style.display = 'none'; 
      if (typeof hasTriggeredPush !== 'undefined') hasTriggeredPush = false; 
  }
}
