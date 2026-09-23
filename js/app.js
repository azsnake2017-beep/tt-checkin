function getCustomBadge(uid) {
  if (!uid) return '';
  if (uid === 'google_XUE0DYY6WoMfkI3TmG7o2HqPUEm1') return '<span class="platform-badge badge-teacher">Учитель 🎓</span>';
  if (uid === 'tg_750209461') return '<span class="platform-badge badge-temshik">Темщик 🕶️</span>';
  if (uid === 'tg_6126323287') return '<span class="platform-badge badge-hockey">Хоккеист 🏒</span>';
  if (uid === 'google_qW1ZyRnvm4UvEO3tMdQpx5ltcQM2') return '<span class="platform-badge badge-bot">Бот 🤖</span>';
  if (uid === 'tg_5170799634' || uid === 'google_vu6OeCWP8WXqNVUkI1hDPTD13ri1') return '<span class="platform-badge badge-coach">Тренер 📋</span>';
  return '';
}

function openExternalLink(url) {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) { 
      window.Telegram.WebApp.openLink(url); 
  } else { 
      window.open(url, '_blank'); 
  }
}

function getInventoryRowHtml(icon, label, value, searchPrefix) {
  if (!value) return '';
  var query = encodeURIComponent(searchPrefix + ' ' + value);
  var url = 'https://www.google.com/search?q=' + query;
  return '<div class="inventory-item"><div class="inventory-item-left"><span>' + icon + '</span> <span style="color: var(--text-muted);">' + label + '</span> <span class="inventory-value">' + cleanHtml(value) + '</span></div><button class="btn-info" style="width: 22px; height: 22px; font-size: 11px; padding: 0;" onclick="openExternalLink(\'' + url + '\')">i</button></div>';
}

function isUserVerified() {
  var tgUser = null;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  }
  var tgId = tgUser ? tgUser.id : null;
  var localId = localStorage.getItem('tt_member_id');
  var localMatch = false;
  if (localId && (localId.indexOf('tg_') === 0 || localId.indexOf('google_') === 0)) { localMatch = true; }
  return !!(tgId || localMatch);
}

function getVerifiedUserId() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      if (window.Telegram.WebApp.initDataUnsafe.user.id) {
          return 'tg_' + window.Telegram.WebApp.initDataUnsafe.user.id;
      }
  }
  var id = localStorage.getItem('tt_member_id');
  if (id && (id.indexOf('tg_') === 0 || id.indexOf('google_') === 0)) return id;
  return null;
}

function isSuperAdmin() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      if (window.Telegram.WebApp.initDataUnsafe.user.username && window.Telegram.WebApp.initDataUnsafe.user.username.toLowerCase() === 'azsnake') {
          return true;
      }
  }
  var uid = getVerifiedUserId();
  return uid ? (ADMIN_UIDS.indexOf(uid) !== -1) : false;
}

window.onTelegramAuth = function(user) {
  var uid = 'tg_' + user.id; 
  var defaultName = (user.first_name + (user.last_name ? ' ' + user.last_name : '')).trim() || user.username || "Игрок";
  var savedId = localStorage.getItem('tt_member_id');
  var savedName = localStorage.getItem('tt_name');
  var uiName = (savedId === uid && savedName) ? savedName : defaultName;
  
  localStorage.setItem('tt_member_id', uid);
  
  currentUserProfile = { uid: uid, name: uiName, elo: 1000, isVerified: true, totalMinutes: currentUserProfile.totalMinutes || 0 };
  var authScreen = document.getElementById('mandatory-auth-screen');
  if (authScreen) authScreen.style.display = 'none';
  subscribeToUserLeaderboard(uid);
  updateProfileDisplay();
  renderAll();

  syncUserProfile(uid, defaultName, 'tg');
};

function loginWithGoogle() {
  firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function(res) {
    if (res && res.user) {
      var uid = 'google_' + res.user.uid; 
      var defaultName = res.user.displayName || res.user.email.split('@')[0];
      var savedId = localStorage.getItem('tt_member_id');
      var savedName = localStorage.getItem('tt_name');
      var uiName = (savedId === uid && savedName) ? savedName : defaultName;
      
      localStorage.setItem('tt_member_id', uid);
      
      currentUserProfile = { uid: uid, name: uiName, elo: 1000, isVerified: true, totalMinutes: currentUserProfile.totalMinutes || 0 };
      var authScreen = document.getElementById('mandatory-auth-screen');
      if (authScreen) authScreen.style.display = 'none';
      subscribeToUserLeaderboard(uid);
      updateProfileDisplay();
      renderAll();

      syncUserProfile(uid, defaultName, 'google');
    }
  }).catch(function(e) { customAlert("Ошибка входа: " + e.message); });
}

function logoutProfile() {
  firebase.auth().signOut().then(function(){}).catch(function(){});
  localStorage.removeItem('tt_member_id'); 
  localStorage.removeItem('tt_name');
  window.location.reload();
}

function subscribeToUserLeaderboard(uid) {
  if (!uid) return;
  if (currentUserLeaderboardUnsubscribe) currentUserLeaderboardUnsubscribe();
  currentUserLeaderboardUnsubscribe = db.collection('leaderboard').doc(uid).onSnapshot(function(doc) {
      if (doc.exists && doc.data()) {
        currentUserProfile.totalMinutes = doc.data().totalMinutes || 0;
      } else {
        currentUserProfile.totalMinutes = 0;
      }
      updateProfileDisplay();
  }, function(err) {});
}

function syncUserProfile(uid, defaultName, platform) {
  var ref = db.collection('users').doc(uid);
  ref.get().then(function(snap) {
    if (!snap.exists) {
      var userData = { 
        uid: uid, name: defaultName, platform: platform, 
        elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0, lastEloDelta: 0, 
        tournamentsPlayed: 0, medals: {gold:0, silver:0, bronze:0}, 
        isVerified: true, createdAt: Date.now() 
      };
      ref.set(userData).then(function() {
          db.collection('users').get().then(function(usersSnap) { 
              sendTelegramAlert("🎉 <b>Новое пополнение в клубе!</b>\n\nВ приложении зарегистрировался новый участник: <b>" + cleanHtml(defaultName) + "</b>\n\n📈 Теперь нас в рейтинге: <b>" + usersSnap.size + "</b> человек!"); 
          }).catch(function(){});
      });
      finishSync(uid, userData);
    } else { 
        var snapData = snap.data() || {};
        var currentTm = currentUserProfile.totalMinutes || 0;
        for (var k in snapData) { currentUserProfile[k] = snapData[k]; }
        currentUserProfile.totalMinutes = currentTm;
        finishSync(uid, currentUserProfile);
    }
  }).catch(function(e) {
    finishSync(uid, currentUserProfile);
  });
}

function finishSync(uid, userData) {
    var tm = currentUserProfile.totalMinutes || 0;
    for (var k in userData) { currentUserProfile[k] = userData[k]; }
    currentUserProfile.totalMinutes = tm;
    
    var authScreen = document.getElementById('mandatory-auth-screen');
    if (authScreen) authScreen.style.display = 'none';
    
    subscribeToUserLeaderboard(uid); 
    updateProfileDisplay();
    if (currentUserProfile.name) localStorage.setItem('tt_name', currentUserProfile.name); 
    renderAll();
}

function initUserProfile() {
  var authScreen = document.getElementById('mandatory-auth-screen');
  var tgUser = null;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  }

  var savedId = localStorage.getItem('tt_member_id');
  var savedName = localStorage.getItem('tt_name');

  if (tgUser && tgUser.id) {
    var uid = 'tg_' + tgUser.id;
    var defaultName = (tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '')).trim() || tgUser.username || "Игрок";
    var uiName = (savedId === uid && savedName) ? savedName : defaultName;
    
    localStorage.setItem('tt_member_id', uid);
    
    currentUserProfile = { uid: uid, name: uiName, elo: 1000, isVerified: true, totalMinutes: 0 };
    if (authScreen) authScreen.style.display = 'none';
    subscribeToUserLeaderboard(uid);
    updateProfileDisplay();
    renderAll();

    syncUserProfile(uid, defaultName, 'tg');
    
    db.collection('users').doc(uid).onSnapshot(function(snap) {
      if (snap.exists) {
        var data = snap.data() || {};
        var currentTm = currentUserProfile.totalMinutes || 0;
        for (var k in data) currentUserProfile[k] = data[k];
        currentUserProfile.totalMinutes = currentTm;
        updateProfileDisplay();
        renderAll();
      }
    }, function(err) {});
    return;
  }
  
  if (savedId && (savedId.indexOf('tg_') === 0 || savedId.indexOf('google_') === 0)) {
    currentUserProfile = { uid: savedId, name: savedName || "Игрок", elo: 1000, isVerified: true, totalMinutes: 0 };
    if (authScreen) authScreen.style.display = 'none';
    subscribeToUserLeaderboard(savedId);
    updateProfileDisplay();
    renderAll();

    db.collection('users').doc(savedId).onSnapshot(function(snap) {
      if (snap.exists) {
        var data = snap.data() || {};
        var currentTm = currentUserProfile.totalMinutes || 0;
        for (var k in data) currentUserProfile[k] = data[k];
        currentUserProfile.totalMinutes = currentTm;
        updateProfileDisplay();
        renderAll();
      }
    }, function(err) {});
    return;
  }
  
  showAuthRequired(authScreen);
}

