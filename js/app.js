// js/app.js

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

// Старт приложения
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
