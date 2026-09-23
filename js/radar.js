// js/radar.js — Логика столов, чекинов, таймеров и погоды

function loadParkWeather() {
  var container = document.getElementById('weather-park'); 
  if (!container) return;
  
  var cachedW = localStorage.getItem('tt_weather_cache');
  var cachedTime = localStorage.getItem('tt_weather_cache_ts');
  if (cachedW && cachedTime && (Date.now() - parseInt(cachedTime, 10) < 600000)) {
    container.innerHTML = cachedW;
    return;
  }

  // Защита от бесконечного зависания запроса при блокировках сети
  var fetchPromise = fetch('https://api.open-meteo.com/v1/forecast?latitude=55.25&longitude=61.40&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&wind_speed_unit=ms&timezone=auto');
  var timeoutPromise = new Promise(function(_, reject) {
    setTimeout(function() { reject(new Error('Weather timeout')); }, 4000);
  });

  Promise.race([fetchPromise, timeoutPromise])
  .then(function(res) { return res.json(); })
  .then(function(data) {
    try {
      var c = data.current, d = data.daily;
      if (!c) throw new Error("No current");
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
      var weatherHtml = '<div class="weather-badge"><span>' + getW(c.weather_code) + ', ' + Math.round(c.temperature_2m) + '°C • ветер ' + Math.round(c.wind_speed_10m) + ' м/с (' + getWindDirection(c.wind_direction_10m) + ')</span></div>' + tmrStr;
      container.innerHTML = weatherHtml;
      localStorage.setItem('tt_weather_cache', weatherHtml);
      localStorage.setItem('tt_weather_cache_ts', Date.now().toString());
    } catch (innerE) { 
      container.innerHTML = '<div class="weather-badge"><span>Парк: столы на открытом воздухе 🌳</span></div>'; 
    }
  }).catch(function(e) { 
    if (cachedW) {
      container.innerHTML = cachedW;
    } else {
      container.innerHTML = '<div class="weather-badge"><span>Парк: столы на открытом воздухе 🌳</span></div>';
    }
  });
}

function handleCheckInClick(loc) { 
  if (isUserVerified()) { checkIn(loc); } 
  else { customAlert("❌ Только авторизованные игроки могут занимать столы!"); }
}

function handlePlanClick(loc) { 
  if (isUserVerified()) { activePlanningLoc = loc; document.getElementById('plan-modal').style.display = 'flex'; } 
  else { customAlert("❌ Только авторизованные игроки могут планировать тренировки!"); }
}

function closePlanModal() { document.getElementById('plan-modal').style.display = 'none'; activePlanningLoc = null; }

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

function checkIn(loc) {
  var uid = getVerifiedUserId(); if (!uid) return;
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  var now = Date.now(), otherLoc = loc === 'park' ? 'vostok' : 'park'; var finalList = [];
  
  db.runTransaction(function(t) {
      return Promise.all([t.get(db.collection('locations').doc(loc)), t.get(db.collection('locations').doc(otherLoc))]).then(function(docs) {
          var tDoc = docs[0], oDoc = docs[1];
          var tP = tDoc.exists ? tDoc.data().players || [] : [], oP = oDoc.exists ? oDoc.data().players || [] : [], tPl = tDoc.exists ? tDoc.data().plans || [] : [];
          
          var alreadyIn = false;
          for(var i=0; i<tP.length; i++) { if ((tP[i].uid || tP[i]) === uid) alreadyIn = true; }
          if (alreadyIn) return;

          var fFn = function(p) { return (p.uid || p) !== uid; };
          tP = tP.filter(fFn); oP = oP.filter(fFn); tPl = tPl.filter(fFn);
          
          tP.unshift({ name: currentUserProfile.name, time: now, uid: uid, maxLimitMs: DEFAULT_LIMIT_MS }); finalList = tP;
          t.set(db.collection('locations').doc(loc), { players: tP, plans: tPl }, { merge: true }); 
          t.set(db.collection('locations').doc(otherLoc), { players: oP }, { merge: true });
      });
  }).then(function() {
      hasTriggeredPush = false; 
      if (canSendTgAlert('status_checkin_' + loc + '_' + uid)) {
          sendTelegramAlert("🏓 игрок <b>" + cleanHtml(currentUserProfile.name) + "</b> уже у стола " + LOCATION_NAMES[loc] + "!" + buildBlockquoteList(finalList, "Сейчас за столом") + "\n\nКто составит компанию?");
      }
  }).catch(function(e) {});
}