function showAuthRequired(authScreen) {
    currentUserProfile = { uid: null, name: "", totalMinutes: 0 };
    if (authScreen) authScreen.style.display = 'flex';
    
    document.getElementById('user-name-container').innerHTML = '<span class="user-name-text">Вы: <b style="color: var(--accent-red);">Не авторизован</b></span>';
    document.getElementById('user-stats-container').innerHTML = '<span class="player-status-tag" style="color: var(--accent-red);">Войдите для доступа к функциям</span>';
    
    var container = document.getElementById('telegram-login-container');
    if (container && container.children.length === 0) {
      var script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
      script.setAttribute('data-size', 'large'); 
      script.setAttribute('data-radius', '10');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)'); 
      script.setAttribute('data-request-access', 'write');
      container.appendChild(script);
    }
    renderAll();
}

function updateProfileDisplay() {
  if (!currentUserProfile.uid) return;
  var adminTag = isSuperAdmin() ? '<button class="badge-admin-btn" onclick="openAdminMenu()">Админ ⚙️</button>' : '';
  var customBadge = getCustomBadge(currentUserProfile.uid);
  var elo = parseInt(currentUserProfile.elo, 10) || 1000;

  var authScreen = document.getElementById('mandatory-auth-screen'); 
  if (authScreen) authScreen.style.display = 'none';

  document.getElementById('user-name-container').innerHTML = '<span class="user-name-text">Вы: <b>' + cleanHtml(currentUserProfile.name) + '</b></span> ' + adminTag + ' ' + customBadge;
  
  var lastDelta = parseInt(currentUserProfile.lastEloDelta, 10) || 0;
  var deltaHtml = lastDelta ? (lastDelta > 0 ? '<span class="elo-delta elo-up">(+' + lastDelta + ') 📈</span>' : '<span class="elo-delta elo-down">(' + lastDelta + ') 📉</span>') : '';

  document.getElementById('user-score-container').innerHTML = '<div style="display: flex; align-items: center; gap: 12px;"><div style="display: flex; flex-direction: column; align-items: flex-end;"><span style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Клубный рейтинг</span><div><span class="rating-score" style="font-size: 18px; line-height: 1;">' + elo + '</span>' + deltaHtml + '</div></div><button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(currentUserProfile.uid) + '\')">i</button></div>';
  
  var rttfText = currentUserProfile.rttf ? ' • РТТФ: ' + currentUserProfile.rttf : '';
  var streakText = (currentUserProfile.winStreak !== undefined && currentUserProfile.winStreak >= 3) ? '<span class="streak-fire" title="Серия побед">🔥' + currentUserProfile.winStreak + ' побед подряд</span>' : '';
  var wins = parseInt(currentUserProfile.wins, 10) || 0;
  var losses = parseInt(currentUserProfile.losses, 10) || 0;
  var matches = parseInt(currentUserProfile.matches, 10) || 0;
  var winrate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  
  var minsTotal = currentUserProfile.totalMinutes || 0;
  document.getElementById('user-stats-container').innerHTML = '<div style="display: flex; flex-direction: column; gap: 4px;"><span class="player-status-tag">' + getPlayerStatus(elo) + rttfText + '</span><span class="player-status-tag" style="color: #0284c7;">⏱ За столом: ' + formatMinutes(minsTotal) + '</span></div><div style="display: flex; flex-direction: column; gap: 4px; text-align: right;"><div><span class="player-status-tag" style="display: inline;">' + wins + 'В - ' + losses + 'П</span>' + streakText + '</div><span class="player-status-tag">(' + winrate + '%)</span></div>';

  var mContainer = document.getElementById('user-medals-container');
  var m = currentUserProfile.medals || {gold:0, silver:0, bronze:0};
  if (m.gold > 0 || m.silver > 0 || m.bronze > 0 || (currentUserProfile.tournamentsPlayed > 0)) {
    mContainer.innerHTML = '<div class="medal-item">🏆 ' + (currentUserProfile.tournamentsPlayed || 0) + '</div><div class="medal-item">🥇 ' + (m.gold || 0) + '</div><div class="medal-item">🥈 ' + (m.silver || 0) + '</div><div class="medal-item">🥉 ' + (m.bronze || 0) + '</div>';
    mContainer.style.display = 'flex';
  } else { mContainer.style.display = 'none'; }

  var invContainer = document.getElementById('user-inventory-container');
  if (invContainer) {
    if (currentUserProfile.blade || currentUserProfile.rubberL || currentUserProfile.rubberR) {
      var invHtml = '<div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed var(--card-border); padding-bottom: 4px; margin-bottom: 2px;">Ракетка:</div>';
      if (currentUserProfile.blade) invHtml += getInventoryRowHtml('🏓', 'Основание:', currentUserProfile.blade, 'Основание для ракетки настольного тенниса');
      if (currentUserProfile.rubberL) invHtml += getInventoryRowHtml('🔴', 'Накладка L:', currentUserProfile.rubberL, 'Накладка для ракетки настольного тенниса');
      if (currentUserProfile.rubberR) invHtml += getInventoryRowHtml('⚫', 'Накладка R:', currentUserProfile.rubberR, 'Накладка для ракетки настольного тенниса');
      invContainer.innerHTML = invHtml; invContainer.className = 'inventory-box'; invContainer.style.display = 'flex';
    } else { invContainer.style.display = 'none'; }
  }

  var btnAddTour = document.getElementById('btn-add-tournament'); if (btnAddTour) btnAddTour.style.display = isSuperAdmin() ? 'block' : 'none';
  var bEdit = document.getElementById('btn-edit-profile'); if (bEdit) bEdit.style.display = 'block';
  var bLogout = document.getElementById('btn-logout'); if (bLogout) bLogout.style.display = 'block';
}

function handleEditProfileClick() { 
  if (isUserVerified()) { 
    document.getElementById('name-input').value = currentUserProfile.name || ''; 
    document.getElementById('blade-input').value = currentUserProfile.blade || ''; 
    document.getElementById('rubber-l-input').value = currentUserProfile.rubberL || ''; 
    document.getElementById('rubber-r-input').value = currentUserProfile.rubberR || ''; 
    document.getElementById('rttf-input').value = currentUserProfile.rttf || ''; 
    document.getElementById('name-modal').style.display = 'flex'; 
  } else {
    customAlert("Требуется авторизация!");
  }
}
function hideNameModal() { document.getElementById('name-modal').style.display = 'none'; }

function saveCustomNameWithCheck() {
  var uid = getVerifiedUserId(); if (!uid) return;
  var val = document.getElementById('name-input').value.trim();
  var bladeVal = document.getElementById('blade-input').value.trim();
  var rubberLVal = document.getElementById('rubber-l-input').value.trim();
  var rubberRVal = document.getElementById('rubber-r-input').value.trim();
  var rttfRaw = document.getElementById('rttf-input').value.trim();
  var rttfVal = rttfRaw ? parseInt(rttfRaw, 10) : null;
  
  if (val.length < 2) return; 
  if (rttfVal !== null && (rttfVal < 0 || rttfVal > 4000)) return customAlert("❌ Рейтинг РТТФ должен быть от 0 до 4000!");
  
  var updateData = { name: val };
  if (bladeVal) updateData.blade = bladeVal; else updateData.blade = firebase.firestore.FieldValue.delete();
  if (rubberLVal) updateData.rubberL = rubberLVal; else updateData.rubberL = firebase.firestore.FieldValue.delete();
  if (rubberRVal) updateData.rubberR = rubberRVal; else updateData.rubberR = firebase.firestore.FieldValue.delete();
  if (rttfVal !== null) updateData.rttf = rttfVal; else updateData.rttf = firebase.firestore.FieldValue.delete();
    
  db.collection('users').doc(uid).set(updateData, { merge: true }).then(function() {
      currentUserProfile.name = val; 
      currentUserProfile.blade = bladeVal || null; 
      currentUserProfile.rubberL = rubberLVal || null; 
      currentUserProfile.rubberR = rubberRVal || null; 
      currentUserProfile.rttf = rttfVal;
      localStorage.setItem('tt_name', val); 
      updateProfileDisplay(); 
      hideNameModal(); 
      renderAll();
  }).catch(function(e) { customAlert("Не удалось сохранить профиль: " + e.message); });
}

function openAdminMenu() { document.getElementById('admin-modal').style.display = 'flex'; }
function closeAdminMenu() { document.getElementById('admin-modal').style.display = 'none'; }
function sendAdminBroadcast() {
  if(!isSuperAdmin()) return; var t = document.getElementById('admin-broadcast-text').value.trim(); if(!t) return;
  sendTelegramAlert("📢 <b>Сообщение от администрации клуба:</b>\n\n" + cleanHtml(t)); document.getElementById('admin-broadcast-text').value = ''; closeAdminMenu(); customAlert("✅ Отправлено");
}

function sendClubStatsBroadcast() {
  if (!isSuperAdmin()) return;
  
  Promise.all([
    db.collection('users').get(),
    db.collection('matches_history').get(),
    db.collection('leaderboard').get()
  ]).then(function(results) {
    var usersSnap = results[0];
    var matchesSnap = results[1];
    var leadSnap = results[2];

    var totalUsers = 0;
    var usersList = [];
    
    usersSnap.forEach(function(doc) {
      var d = doc.data() || {};
      if (doc.id.match(/^(tg|google)_/) || d.isVerified) {
        totalUsers++;
        usersList.push({
          name: d.name || 'Игрок',
          elo: parseInt(d.elo, 10) || 1000,
          wins: parseInt(d.wins, 10) || 0,
          losses: parseInt(d.losses, 10) || 0,
          matches: parseInt(d.matches, 10) || 0
        });
      }
    });

    usersList.sort(function(a, b) { return b.elo - a.elo; });
    var topList = usersList.slice(0, 10);

    var totalMinutesAll = 0;
    leadSnap.forEach(function(doc) {
      totalMinutesAll += ((doc.data() && doc.data().totalMinutes) || 0);
    });
    var totalHoursAll = Math.round(totalMinutesAll / 60);

    var text = "📊 <b>Официальная статистика Клуба ЧМЗ</b>\n\n" +
      "👥 Игроков в рейтинге: <b>" + totalUsers + "</b>\n" +
      "⚔️ Всего сыграно матчей: <b>" + matchesSnap.size + "</b>\n" +
      "⏱ Общее время тренировок: <b>" + totalHoursAll + " ч</b>\n\n" +
      "🏆 <b>ТОП-10 ИГРОКОВ КЛУБА (ЭЛО):</b>\n";

    for (var i = 0; i < topList.length; i++) {
      var p = topList[i];
      var medal = (i === 0) ? '🥇 ' : (i === 1) ? '🥈 ' : (i === 2) ? '🥉 ' : ((i + 1) + '. ');
      var winrate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;
      text += medal + "<b>" + cleanHtml(p.name) + "</b> — <code>" + p.elo + "</code> (" + p.wins + "В-" + p.losses + "П, " + winrate + "%)\n";
    }

    text += "\n📲 <i>Смотрите полную таблицу и бронируйте столы в нашем приложении!</i>";

    sendTelegramAlert(text);
    closeAdminMenu();
    customAlert("✅ Статистика и ТОП-10 отправлены в чат!");
  }).catch(function(err) {
    customAlert("Ошибка сбора статистики: " + err.message);
  });
}

function openAnnouncementModal(loc) { if(!isSuperAdmin()) return; document.getElementById('announcement-target-loc').value = loc; document.getElementById('announcement-textarea').value = announcementsData[loc] || ''; document.getElementById('announcement-modal').style.display = 'flex'; }
function closeAnnouncementModal() { document.getElementById('announcement-modal').style.display = 'none'; }
function saveAnnouncement() { 
    var loc = document.getElementById('announcement-target-loc').value, txt = document.getElementById('announcement-textarea').value.trim(); 
    var obj = {}; obj[loc] = txt;
    db.collection('settings').doc('announcements').set(obj, { merge: true }).then(function() {
        closeAnnouncementModal(); if(txt) sendTelegramAlert("📢 <b>Обновление информации " + LOCATION_NAMES[loc] + "</b>\n\n" + cleanHtml(txt));
    });
}
function deleteAnnouncement() { 
    if(!isSuperAdmin()) return; 
    var loc = document.getElementById('announcement-target-loc').value; 
    var obj = {}; obj[loc] = "";
    db.collection('settings').doc('announcements').set(obj, { merge: true }).then(function() {
        closeAnnouncementModal(); customAlert("✅ Анонс удален");
    });
}

function showUserInfoModal(uid) {
  if(!uid) return;
  document.getElementById('info-modal-title').innerHTML = "👤 Загрузка..."; 
  document.getElementById('info-modal-content-area').innerHTML = "Загрузка данных профиля...";
  document.getElementById('info-modal-history').innerHTML = '<span class="empty-note">Загрузка матчей...</span>';
  document.getElementById('info-modal-medals').style.display = 'none';
  document.getElementById('info-modal-inventory').style.display = 'none';
  document.getElementById('user-info-modal').style.display = 'flex';
  
  Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('leaderboard').doc(uid).get()
  ]).then(function(docs) {
    var d = docs[0];
    var ld = docs[1];

    if (!d.exists) { 
      closeUserInfoModal(); 
      return; 
    }

    var u = d.data() || {};
    var adminTag = ADMIN_UIDS.indexOf(uid) !== -1 ? '<span class="platform-badge badge-admin" style="margin-left:4px;">Админ ⭐</span>' : '';
    var customBadge = getCustomBadge(uid);
    document.getElementById('info-modal-title').innerHTML = "👤 " + cleanHtml(u.name || "Игрок") + " " + adminTag + " " + customBadge;
    
    var uidHtml = isSuperAdmin() ? '<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; padding-bottom: 8px; border-bottom: 1px solid var(--card-border);"><span style="color: var(--text-muted);">UID:</span><span style="font-weight: 600; color: #f87171; font-family: monospace; font-size: 11px;">' + cleanHtml(uid) + '</span></div>' : '';
    
    var mins = (ld.exists && ld.data()) ? (ld.data().totalMinutes || 0) : 0;
    var wins = parseInt(u.wins, 10) || 0;
    var losses = parseInt(u.losses, 10) || 0;
    var matchesCount = parseInt(u.matches, 10) || 0;
    var winrate = matchesCount > 0 ? Math.round((wins / matchesCount) * 100) : 0;
    var lastDelta = parseInt(u.lastEloDelta, 10) || 0;
    var deltaHtml = lastDelta ? (lastDelta > 0 ? '<span class="elo-delta elo-up">(+' + lastDelta + ') 📈</span>' : '<span class="elo-delta elo-down">(' + lastDelta + ') 📉</span>') : '';
    var streakText = (u.winStreak && u.winStreak >= 3) ? '<span class="streak-fire" title="Серия побед">🔥' + u.winStreak + ' побед</span>' : '';

    var mContainer = document.getElementById('info-modal-medals');
    var m = u.medals || { gold:0, silver:0, bronze:0 };
    if (m.gold > 0 || m.silver > 0 || m.bronze > 0 || u.tournamentsPlayed > 0) {
      mContainer.innerHTML = '<div class="medal-item">🏆 ' + (u.tournamentsPlayed || 0) + '</div><div class="medal-item">🥇 ' + (m.gold || 0) + '</div><div class="medal-item">🥈 ' + (m.silver || 0) + '</div><div class="medal-item">🥉 ' + (m.bronze || 0) + '</div>'; 
      mContainer.style.display = 'flex';
    } else { 
      mContainer.style.display = 'none'; 
    }

    var eloDisplay = parseInt(u.elo, 10) || 1000;
    document.getElementById('info-modal-content-area').innerHTML = uidHtml +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Клубный рейтинг:</span><div><span style="font-weight: 700; color: #9333ea;">' + eloDisplay + '</span>' + deltaHtml + '</div></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Рейтинг РТТФ:</span><span style="font-weight: 600; color: var(--text-muted);">' + (u.rttf || "Не указан") + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Статус:</span><span style="font-weight: 600;">' + getPlayerStatus(eloDisplay) + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Матчей:</span><span style="font-weight: 600;">' + matchesCount + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Победы/Поражения:</span><div><span style="font-weight: 600; color: #059669;">' + wins + 'В - ' + losses + 'П (' + winrate + '%)</span>' + streakText + '</div></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Время за столом:</span><span style="font-weight: 600; color: var(--accent-gold);">' + formatMinutes(mins) + '</span></div>';
    
    var invContainer = document.getElementById('info-modal-inventory');
    if (u.blade || u.rubberL || u.rubberR) {
      var invHtml = '<div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed var(--card-border); padding-bottom: 4px; margin-bottom: 2px;">Ракетка:</div>';
      if (u.blade) invHtml += getInventoryRowHtml('🏓', 'Основание:', u.blade, 'Основание для ракетки настольного тенниса');
      if (u.rubberL) invHtml += getInventoryRowHtml('🔴', 'Накладка L:', u.rubberL, 'Накладка для ракетки настольного тенниса');
      if (u.rubberR) invHtml += getInventoryRowHtml('⚫', 'Накладка R:', u.rubberR, 'Накладка для ракетки настольного тенниса');
      invContainer.innerHTML = invHtml; 
      invContainer.className = 'inventory-box'; 
      invContainer.style.display = 'flex';
    } else { 
      invContainer.style.display = 'none'; 
    }

    db.collection('matches_history').where('participants', 'array-contains', uid).get().then(function(snaps) {
        renderUserHistoryFromSnaps(snaps, uid);
    }).catch(function() {
        db.collection('matches_history').get().then(function(allSnaps) {
            var matches = [];
            allSnaps.forEach(function(docX) {
              var mx = docX.data();
              if (mx && mx.participants && mx.participants.indexOf(uid) !== -1) {
                matches.push(mx);
              }
            });
            renderUserHistoryList(matches, uid);
        }).catch(function() {
            document.getElementById('info-modal-history').innerHTML = '<span class="empty-note">Матчи не найдены</span>';
        });
    });

  }).catch(function(e) {
    closeUserInfoModal();
  });
}