function leave(loc) {
  var uid = getVerifiedUserId(); if (!uid) return; 
  var spentMins = 0, spentStr = "", finalList = [];
  
  db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(loc)).then(function(d) {
          if (!d.exists) return;
          var p = d.data().players || [];
          var cPlayer = null;
          for(var i=0; i<p.length; i++) { if ((p[i].uid || p[i]) === uid) cPlayer = p[i]; }
          
          if (cPlayer) { 
              var tParsed = parseTime(cPlayer.time);
              if (tParsed > 0) {
                spentMins = Math.floor((Date.now() - tParsed) / 60000); 
                var limitMins = Math.floor((cPlayer.maxLimitMs || DEFAULT_LIMIT_MS) / 60000);
                if (spentMins > limitMins) spentMins = limitMins;
                spentStr = formatDuration(tParsed); 
              }
          }
          p = p.filter(function(pl) { return (pl.uid || pl) !== uid; }); finalList = p;
          t.set(db.collection('locations').doc(loc), { players: p }, { merge: true });
      });
  }).then(function() {
      if (spentMins > 0) recordTrainingTime(uid, currentUserProfile.name, spentMins);
      document.getElementById('extend-modal').style.display = 'none'; hasTriggeredPush = false;
      if (canSendTgAlert('status_leave_' + loc + '_' + uid)) {
          sendTelegramAlert("👋 игрок <b>" + cleanHtml(currentUserProfile.name) + "</b> закончил тренировку и покинул стол " + LOCATION_NAMES[loc] + (spentStr ? " (время: <code>" + spentStr + "</code>)." : ".") + (finalList.length > 0 ? buildBlockquoteList(finalList, "Остались у столов") : "\n\n<i>(столы освободились)</i>"));
      }
  }).catch(function(e) {});
}

function confirmLeaveFromModal() { if (currentUserActiveLoc) leave(currentUserActiveLoc); }

function extendSession(addMins) {
  var uid = getVerifiedUserId(); if (!uid || !currentUserActiveLoc) return;
  db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(currentUserActiveLoc)).then(function(d) {
          if(!d.exists) return;
          var p = (d.data().players || []).map(function(pl) {
              if ((pl.uid||pl) === uid) {
                  var nPl = {};
                  for(var k in pl) nPl[k] = pl[k];
                  nPl.maxLimitMs = (pl.maxLimitMs||DEFAULT_LIMIT_MS) + (addMins*60000);
                  return nPl;
              }
              return pl;
          });
          t.set(db.collection('locations').doc(currentUserActiveLoc), { players: p }, { merge: true });
      });
  }).then(function() {
      hasTriggeredPush = false; document.getElementById('extend-modal').style.display = 'none';
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
          pl.push({ name: currentUserProfile.name, planTime: ts, uid: uid }); t.set(db.collection('locations').doc(loc), { plans: pl }, { merge: true });
      });
  }).then(function() {
      if (canSendTgAlert('status_plan_' + loc + '_' + uid)) sendTelegramAlert("⏳ игрок <b>" + cleanHtml(currentUserProfile.name) + "</b> планирует быть у стола " + LOCATION_NAMES[loc] + " <b>" + formatUntil(ts) + "</b>!\n\nКто готов составить пару?");
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

function monitorSessions() {
  var now = Date.now();
  ['park', 'vostok'].forEach(function(loc) {
    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(loc)).then(function(doc) {
        if (!doc.exists) return null;
        var players = doc.data().players || [], plans = doc.data().plans || [], changed = false, activePlayers = [], leftPlayers = [];
        for (var i = 0; i < players.length; i++) {
          var p = players[i]; 
          var pTime = parseTime(p.time) || now;
          var elapsed = now - pTime;
          if (elapsed >= (p.maxLimitMs || DEFAULT_LIMIT_MS)) { 
              changed = true; 
              var limitMins = Math.floor((p.maxLimitMs || DEFAULT_LIMIT_MS) / 60000);
              var actualMins = Math.floor(elapsed / 60000);
              var recordedMins = actualMins > limitMins ? limitMins : actualMins;
              recordTrainingTime(p.uid, p.name || 'Игрок', recordedMins); 
              leftPlayers.push({ uid: p.uid, name: p.name || 'Игрок', durationStr: formatMinutes(recordedMins) }); 
          } 
          else { activePlayers.push(p); }
        }
        var activePlans = plans.filter(function(pl) { 
          var pt = parseTime(pl.planTime);
          if (!pt || now > pt + 300000) { changed = true; return false; } 
          return true; 
        });
        if (changed) { t.set(db.collection('locations').doc(loc), { players: activePlayers, plans: activePlans }, { merge: true }); return { leftPlayers: leftPlayers, remainingList: activePlayers, locName: LOCATION_NAMES[loc] }; }
        return null;
      });
    }).then(function(res) {
      if (res && res.leftPlayers && res.leftPlayers.length > 0) { 
          for (var i = 0; i < res.leftPlayers.length; i++) {
              var lp = res.leftPlayers[i];
              if (canSendTgAlert('status_leave_' + loc + '_' + lp.uid)) {
                  sendTelegramAlert('👋 игрок <b>' + cleanHtml(lp.name) + '</b> закончил тренировку и покинул стол ' + res.locName + ' (время: <code>' + lp.durationStr + '</code>).' + (res.remainingList.length > 0 ? buildBlockquoteList(res.remainingList, "Остались у столов") : '\n\n<i>(столы освободились)</i>')); 
              }
          }
      }
    }).catch(function(e){});
  });
}