function renderUserHistoryFromSnaps(snaps, uid) {
  var matches = [];
  snaps.forEach(function(docX) { matches.push(docX.data()); });
  renderUserHistoryList(matches, uid);
}

function renderUserHistoryList(matches, uid) {
  var hEl = document.getElementById('info-modal-history');
  if (!matches || matches.length === 0) { 
    hEl.innerHTML = '<span class="empty-note">Матчей пока нет</span>'; 
    return; 
  }
  matches.sort(function(a, b) { return parseTime(b.timestamp) - parseTime(a.timestamp); });
  matches = matches.slice(0, 10);
  
  var h = '';
  matches.forEach(function(mx) {
    var isDoubles = mx.type === 'doubles';
    var isTeam1 = isDoubles ? (mx.team1Uids && mx.team1Uids.indexOf(uid) !== -1) : (mx.p1Uid === uid);
    var myS = isTeam1 ? (mx.team1Score || mx.p1Score) : (mx.team2Score || mx.p2Score);
    var opS = isTeam1 ? (mx.team2Score || mx.p2Score) : (mx.team1Score || mx.p1Score);
    var opN = isTeam1 ? (isDoubles ? mx.team2Names : mx.p2Name) : (isDoubles ? mx.team1Names : mx.p1Name);
    var myPartner = isDoubles ? (isTeam1 ? (mx.team1Uids[0] === uid ? mx.team1NamesArr[1] : mx.team1NamesArr[0]) : (mx.team2Uids[0] === uid ? mx.team2NamesArr[1] : mx.team2NamesArr[0])) : null;
    var isWin = myS > opS;
    var dtStr = new Date(parseTime(mx.timestamp)).toLocaleDateString();
    var modeBadge = isDoubles ? '<span class="badge-mode badge-mode-doubles">2x2</span> ' : '';
    var partnerStr = myPartner ? '<div style="font-size: 10px; color: var(--accent-sky);">в паре с: ' + cleanHtml(myPartner) + '</div>' : '';

    h += '<div style="background: var(--card-bg); padding: 8px; border: 1px solid var(--card-border); border-radius: 8px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">' +
           '<div>' +
             '<div>' + modeBadge + 'против <b>' + cleanHtml(opN) + '</b></div>' +
             partnerStr +
             '<div style="color:var(--text-muted);font-size:10px;">' + dtStr + '</div>' +
           '</div>' +
           '<div style="color:' + (isWin ? '#059669' : '#f87171') + '; font-weight:bold; font-size: 14px;">' + myS + ' : ' + opS + '</div>' +
         '</div>';
  });
  hEl.innerHTML = h;
}

function closeUserInfoModal() { document.getElementById('user-info-modal').style.display = 'none'; }

function openTournamentModal(tourId) { 
  if (!isSuperAdmin()) return; currentEditingTourId = (tourId && typeof tourId === 'string') ? tourId : null; var btn = document.getElementById('btn-save-tour');
  if (currentEditingTourId) { btn.innerText = 'Сохранить изменения'; db.collection('tournaments').doc(currentEditingTourId).get().then(function(doc) { if (doc.exists) { var d = doc.data(); document.getElementById('tour-title').value = d.title || ''; document.getElementById('tour-date').value = d.rawDate || ''; document.getElementById('tour-desc').value = d.desc || ''; } }); } 
  else { btn.innerText = 'Создать'; document.getElementById('tour-title').value = ''; document.getElementById('tour-date').value = ''; document.getElementById('tour-desc').value = ''; }
  document.getElementById('tournament-modal').style.display = 'flex'; 
}
function closeTournamentModal() { document.getElementById('tournament-modal').style.display = 'none'; }

function saveTournament() {
  if (!isSuperAdmin()) return; 
  var title = document.getElementById('tour-title').value.trim(), dateVal = document.getElementById('tour-date').value, desc = document.getElementById('tour-desc').value.trim();
  if (!title) return customAlert('Введите название турнира');
  var dateStr = ''; if (dateVal) { var d = new Date(dateVal); dateStr = d.toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}); }
  
  var obj = { title: title, dateStr: dateStr, rawDate: dateVal, desc: desc };
  if (currentEditingTourId) { db.collection('tournaments').doc(currentEditingTourId).update(obj).then(function() { customAlert('✅ Турнир обновлен'); closeTournamentModal(); }).catch(function(e) { customAlert('Ошибка сохранения: ' + e.message); }); } 
  else { obj.status = 'registration'; obj.likes = []; obj.dislikes = []; obj.participants = []; obj.groups = {A:[], B:[]}; obj.matches = []; obj.playoffs = {}; obj.results = null; obj.createdAt = Date.now(); db.collection('tournaments').add(obj).then(function() { customAlert('✅ Турнир успешно создан'); closeTournamentModal(); }).catch(function(e) { customAlert('Ошибка сохранения: ' + e.message); }); }
}

function deleteTournament(id) { 
  if (!isSuperAdmin()) return; 
  openConfirmModal('Вы уверены, что хотите удалить этот турнир?', function() { db.collection('tournaments').doc(id).delete().then(function() { customAlert("✅ Турнир удален"); }).catch(function(e) { customAlert("❌ Ошибка удаления: " + e.message); }); });
}

function toggleTourReaction(id, type) {
  var uid = getVerifiedUserId(); if (!uid) return customAlert('Авторизуйтесь, чтобы ставить реакции!');
  var ref = db.collection('tournaments').doc(id);
  db.runTransaction(function(t) {
      return t.get(ref).then(function(doc) {
          if (!doc.exists) return; var data = doc.data(), likes = data.likes || [], dislikes = data.dislikes || [];
          if (type === 'like') { if (likes.indexOf(uid) !== -1) { likes = likes.filter(function(u) { return u !== uid; }); } else { likes.push(uid); dislikes = dislikes.filter(function(u) { return u !== uid; }); } } 
          else { if (dislikes.indexOf(uid) !== -1) { dislikes = dislikes.filter(function(u) { return u !== uid; }); } else { dislikes.push(uid); likes = likes.filter(function(u) { return u !== uid; }); } }
          t.update(ref, { likes: likes, dislikes: dislikes });
      });
  }).catch(function(e) {});
}

function joinTournament(id, title) {
  var uid = getVerifiedUserId(); if (!uid) return customAlert('Авторизуйтесь, чтобы участвовать!');
  var ref = db.collection('tournaments').doc(id); var joined = false;
  db.runTransaction(function(t) {
      return t.get(ref).then(function(doc) {
          if (!doc.exists || doc.data().status !== 'registration') return;
          var parts = doc.data().participants || []; var isInList = false;
          for(var i=0; i<parts.length; i++) { if (parts[i].uid === uid) isInList = true; }
          if (!isInList) { parts.push({uid: uid, name: currentUserProfile.name, elo: parseInt(currentUserProfile.elo, 10) || 1000}); t.update(ref, { participants: parts }); joined = true; }
      });
  }).then(function() { if (joined && canSendTgAlert('tour_join_' + uid + '_' + id)) { sendTelegramAlert("🏆 Игрок <b>" + cleanHtml(currentUserProfile.name) + "</b> зарегистрировался на турнир <b>" + title + "</b>!\n\nЗаходите в приложение, чтобы тоже принять участие!"); } }).catch(function(e) {});
}
function leaveTournament(id) {
  var uid = getVerifiedUserId(); if (!uid) return;
  var ref = db.collection('tournaments').doc(id);
  db.runTransaction(function(t) { return t.get(ref).then(function(doc) { if (!doc.exists || doc.data().status !== 'registration') return; var parts = doc.data().participants || []; parts = parts.filter(function(p) { return p.uid !== uid; }); t.update(ref, { participants: parts }); }); }).catch(function(e) {});
}

function generateId() { return Math.random().toString(36).substr(2, 9); }
function startTournament(id, type) {
  if (!isSuperAdmin()) return; var ref = db.collection('tournaments').doc(id);
  ref.get().then(function(doc) {
    if (!doc.exists) return; var data = doc.data(); var parts = data.participants || [];
    if (parts.length < 4) { customAlert('Для турнира нужно минимум 4 участника!'); return; }
    var grpA = [], grpB = [];
    if (type === 'smart') {
      var sorted = parts.slice().sort(function(a,b) { return (parseInt(b.elo, 10) || 1000) - (parseInt(a.elo, 10) || 1000); });
      for(var i=0; i<sorted.length; i++) { if ((i % 4) === 0 || (i % 4) === 3) grpA.push({uid: sorted[i].uid, name: sorted[i].name, pts:0, w:0, l:0}); else grpB.push({uid: sorted[i].uid, name: sorted[i].name, pts:0, w:0, l:0}); }
    } else {
      var shuffled = parts.slice().sort(function() { return 0.5 - Math.random(); });
      for(var j=0; j<shuffled.length; j++) { if (j < shuffled.length / 2) grpA.push({uid: shuffled[j].uid, name: shuffled[j].name, pts:0, w:0, l:0}); else grpB.push({uid: shuffled[j].uid, name: shuffled[j].name, pts:0, w:0, l:0}); }
    }

    var matches = [];
    var makeMatches = function(gPlayers, gName) {
      for(var m1=0; m1<gPlayers.length; m1++) {
        for(var m2=m1+1; m2<gPlayers.length; m2++) {
          matches.push({ id: generateId(), group: gName, p1Uid: gPlayers[m1].uid, p1Name: gPlayers[m1].name, p2Uid: gPlayers[m2].uid, p2Name: gPlayers[m2].name, score1: null, score2: null, stage: 'group' });
        }
      }
    };
    makeMatches(grpA, 'A'); makeMatches(grpB, 'B');
    ref.update({ status: 'active', groups: { A: grpA, B: grpB }, matches: matches });
  }).catch(function(e) {});
}

function generatePlayoffs(id) {
  if (!isSuperAdmin()) return; var ref = db.collection('tournaments').doc(id);
  ref.get().then(function(doc) {
    if (!doc.exists) return; var data = doc.data();
    var aRaw = (data.groups && data.groups.A) ? data.groups.A : []; var bRaw = (data.groups && data.groups.B) ? data.groups.B : [];
    var a = aRaw.slice().sort(function(x,y) { return (y.w||0) - (x.w||0) || (y.pts||0) - (x.pts||0); }); 
    var b = bRaw.slice().sort(function(x,y) { return (y.w||0) - (x.w||0) || (y.pts||0) - (x.pts||0); });
    if (a.length < 2 || b.length < 2) { customAlert("Недостаточно игроков в группах для плей-офф!"); return; }

    var matches = data.matches || [];
    matches.push({ id: 'semi1', stage: 'semi', p1Uid: a[0].uid, p1Name: a[0].name, p2Uid: b[1].uid, p2Name: b[1].name, score1: null, score2: null, title: 'Полуфинал 1' });
    matches.push({ id: 'semi2', stage: 'semi', p1Uid: b[0].uid, p1Name: b[0].name, p2Uid: a[1].uid, p2Name: a[1].name, score1: null, score2: null, title: 'Полуфинал 2' });
    
    ref.update({ status: 'playoffs', matches: matches, playoffs: { a1: a[0], a2: a[1], b1: b[0], b2: b[1] } });
  }).catch(function(e) {});
}

function generateFinals(id) {
  if (!isSuperAdmin()) return; var ref = db.collection('tournaments').doc(id);
  ref.get().then(function(doc) {
    if (!doc.exists) return; var data = doc.data();
    var semis = (data.matches || []).filter(function(m) { return m.stage === 'semi'; });
    var isUnfinished = false; for(var i=0; i<semis.length; i++) { if (semis[i].score1 === null) isUnfinished = true; } if (isUnfinished) return;
    
    var w1 = semis[0].score1 > semis[0].score2 ? {uid: semis[0].p1Uid, name: semis[0].p1Name} : {uid: semis[0].p2Uid, name: semis[0].p2Name};
    var l1 = semis[0].score1 > semis[0].score2 ? {uid: semis[0].p2Uid, name: semis[0].p2Name} : {uid: semis[0].p1Uid, name: semis[0].p1Name};
    var w2 = semis[1].score1 > semis[1].score2 ? {uid: semis[1].p1Uid, name: semis[1].p1Name} : {uid: semis[1].p2Uid, name: semis[1].p2Name};
    var l2 = semis[1].score1 > semis[1].score2 ? {uid: semis[1].p2Uid, name: semis[1].p2Name} : {uid: semis[1].p1Uid, name: semis[1].p1Name};

    var matches = data.matches || [];
    matches.push({ id: 'third', stage: 'final', p1Uid: l1.uid, p1Name: l1.name, p2Uid: l2.uid, p2Name: l2.name, score1: null, score2: null, title: 'Матч за 3-е место' });
    matches.push({ id: 'first', stage: 'final', p1Uid: w1.uid, p1Name: w1.name, p2Uid: w2.uid, p2Name: w2.name, score1: null, score2: null, title: 'ФИНАЛ' });

    ref.update({ status: 'finals', matches: matches });
  }).catch(function(e) {});
}

function completeTournament(id) {
  if (!isSuperAdmin()) return; var ref = db.collection('tournaments').doc(id);
  ref.get().then(function(doc) {
    if (!doc.exists) return; var data = doc.data();
    var firstM = null, thirdM = null;
    var mArr = data.matches || [];
    for(var i=0; i<mArr.length; i++) { if (mArr[i].id === 'first') firstM = mArr[i]; if (mArr[i].id === 'third') thirdM = mArr[i]; }
    if (!firstM || !thirdM || firstM.score1 === null || thirdM.score1 === null) { customAlert("Завершите финалы!"); return; }

    var gld = firstM.score1 > firstM.score2 ? {uid: firstM.p1Uid, name: firstM.p1Name} : {uid: firstM.p2Uid, name: firstM.p2Name};
    var slv = firstM.score1 > firstM.score2 ? {uid: firstM.p2Uid, name: firstM.p2Name} : {uid: firstM.p1Uid, name: firstM.p1Name};
    var brn = thirdM.score1 > thirdM.score2 ? {uid: thirdM.p1Uid, name: thirdM.p1Name} : {uid: thirdM.p2Uid, name: thirdM.p2Name};

    var parts = data.participants || []; var batch = db.batch();
    var promises = [];
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      var uRef = db.collection('users').doc(p.uid);
      promises.push(uRef.get().then((function(puid) {
          return function(uDoc) {
              if (uDoc.exists) {
                  var uData = uDoc.data(); var m = uData.medals || {gold:0, silver:0, bronze:0};
                  if (puid === gld.uid) m.gold++; if (puid === slv.uid) m.silver++; if (puid === brn.uid) m.bronze++;
                  batch.update(uRef, { tournamentsPlayed: (uData.tournamentsPlayed||0) + 1, medals: m });
              }
          };
      })(p.uid)));
    }
    
    Promise.all(promises).then(function() {
        batch.update(ref, { status: 'completed', results: { gold: gld, silver: slv, bronze: brn } });
        batch.commit().then(function() {
            sendTelegramAlert("🏆 <b>Турнир «" + cleanHtml(data.title) + "» завершен!</b>\n\n🥇 <b>1 место:</b> " + cleanHtml(gld.name) + "\n🥈 <b>2 место:</b> " + cleanHtml(slv.name) + "\n🥉 <b>3 место:</b> " + cleanHtml(brn.name) + "\n\nСпасибо всем участникам! Заходите в приложение, чтобы посмотреть сетку и обновленные профили.");
        });
    });
  }).catch(function(e) {});
}