function renderAll() {
  var myUid = getVerifiedUserId(); var now = Date.now();
  currentUserActiveLoc = null; currentUserActivePlayer = null;

  ['park', 'vostok'].forEach(function(loc) {
    try {
      var rawData = locationsData[loc] || { players: [], plans: [] };
      
      var players = (rawData.players || []).filter(function(p) { 
        var pt = parseTime(p.time);
        if (!pt) return true;
        return (now - pt) < (p.maxLimitMs || DEFAULT_LIMIT_MS); 
      });

      var plans = (rawData.plans || []).filter(function(p) { 
        var pt = parseTime(p.planTime);
        if (!pt) return false;
        return pt + 300000 > now; 
      });
      
      var badge = document.getElementById('badge-' + loc); 
      if(badge) { badge.innerText = players.length + ' ' + getPlayersCountSuffix(players.length); badge.className = players.length > 0 ? 'counter has-players' : 'counter'; }

      var listEl = document.getElementById('list-' + loc);
      if(listEl) {
        if (players.length === 0) { listEl.innerHTML = '<span class="empty-note">У столов пока свободно</span>'; } 
        else { 
            var pRows = [];
            for(var i=0; i<players.length; i++) {
                var item = players[i];
                var itemTime = parseTime(item.time) || Date.now();
                pRows.push('<div class="player-row"><div class="player-name"><span>🏓</span><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(item.uid) + '\')">' + cleanHtml(item.name || 'Игрок') + '</span></div><div style="display: flex; align-items: center; gap: 8px;"><div class="player-time-box"><span>с ' + formatTime(itemTime) + '</span><span class="time-badge">'+ formatDuration(itemTime) + '</span></div>' + (item.uid ? '<button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(item.uid) + '\')">i</button>' : '') + '</div></div>');
            }
            listEl.innerHTML = pRows.join(''); 
        }
      }

      var planListEl = document.getElementById('plan-list-' + loc);
      if(planListEl) {
        if (plans.length === 0) { planListEl.innerHTML = '<span class="empty-note">Никто не планировал</span>'; } 
        else { 
            var plRows = [];
            for(var j=0; j<plans.length; j++) {
                var p = plans[j];
                var pPlanTime = parseTime(p.planTime);
                plRows.push('<div class="player-row"><div class="player-name"><span>⏳</span><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(p.uid) + '\')">' + cleanHtml(p.name || 'Игрок') + '</span></div><div style="display: flex; align-items: center; gap: 8px;"><div class="player-time-box"><span>к ' + formatTime(pPlanTime) + '</span><span class="time-badge-plan">' + formatUntil(pPlanTime) + '</span></div>' + (p.uid ? '<button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(p.uid) + '\')">i</button>' : '') + '</div></div>');
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
            currentUserActiveLoc = loc; currentUserActivePlayer = activePlayerObj; 
            btnBox.innerHTML = '<div style="font-size: 11px; color: #059669; text-align: center; margin-bottom: 2px;">✅ Вы у этого стола</div><button class="btn btn-leave" onclick="leave(\'' + loc + '\')">👋 Покинуть стол</button>'; 
        } else if (isUserOpened) { 
            btnBox.innerHTML = '<button class="btn btn-join" onclick="handleCheckInClick(\'' + loc + '\')">🏓 Я уже пришел</button><button class="btn btn-leave" style="padding: 8px; font-size: 13px;" onclick="cancelPlan(\'' + loc + '\')">Отменить визит</button>'; 
        } else { 
            btnBox.innerHTML = '<button class="btn btn-join" onclick="handleCheckInClick(\'' + loc + '\')">🏓 Я уже у стола</button><button class="btn btn-plan" onclick="handlePlanClick(\'' + loc + '\')">⏳ Буду позже...</button>'; 
        }
      }
    } catch(e) {}
  });

  if (currentUserActiveLoc && currentUserActivePlayer) {
    var pTime = parseTime(currentUserActivePlayer.time) || Date.now();
    var elap = Date.now() - pTime;
    var lim = currentUserActivePlayer.maxLimitMs || DEFAULT_LIMIT_MS;
    if (elap >= (lim - REMIND_BEFORE_MS) && elap < lim) { 
        document.getElementById('extend-modal').style.display = 'flex'; 
        if(!hasTriggeredPush) { hasTriggeredPush = true; sendDevicePushNotification("🏓 Настольный теннис ЧМЗ", "Вы уже 1 ч 45 мин у стола! Продлите визит."); } 
    } else { document.getElementById('extend-modal').style.display = 'none'; } 
  } else { document.getElementById('extend-modal').style.display = 'none'; hasTriggeredPush = false; }
}