function openTourMatchModal(tourId, matchId, p1Name, p2Name) {
  document.getElementById('tour-match-id-val').value = matchId; 
  document.getElementById('tour-id-val').value = tourId; 
  document.getElementById('tour-match-players-label').innerText = cleanHtml(p1Name) + ' ПРОТИВ ' + cleanHtml(p2Name);
  selectTourScore(3, 0); 
  document.getElementById('tour-match-modal').style.display = 'flex';
}
function closeTourMatchModal() { document.getElementById('tour-match-modal').style.display = 'none'; }
function selectTourScore(s1, s2) { 
    document.getElementById('tour-match-s1').value = s1; document.getElementById('tour-match-s2').value = s2; 
    var btns = document.querySelectorAll('.tour-score-btn');
    for(var i=0; i<btns.length; i++) {
        if (btns[i].innerText.replace(/\s+/g,'') === (s1 + ":" + s2)) btns[i].classList.add('active');
        else btns[i].classList.remove('active');
    }
}

function submitTourMatchScore() {
  var s1 = parseInt(document.getElementById('tour-match-s1').value, 10), s2 = parseInt(document.getElementById('tour-match-s2').value, 10);
  var tourId = document.getElementById('tour-id-val').value, matchId = document.getElementById('tour-match-id-val').value, uid = getVerifiedUserId();
  closeTourMatchModal();
  
  var recordedMatch = null;

  db.runTransaction(function(t) {
      var ref = db.collection('tournaments').doc(tourId);
      return t.get(ref).then(function(doc) {
          if (!doc.exists) return; var data = doc.data(); var matches = data.matches || [];
          var mIdx = -1; for (var j = 0; j < matches.length; j++) { if (matches[j].id === matchId) { mIdx = j; break; } }
          if (mIdx === -1 || matches[mIdx].score1 !== null) return;
          var match = matches[mIdx];
          if (!isSuperAdmin() && match.p1Uid !== uid && match.p2Uid !== uid) return; 

          match.score1 = s1; match.score2 = s2;
          recordedMatch = match;

          var p1Ref = db.collection('users').doc(match.p1Uid), p2Ref = db.collection('users').doc(match.p2Uid);
          
          return Promise.all([t.get(p1Ref), t.get(p2Ref)]).then(function(uDocs) {
              var p1Doc = uDocs[0], p2Doc = uDocs[1];
              var p1Data = p1Doc.exists ? p1Doc.data() : { elo: 1000, wins:0, losses:0, matches:0, winStreak:0 };
              var p2Data = p2Doc.exists ? p2Doc.data() : { elo: 1000, wins:0, losses:0, matches:0, winStreak:0 };
              
              var isPWin = s1 > s2; 
              var p1Elo = parseInt(p1Data.elo, 10) || 1000; 
              var p2Elo = parseInt(p2Data.elo, 10) || 1000;
              var myDelta = calculateElo(p1Elo, p2Elo, isPWin ? 1 : 0);
              var newP1Elo = Math.max(100, p1Elo + myDelta); 
              var newP2Elo = Math.max(100, p2Elo - myDelta);
              var p1S = isPWin ? ((parseInt(p1Data.winStreak, 10) || 0) + 1) : 0; 
              var p2S = isPWin ? 0 : ((parseInt(p2Data.winStreak, 10) || 0) + 1);

              t.update(p1Ref, { 
                elo: newP1Elo, 
                lastEloDelta: isPWin ? myDelta : -myDelta, 
                winStreak: p1S, 
                matches: (parseInt(p1Data.matches, 10) || 0) + 1, 
                wins: (parseInt(p1Data.wins, 10) || 0) + (isPWin ? 1 : 0), 
                losses: (parseInt(p1Data.losses, 10) || 0) + (isPWin ? 0 : 1) 
              });

              t.update(p2Ref, { 
                elo: newP2Elo, 
                lastEloDelta: isPWin ? -myDelta : myDelta, 
                winStreak: p2S, 
                matches: (parseInt(p2Data.matches, 10) || 0) + 1, 
                wins: (parseInt(p2Data.wins, 10) || 0) + (isPWin ? 0 : 1), 
                losses: (parseInt(p2Data.losses, 10) || 0) + (isPWin ? 1 : 0) 
              });
              
              if (match.stage === 'group') {
                var groups = data.groups; var grp = groups[match.group];
                var pl1 = null, pl2 = null;
                for(var k=0; k<grp.length; k++) { if(grp[k].uid === match.p1Uid) pl1 = grp[k]; if(grp[k].uid === match.p2Uid) pl2 = grp[k]; }
                if (isPWin) { pl1.w++; pl1.pts += 2; pl2.l++; pl2.pts += 1; } else { pl2.w++; pl2.pts += 2; pl1.l++; pl1.pts += 1; }
                t.update(ref, { matches: matches, groups: groups });
              } else { 
                t.update(ref, { matches: matches }); 
              }
          });
      });
  }).then(function() {
      if (recordedMatch) {
        db.collection('matches_history').add({ 
          type: 'singles',
          p1Uid: recordedMatch.p1Uid, 
          p1Name: recordedMatch.p1Name, 
          p1Score: s1, 
          p2Uid: recordedMatch.p2Uid, 
          p2Name: recordedMatch.p2Name, 
          p2Score: s2, 
          participants: [recordedMatch.p1Uid, recordedMatch.p2Uid], 
          timestamp: Date.now() 
        });
      }
  }).catch(function(e){});
}

function renderMatchList(matches, tourId, titleFilter) {
  if (!matches || matches.length === 0) return '';
  var str = '';
  for(var i=0; i<matches.length; i++) {
    var m = matches[i]; var isDone = m.score1 !== null;
    var badge = isDone ? '<span class="tour-score-badge">' + m.score1 + ' : ' + m.score2 + '</span>' : '<button class="btn-info" style="font-size: 10px; width: auto; padding: 4px 8px; border-radius: 4px; height: auto;" onclick="openTourMatchModal(\''+escapeJS(tourId)+'\', \''+escapeJS(m.id)+'\', \''+escapeJS(cleanHtml(m.p1Name))+'\', \''+escapeJS(cleanHtml(m.p2Name))+'\')">Указать счет</button>';
    var n1C = (isDone && m.score1 > m.score2) ? 'tour-badge-winner' : '';
    var n2C = (isDone && m.score2 > m.score1) ? 'tour-badge-winner' : '';
    var titleHtml = titleFilter ? '<div style="font-size: 10px; color: var(--accent-purple); font-weight: 700; margin-bottom: 2px;">'+m.title+'</div>' : '';
    str += '<div class="tour-match-row"><div class="tour-match-names">' + titleHtml + '<span class="'+n1C+' clickable-name" onclick="showUserInfoModal(\''+escapeJS(m.p1Uid)+'\')">' + cleanHtml(m.p1Name) + '</span><span class="'+n2C+' clickable-name" onclick="showUserInfoModal(\''+escapeJS(m.p2Uid)+'\')">' + cleanHtml(m.p2Name) + '</span></div>' + badge + '</div>';
  }
  return str;
}

function renderGroupTable(groupPlayers, groupName) {
  if (!groupPlayers || groupPlayers.length === 0 || !Array.isArray(groupPlayers)) return '';
  var sorted = groupPlayers.slice().sort(function(a,b) { return (b.w||0) - (a.w||0) || (b.pts||0) - (a.pts||0); });
  var rows = '';
  for(var i=0; i<sorted.length; i++) { var p = sorted[i]; rows += '<tr><td>'+(i+1)+'. <span class="clickable-name" onclick="showUserInfoModal(\''+escapeJS(p.uid)+'\')">' + cleanHtml(p.name) + '</span></td><td>' + (p.w||0) + '</td><td>' + (p.l||0) + '</td><td>' + (p.pts||0) + '</td></tr>'; }
  return '<div style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; margin-top: 12px;">Группа ' + groupName + '</div><table class="tour-group-table"><tr><th>Игрок</th><th width="30">В</th><th width="30">П</th><th width="30">О</th></tr>' + rows + '</table>';
}

function listenTournaments() {
  db.collection('tournaments').orderBy('createdAt', 'desc').onSnapshot(function(snap) {
    try {
      var activeEl = document.getElementById('tournaments-list-active');
      var archiveEl = document.getElementById('tournaments-list-archive');
      var activeHtml = '', archiveHtml = '';
      var myUid = getVerifiedUserId(), isAdmin = isSuperAdmin();

      snap.forEach(function(doc) {
        try {
          var d = doc.data() || {}, id = doc.id, likes = d.likes || [], dislikes = d.dislikes || [], parts = d.participants || [];
          var isLiked = myUid && likes.indexOf(myUid) !== -1;
          var isDisliked = myUid && dislikes.indexOf(myUid) !== -1;
          var isPart = false; for(var i=0; i<parts.length; i++) { if (parts[i].uid === myUid) isPart = true; }
          var adminActionHtml = isAdmin ? '<div style="display: flex; gap: 8px; margin-top: 8px; width: 100%;"><button class="btn-plan" style="flex: 1; padding: 4px; font-size: 11px;" onclick="openTournamentModal(\''+escapeJS(id)+'\')">✏️ Изменить</button><button class="btn-leave" style="flex: 1; padding: 4px; font-size: 11px; color: #ef4444; border-color: #ef4444;" onclick="deleteTournament(\''+escapeJS(id)+'\')">🗑 Удалить</button></div>' : '';

          if (d.status === 'completed') {
            var res = d.results || {};
            var goldName = (res.gold && res.gold.name) ? res.gold.name : '';
            var silverName = (res.silver && res.silver.name) ? res.silver.name : '';
            var bronzeName = (res.bronze && res.bronze.name) ? res.bronze.name : '';
            var goldUid = (res.gold && res.gold.uid) ? res.gold.uid : '';
            var silverUid = (res.silver && res.silver.uid) ? res.silver.uid : '';
            var bronzeUid = (res.bronze && res.bronze.uid) ? res.bronze.uid : '';
            
            archiveHtml += '<div class="card" style="border-color: var(--card-border); opacity: 0.85;"><div style="font-size: 15px; font-weight: 700; color: var(--text-muted);">' + cleanHtml(d.title) + '</div><div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">' + (d.dateStr || '') + '</div><div style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;"><div style="color: var(--accent-gold);">🥇 <span class="clickable-name" onclick="showUserInfoModal(\''+escapeJS(goldUid)+'\')">' + cleanHtml(goldName) + '</span></div><div style="color: var(--text-muted);">🥈 <span class="clickable-name" onclick="showUserInfoModal(\''+escapeJS(silverUid)+'\')">' + cleanHtml(silverName) + '</span></div><div style="color: #b45309;">🥉 <span class="clickable-name" onclick="showUserInfoModal(\''+escapeJS(bronzeUid)+'\')">' + cleanHtml(bronzeName) + '</span></div></div>' + adminActionHtml + '</div>';
            return;
          }

          var content = '', buttonsHtml = '';
          if (d.status === 'registration') {
            var pListItems = []; for(var j=0; j<parts.length; j++) { pListItems.push('<span class="clickable-name" onclick="showUserInfoModal(\''+escapeJS(parts[j].uid)+'\')">' + cleanHtml(parts[j].name) + '</span>'); }
            var pList = pListItems.length > 0 ? pListItems.join(', ') : 'Пока никто не записался';
            content = '<div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; line-height: 1.6;"><b>Участники (' + parts.length + '):</b> ' + pList + '</div>';
            if (myUid) { buttonsHtml += isPart ? '<button class="btn-leave" style="flex: 1; padding: 8px;" onclick="leaveTournament(\''+escapeJS(id)+'\')">Отказаться</button>' : '<button class="btn-join" style="flex: 1; padding: 8px; background: var(--accent-amber); color: #0b1120;" onclick="joinTournament(\''+escapeJS(id)+'\', \''+escapeJS(cleanHtml(d.title))+'\')">🏆 Участвовать</button>'; }
            if (isAdmin) { buttonsHtml += '</div><div style="display: flex; gap: 8px; margin-top: 8px; width: 100%;"><button class="btn-plan" style="flex: 1; padding: 8px; font-size: 12px;" onclick="startTournament(\''+escapeJS(id)+'\', \'random\')">🎲 Случайная</button><button class="btn-plan" style="flex: 1; padding: 8px; font-size: 12px; border-color: var(--accent-purple); color: var(--accent-purple);" onclick="startTournament(\''+escapeJS(id)+'\', \'smart\')">🧠 Умная (по Эло)</button>'; }
          } 
          else if (d.status === 'active') {
            var groupA = d.groups && d.groups.A ? d.groups.A : []; var groupB = d.groups && d.groups.B ? d.groups.B : [];
            content += renderGroupTable(groupA, 'A') + renderGroupTable(groupB, 'B');
            content += '<div style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 12px 0 6px 0;">Матчи Группы А</div>';
            var matchesA = d.matches ? d.matches.filter(function(m) { return m.group === 'A'; }) : []; content += renderMatchList(matchesA, id, false);
            content += '<div style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 12px 0 6px 0;">Матчи Группы В</div>';
            var matchesB = d.matches ? d.matches.filter(function(m) { return m.group === 'B'; }) : []; content += renderMatchList(matchesB, id, false);
            var groupMatches = d.matches ? d.matches.filter(function(m) { return m.stage === 'group'; }) : [];
            var isUnfinishedGroups = false; for(var k=0; k<groupMatches.length; k++) { if (groupMatches[k].score1 === null) isUnfinishedGroups = true; }
            if (isAdmin && groupMatches.length > 0 && !isUnfinishedGroups) { adminActionHtml = '<button class="btn-join" style="background: var(--accent-purple); padding: 8px; margin-top: 12px; width: 100%;" onclick="generatePlayoffs(\''+escapeJS(id)+'\')">Сформировать Плей-офф</button>' + adminActionHtml; }
          }
          else if (d.status === 'playoffs') {
            content += '<div style="font-size: 13px; font-weight: 700; color: var(--accent-purple); margin: 12px 0 6px 0;">Плей-офф (Полуфиналы)</div>';
            var semiMatches = d.matches ? d.matches.filter(function(m) { return m.stage === 'semi'; }) : []; content += renderMatchList(semiMatches, id, true);
            var isUnfinishedSemis = false; for(var l=0; l<semiMatches.length; l++) { if (semiMatches[l].score1 === null) isUnfinishedSemis = true; }
            if (isAdmin && semiMatches.length > 0 && !isUnfinishedSemis) { adminActionHtml = '<button class="btn-join" style="background: var(--accent-gold); color: #0b1120; padding: 8px; margin-top: 12px; width: 100%;" onclick="generateFinals(\''+escapeJS(id)+'\')">Создать Финалы</button>' + adminActionHtml; }
          }
          else if (d.status === 'finals') {
            content += '<div style="font-size: 13px; font-weight: 700; color: var(--accent-gold); margin: 12px 0 6px 0;">Финалы</div>';
            var finalMatches = d.matches ? d.matches.filter(function(m) { return m.stage === 'final'; }) : []; content += renderMatchList(finalMatches, id, true);
            var isUnfinishedFinals = false; for(var x=0; x<finalMatches.length; x++) { if (finalMatches[x].score1 === null) isUnfinishedFinals = true; }
            if (isAdmin && finalMatches.length > 0 && !isUnfinishedFinals) { adminActionHtml = '<button class="btn-join" style="background: var(--accent-green); padding: 8px; margin-top: 12px; width: 100%;" onclick="completeTournament(\''+escapeJS(id)+'\')">Завершить турнир</button>' + adminActionHtml; }
          }

          var dDesc = d.desc ? '<div style="font-size: 13px; margin-top: 4px; white-space: pre-wrap;">' + cleanHtml(d.desc) + '</div>' : '';
          activeHtml += '<div class="card" style="border-color: var(--accent-amber);"><div style="display: flex; justify-content: space-between; align-items: flex-start;"><div style="font-size: 16px; font-weight: 700; color: var(--accent-amber);">' + cleanHtml(d.title) + '</div><div style="font-size: 12px; color: var(--text-muted);">' + (d.dateStr || '') + '</div></div>' + dDesc + content + '<div style="display: flex; gap: 8px; margin-top: 12px;"><button class="score-btn ' + (isLiked ? 'active' : '') + '" style="width: 50px; padding: 6px; font-size: 12px;" onclick="toggleTourReaction(\''+escapeJS(id)+'\', \'like\')">👍 ' + likes.length + '</button><button class="score-btn ' + (isDisliked ? 'active' : '') + '" style="width: 50px; padding: 6px; font-size: 12px;" onclick="toggleTourReaction(\''+escapeJS(id)+'\', \'dislike\')">👎 ' + dislikes.length + '</button>' + buttonsHtml + '</div>' + adminActionHtml + '</div>';
        } catch (err) {
          if (isAdmin) {
            activeHtml += '<div class="card" style="border-color: #ef4444; border-width: 2px;"><div style="color: #ef4444; font-weight: bold; font-size: 14px;">⚠️ Сбой в данных турнира</div><div style="font-size: 11px; color: var(--text-muted);">Этот турнир поврежден. Остальная система работает нормально. Нажмите кнопку ниже, чтобы принудительно удалить сбойный турнир из базы.</div><button class="btn-leave" style="color: #ef4444; border-color: #ef4444; margin-top: 8px;" onclick="deleteTournament(\''+escapeJS(doc.id)+'\')">🗑 Принудительно удалить</button></div>';
          }
        }
      });
      if(activeEl) activeEl.innerHTML = activeHtml || '<span class="empty-note">Пока нет активных турниров</span>';
      if(archiveEl) archiveEl.innerHTML = archiveHtml || '<span class="empty-note">Архив пуст</span>';
    } catch(e) {}
  });
}

function listenRatings() {
  db.collection('users').onSnapshot(function(snap) {
    var listEl = document.getElementById('rating-list');
    if (snap.empty) { listEl.innerHTML = '<span class="empty-note">Сыграйте первый матч!</span>'; return; }
    
    var users = [];
    var myUid = getVerifiedUserId();
    snap.forEach(function(doc) {
      var d = doc.data();
      if (doc.id.match(/^(tg|google)_/) || d.isVerified) {
        users.push({ uid: doc.id, data: d });
      }
    });

    users.sort(function(a, b) { return (parseInt(b.data.elo, 10) || 1000) - (parseInt(a.data.elo, 10) || 1000); });

    var html = '', rank = 1;
    users.forEach(function(item) {
      try {
        var d = item.data;
        var docId = item.uid;
        if (docId === myUid) { 
            var currentTm = currentUserProfile.totalMinutes || 0;
            for(var k in d) currentUserProfile[k] = d[k];
            currentUserProfile.totalMinutes = currentTm;
            updateProfileDisplay(); 
        }
        var rankClass = rank <= 3 ? 'leader-rank-' + rank : '', medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
        var wins = parseInt(d.wins, 10) || 0;
        var losses = parseInt(d.losses, 10) || 0;
        var matches = parseInt(d.matches, 10) || 0;
        var winrate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
        var adminBadgeHTML = ADMIN_UIDS.indexOf(docId) !== -1 ? '<span class="platform-badge badge-admin">Админ ⭐</span>' : '', customBadge = getCustomBadge(docId), rttfText = d.rttf ? ' • РТТФ: ' + d.rttf : '';
        
        var streakHtml = (d.winStreak && d.winStreak >= 3) ? '<span class="streak-fire" title="Серия побед">🔥' + d.winStreak + '</span>' : '';
        var deltaNum = parseInt(d.lastEloDelta, 10) || 0;
        var deltaHtml = deltaNum ? (deltaNum > 0 ? '<span class="elo-delta elo-up">(+' + deltaNum + ') 📈</span>' : '<span class="elo-delta elo-down">(' + deltaNum + ') 📉</span>') : '';

        html += '<div class="leader-row"><div class="leader-left"><span class="leader-rank ' + rankClass + '">' + medal + '</span><div><div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;"><b>' + cleanHtml(d.name) + '</b> ' + adminBadgeHTML + ' ' + customBadge + '</div><div class="player-status-tag">' + getPlayerStatus(parseInt(d.elo, 10) || 1000) + rttfText + streakHtml + '</div></div></div><div style="display: flex; align-items: center; gap: 8px;"><div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;"><div><span class="rating-score">' + (parseInt(d.elo, 10) || 1000) + '</span>' + deltaHtml + '</div><span style="font-size: 10px; color: var(--text-muted);">' + wins + 'В - ' + losses + 'П (' + winrate + '%)</span></div><button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(docId) + '\')">i</button></div></div>';
        rank++;
      } catch(e) {}
    });
    listEl.innerHTML = html || '<span class="empty-note">Сыграйте первый матч!</span>';
  }, function(err) {});
}

function listenLeaderboard() {
  db.collection('leaderboard').onSnapshot(function(snap) {
    var listEl = document.getElementById('leaderboard-list');
    if (snap.empty) { listEl.innerHTML = '<span class="empty-note">Статистика собирается...</span>'; return; }
    
    var items = [];
    snap.forEach(function(doc) {
      if (doc.id.match(/^(tg|google)_/)) {
        items.push({ uid: doc.id, data: doc.data() });
      }
    });

    items.sort(function(a, b) { return (b.data.totalMinutes || 0) - (a.data.totalMinutes || 0); });

    var html = '', rank = 1;
    items.forEach(function(item) {
      try {
        var d = item.data;
        var docId = item.uid;
        var hours = ((d.totalMinutes || 0) / 60).toFixed(1), rankClass = rank <= 3 ? 'leader-rank-' + rank : '', medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
        var adminBadgeHTML = ADMIN_UIDS.indexOf(docId) !== -1 ? '<span class="platform-badge badge-admin">Админ ⭐</span>' : '', customBadge = getCustomBadge(docId);
        
        html += '<div class="leader-row"><div class="leader-left"><span class="leader-rank ' + rankClass + '">' + medal + '</span><div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;"><b>' + cleanHtml(d.name) + '</b> ' + adminBadgeHTML + ' ' + customBadge + '</div></div><div style="display: flex; align-items: center; gap: 8px;"><span class="leader-score">' + hours + ' ч (' + (d.sessions || 0) + ' игр)</span><button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(docId) + '\')">i</button></div></div>';
        rank++;
      } catch (e) {}
    });
    listEl.innerHTML = html || '<span class="empty-note">Статистика собирается...</span>';
  }, function(err) {});
}

document.addEventListener('DOMContentLoaded', function() {
  try { initUserProfile(); } catch(e) {}
  try { listenRatings(); } catch(e) {}
  try { listenLeaderboard(); } catch(e) {}
  try { listenTournaments(); } catch(e) {}
  try { listenPendingMatches(); } catch(e) {}
  try { listenRecentMatches(); } catch(e) {}
  try { loadParkWeather(); } catch(e) {}
  
  setTimeout(monitorSessions, 1000);
  
  ['park', 'vostok'].forEach(function(loc) {
    try {
      db.collection('locations').doc(loc).onSnapshot(function(doc) { 
          try { 
              var data = doc.data() || {}; 
              locationsData[loc].plans = data.plans || []; 
              locationsData[loc].players = (data.players || []).map(function(p) { 
                return typeof p === 'string' ? { name: p, time: Date.now(), uid: p, maxLimitMs: DEFAULT_LIMIT_MS } : p; 
              }); 
              renderAll(); 
          } catch(e){} 
      }, function(err) {});
    } catch(e) {}
  });

  try {
    db.collection('settings').doc('announcements').onSnapshot(function(doc) {
      try {
        announcementsData = doc.data() || {park:"", vostok:""};
        ['park','vostok'].forEach(function(loc) {
          var b = document.getElementById('announcement-box-'+loc), t = document.getElementById('announcement-text-'+loc);
          if(b && t) { 
              if(announcementsData[loc]) { 
                  t.innerHTML = cleanHtml(announcementsData[loc]).replace(/\n/g,'<br>'); b.style.display = 'flex'; 
              } else { b.style.display = 'none'; } 
          }
        });
      } catch(e) {}
    }, function(err) {});
  } catch(e) {}

  setInterval(renderAll, 30000); 
  setInterval(monitorSessions, 60000); 
  setInterval(loadParkWeather, 600000); 
});
