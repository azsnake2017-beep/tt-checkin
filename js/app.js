// ==========================================
// ОСНОВНОЙ ДВИЖОК: ПРОФИЛЬ, ТУРНИРЫ, АНОНСЫ И UI
// ==========================================

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

function updateAdminControls() {
  var isAdmin = isSuperAdmin();
  var btnAddTour = document.getElementById('btn-add-tournament'); 
  if (btnAddTour) btnAddTour.style.display = isAdmin ? 'block' : 'none';
  
  var btnEditAnnVostok = document.getElementById('btn-edit-announcement-vostok');
  if (btnEditAnnVostok) btnEditAnnVostok.style.display = isAdmin ? 'block' : 'none';
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
  updateAdminControls();
  if(typeof renderAll === 'function') renderAll();

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
      updateAdminControls();
      if(typeof renderAll === 'function') renderAll();

      syncUserProfile(uid, defaultName, 'google');
    }
  }).catch(function(e) { customAlert("Ошибка входа: " + e.message); });
}

function logoutProfile() {
  if (typeof vibrate === 'function') vibrate('medium');
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
    updateAdminControls();
    if (currentUserProfile.name) localStorage.setItem('tt_name', currentUserProfile.name); 
    if(typeof renderAll === 'function') renderAll();
    
    if (typeof processReferralBonus === 'function') {
        processReferralBonus(uid, currentUserProfile.name);
    }
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
    updateAdminControls();
    if(typeof renderAll === 'function') renderAll();

    syncUserProfile(uid, defaultName, 'tg');
    
    db.collection('users').doc(uid).onSnapshot(function(snap) {
      if (snap.exists) {
        var data = snap.data() || {};
        var currentTm = currentUserProfile.totalMinutes || 0;
        for (var k in data) currentUserProfile[k] = data[k];
        currentUserProfile.totalMinutes = currentTm;
        updateProfileDisplay();
        updateAdminControls();
        if(typeof renderAll === 'function') renderAll();
      }
    }, function(err) {});
    return;
  }
  
  if (savedId && (savedId.indexOf('tg_') === 0 || savedId.indexOf('google_') === 0)) {
    currentUserProfile = { uid: savedId, name: savedName || "Игрок", elo: 1000, isVerified: true, totalMinutes: 0 };
    if (authScreen) authScreen.style.display = 'none';
    subscribeToUserLeaderboard(savedId);
    updateProfileDisplay();
    updateAdminControls();
    if(typeof renderAll === 'function') renderAll();

    db.collection('users').doc(savedId).onSnapshot(function(snap) {
      if (snap.exists) {
        var data = snap.data() || {};
        var currentTm = currentUserProfile.totalMinutes || 0;
        for (var k in data) currentUserProfile[k] = data[k];
        currentUserProfile.totalMinutes = currentTm;
        updateProfileDisplay();
        updateAdminControls();
        if(typeof renderAll === 'function') renderAll();
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
    
    if (typeof window.setAppProgress === 'function') {
        window.setAppProgress(100, 'Ожидание авторизации...');
    }
    
    if(typeof renderAll === 'function') renderAll();
}

function updateProfileDisplay() {
  if (!currentUserProfile.uid) return;
  var isAdmin = isSuperAdmin();
  var adminTag = isAdmin ? '<button class="badge-admin-btn" onclick="openAdminMenu()">Админ ⚙️</button>' : '';
  var customBadge = typeof getCustomBadge === 'function' ? getCustomBadge(currentUserProfile.uid) : '';
  var elo = parseInt(currentUserProfile.elo, 10) || 1000;

  if (currentUserProfile.matches !== undefined) { 
    var currentStatus = typeof getPlayerStatus === 'function' ? getPlayerStatus(elo) : 'Игрок';
    var savedStatus = localStorage.getItem('tt_last_known_status_' + currentUserProfile.uid);
    
    if (savedStatus && savedStatus !== currentStatus) {
      var parts = currentStatus.split(' ');
      var icon = parts.pop() || '🏆';
      var cleanStatusName = parts.join(' ');
      
      var savedElo = parseInt(localStorage.getItem('tt_last_known_elo_' + currentUserProfile.uid), 10) || 0;
      if (elo > savedElo) {
        setTimeout(function() {
          if (typeof showAchievement === 'function') {
            showAchievement('🏆 Повышение ранга!', icon, cleanStatusName, 'Ваш рейтинг достиг ' + elo + ' Эло. Так держать!');
          }
        }, 1000);
      }
    }
    
    localStorage.setItem('tt_last_known_status_' + currentUserProfile.uid, currentStatus);
    localStorage.setItem('tt_last_known_elo_' + currentUserProfile.uid, elo);
  }
  
  var authScreen = document.getElementById('mandatory-auth-screen'); 
  if (authScreen) authScreen.style.display = 'none';

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
  var pStatus = typeof getPlayerStatus === 'function' ? getPlayerStatus(elo) : 'Игрок';

  var questBadgeHtml = (currentUserProfile.activeBadge && currentUserProfile.activeBadge.expires > Date.now()) 
  ? '<span class="temporary-badge" style="color: ' + currentUserProfile.activeBadge.color + '; border-color: ' + currentUserProfile.activeBadge.color + '; cursor: pointer;" onclick="showBadgeInfo(\'' + currentUserProfile.activeBadge.text + '\')">' + currentUserProfile.activeBadge.text + '</span>' 
  : '';

  document.getElementById('user-name-container').innerHTML = '<span class="user-name-text">Вы: <b>' + cleanHtml(currentUserProfile.name) + '</b></span> ' + adminTag + ' ' + customBadge + questBadgeHtml;

  var qCompleted = parseInt(currentUserProfile.questsCompleted, 10) || 0;
  var questStatsHtml = qCompleted > 0 ? '<div style="font-size: 11px; color: var(--accent-purple); font-weight: 700; margin-top: 4px;">🎯 Выполнено квестов: ' + qCompleted + '</div>' : '';

  // ВАЖНО: Добавлена плашка Последней игры без зависаний
  document.getElementById('user-stats-container').innerHTML = '<div style="display: flex; flex-direction: column; gap: 4px;"><span class="player-status-tag">' + pStatus + rttfText + '</span><span class="player-status-tag" style="color: #0284c7;">⏱ За столом: ' + (typeof formatMinutes === 'function' ? formatMinutes(minsTotal) : minsTotal+' мин') + '</span><span id="main-profile-last-match" class="player-status-tag" style="color: var(--accent-sky);">🗓 Последняя игра: загрузка...</span>' + questStatsHtml + '</div><div style="display: flex; flex-direction: column; gap: 4px; text-align: right;"><div><span class="player-status-tag" style="display: inline;">' + wins + 'В - ' + losses + 'П</span>' + streakText + '</div><span class="player-status-tag">(' + winrate + '%)</span></div>';
  
  if (typeof renderQuestBoard === 'function') renderQuestBoard();

  var mContainer = document.getElementById('user-medals-container');
  if (mContainer) {
    var m = currentUserProfile.medals || {gold:0, silver:0, bronze:0};
    if (m.gold > 0 || m.silver > 0 || m.bronze > 0 || (currentUserProfile.tournamentsPlayed > 0)) {
      mContainer.innerHTML = '<div class="medal-item">🏆 ' + (currentUserProfile.tournamentsPlayed || 0) + '</div><div class="medal-item">🥇 ' + (m.gold || 0) + '</div><div class="medal-item">🥈 ' + (m.silver || 0) + '</div><div class="medal-item">🥉 ' + (m.bronze || 0) + '</div>';
      mContainer.style.display = 'flex';
    } else { mContainer.style.display = 'none'; }
  }

  var invContainer = document.getElementById('user-inventory-container');
  if (invContainer) {
    if (currentUserProfile.blade || currentUserProfile.rubberL || currentUserProfile.rubberR) {
      var invHtml = '<div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed var(--card-border); padding-bottom: 4px; margin-bottom: 2px;">Ракетка:</div>';
      if (currentUserProfile.blade && typeof getInventoryRowHtml === 'function') invHtml += getInventoryRowHtml('🏓', 'Основание:', currentUserProfile.blade, 'Основание для ракетки настольного тенниса');
      if (currentUserProfile.rubberL && typeof getInventoryRowHtml === 'function') invHtml += getInventoryRowHtml('🔴', 'Накладка L:', currentUserProfile.rubberL, 'Накладка для ракетки настольного тенниса');
      if (currentUserProfile.rubberR && typeof getInventoryRowHtml === 'function') invHtml += getInventoryRowHtml('⚫', 'Накладка R:', currentUserProfile.rubberR, 'Накладка для ракетки настольного тенниса');
      invContainer.innerHTML = invHtml; invContainer.className = 'inventory-box'; invContainer.style.display = 'flex';
    } else { invContainer.style.display = 'none'; }
  }

  var bEdit = document.getElementById('btn-edit-profile'); if (bEdit) bEdit.style.display = 'block';
  var bLogout = document.getElementById('btn-logout'); if (bLogout) bLogout.style.display = 'block';

  // --- ФОНОВЫЙ ПОИСК МАТЧЕЙ ДЛЯ ПРОФИЛЯ (СТАРЫЙ РАБОЧИЙ МЕТОД, КАК В КАРТОЧКЕ) ---
  try {
      db.collection('matches_history').get().then(function(allSnaps) {
          var matches = [];
          allSnaps.forEach(function(docX) {
              var mx = docX.data();
              // Ищем матчи локально, не блокируя базу!
              if (mx && mx.participants && mx.participants.indexOf(currentUserProfile.uid) !== -1) { 
                  matches.push(mx); 
              }
          });
          
          var lastMatchStr = 'Ещё не играл';
          if (matches.length > 0) {
              matches.sort(function(a, b) { return (typeof parseTime==='function'?parseTime(b.timestamp):b.timestamp) - (typeof parseTime==='function'?parseTime(a.timestamp):a.timestamp); });
              try {
                  var lastTs = typeof parseTime==='function'?parseTime(matches[0].timestamp):matches[0].timestamp;
                  if (lastTs) {
                      var mDate = new Date(lastTs);
                      var day = ('0' + mDate.getDate()).slice(-2);
                      var month = ('0' + (mDate.getMonth() + 1)).slice(-2);
                      var today = new Date(); today.setHours(0,0,0,0);
                      var matchDay = new Date(lastTs); matchDay.setHours(0,0,0,0);
                      var diffDays = Math.round((today.getTime() - matchDay.getTime()) / 86400000);
                      var daysText = (diffDays === 0) ? " (Сегодня)" : (diffDays === 1) ? " (Вчера)" : ' (' + diffDays + ' дн. назад)';
                      lastMatchStr = day + '.' + month + '.' + mDate.getFullYear() + daysText;
                  }
              } catch(e) {}
          }
          var el = document.getElementById('main-profile-last-match');
          if (el) el.innerHTML = '🗓 Последняя игра: ' + lastMatchStr;
      }).catch(function(e) {
          var el = document.getElementById('main-profile-last-match');
          if (el) el.innerHTML = '🗓 Последняя игра: Ошибка';
      });
  } catch(e) {}
}
// --- ПРОВЕРКА НЕАКТИВНОСТИ ДЛЯ ПРЕДУПРЕЖДЕНИЯ О ШТРАФЕ ---
  try {
      db.collection('matches_history').get().then(function(allSnaps) {
          var matches = [];
          allSnaps.forEach(function(docX) {
              var mx = docX.data();
              if (mx && mx.participants && mx.participants.indexOf(currentUserProfile.uid) !== -1) { 
                  matches.push(mx); 
              }
          });
          
          var lastMatchStr = 'Ещё не играл';
          var diffDays = 999; // Если вообще не играл, пока не трогаем новичков по таймеру регистрации

          if (matches.length > 0) {
              matches.sort(function(a, b) { return (typeof parseTime==='function'?parseTime(b.timestamp):b.timestamp) - (typeof parseTime==='function'?parseTime(a.timestamp):a.timestamp); });
              try {
                  var lastTs = typeof parseTime==='function'?parseTime(matches[0].timestamp):matches[0].timestamp;
                  if (lastTs) {
                      var mDate = new Date(lastTs);
                      var day = ('0' + mDate.getDate()).slice(-2);
                      var month = ('0' + (mDate.getMonth() + 1)).slice(-2);
                      var today = new Date(); today.setHours(0,0,0,0);
                      var matchDay = new Date(lastTs); matchDay.setHours(0,0,0,0);
                      diffDays = Math.round((today.getTime() - matchDay.getTime()) / 86400000);
                      
                      var daysText = (diffDays === 0) ? " (Сегодня)" : (diffDays === 1) ? " (Вчера)" : ' (' + diffDays + ' дн. назад)';
                      lastMatchStr = day + '.' + month + '.' + mDate.getFullYear() + daysText;
                  }
              } catch(e) {}
          }

          var el = document.getElementById('main-profile-last-match');
          if (el) {
              // Если прошло 5 или 6 дней — выводим тревожное предупреждение!
              if (diffDays >= 5 && diffDays < 7) {
                  var daysLeft = 7 - diffDays;
                  el.innerHTML = '⚠️ До штрафа (-50 Эло) осталось <b>' + daysLeft + ' дн.</b>!';
                  el.style.color = '#ef4444'; // Красный акцент
                  el.style.fontWeight = '700';
              } else {
                  el.innerHTML = '🗓 Последняя игра: ' + lastMatchStr;
                  el.style.color = 'var(--accent-sky)';
                  el.style.fontWeight = 'normal';
              }
          }
      }).catch(function(e) {});
  } catch(e) {}

function handleEditProfileClick() { 
  if (typeof vibrate === 'function') vibrate('light'); 
  if (isUserVerified()) { 
    document.getElementById('name-input').value = currentUserProfile.name || ''; 
    document.getElementById('blade-input').value = currentUserProfile.blade || ''; 
    document.getElementById('rubber-l-input').value = currentUserProfile.rubberL || ''; 
    document.getElementById('rubber-r-input').value = currentUserProfile.rubberR || ''; 
    document.getElementById('rttf-input').value = currentUserProfile.rttf || ''; 
    openModalSmoothly('name-modal');
  } else {
    if(typeof customAlert==='function') customAlert("Требуется авторизация!");
  }
}
function hideNameModal() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('name-modal'); }

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
      updateAdminControls();
      hideNameModal(); 
      if(typeof renderAll === 'function') renderAll();
  }).catch(function(e) { if(typeof customAlert==='function') customAlert("Не удалось сохранить профиль: " + e.message); });
}

function openAdminMenu() { 
  openModalSmoothly('admin-modal');
  if (isSuperAdmin()) {
    db.collection('users').orderBy('elo', 'desc').get().then(function(snap) {
      var sel = document.getElementById('admin-bounty-select');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Выберите цель --</option>';
      snap.forEach(function(doc) {
        var d = doc.data();
        sel.innerHTML += '<option value="' + doc.id + '">' + cleanHtml(d.name) + ' (' + (d.elo || 1000) + ')</option>';
      });
    });
  }
}

window.currentBountyTargets = {};

window.openBountyProfile = function(uid) {
  if (uid && typeof showUserInfoModal === 'function') {
    showUserInfoModal(uid);
  }
};

window.saveBounty = function() {
  if (!isSuperAdmin()) return;
  var sel = document.getElementById('admin-bounty-select');
  var targetUid = sel.value;
  if (!targetUid) return customAlert("Выберите игрока!");
  var targetText = sel.options[sel.selectedIndex].text.split(' (')[0];

  db.collection('settings').doc('bounty').get().then(function(doc) {
    var targets = (doc.exists && doc.data().targets) ? doc.data().targets : {};
    targets[targetUid] = targetText;

    db.collection('settings').doc('bounty').set({ targets: targets }, { merge: true }).then(function() {
      var msg = "🎯 <b>СЕЗОН ОХОТЫ РАСШИРЯЕТСЯ!</b> 🎯\n\nВ списке разыскиваемых пополнение. Назначена награда за голову: <b>" + targetText + "</b>!\n\n💰 <b>Награда: +100 Эло</b> за победу (1х1).\n\n<i>Кто заберет куш?</i> 🩸🐺";
      if(typeof sendTelegramAlert==='function') sendTelegramAlert(msg);
      if(typeof customAlert==='function') customAlert("✅ " + targetText + " добавлен в список розыска!");
      closeAdminMenu();
    });
  });
};
window.saveEloBoost = function() {
  if (!isSuperAdmin()) return;
  
  var selectEl = document.getElementById('admin-elo-boost');
  if (!selectEl) return;
  
  var mult = parseInt(selectEl.value, 10) || 1;
  
  db.collection('settings').doc('elo_boost').set({ multiplier: mult }, { merge: true }).then(function() {
    if (mult > 1) {
      var tgMsg = "";
      
      // Генерируем веселые сообщения в зависимости от уровня безумия
      if (mult === 2) {
          tgMsg = "🔥 <b>ДВОЙНОЙ ФОРСАЖ! (БУСТ x2)</b> 🔥\n\nАдмин сегодня в хорошем настроении! Все победы приносят в 2 раза больше рейтинга.\n\n<i>Идеальное время, чтобы поднять свой статус!</i> 🏓";
      } else if (mult === 3) {
          tgMsg = "🚀 <b>ТРОЙНОЙ КУШ! (БУСТ x3)</b> 🚀\n\nВ клубе становится жарко! Залетайте за столы, Эло умножается на 3!\n\n<i>Рискуй, побеждай, доминируй!</i> 🏓";
      } else if (mult === 5) {
          tgMsg = "😱 <b>АДМИН СОШЕЛ С УМА! (БУСТ x5)</b> 😱\n\nПолная анархия в клубе ЧМЗ! За победу насыпают в 5 РАЗ БОЛЬШЕ рейтинга!\n\n<i>Хватай ракетку, бросай все дела, Эло само себя не заработает!</i> 🌪️";
      } else if (mult >= 10) {
          tgMsg = "🤯 <b>ПОЛНЫЙ БЕСПРЕДЕЛ! (БУСТ x10)</b> 🤯\n\nКнопка сломалась! Неслыханная щедрость! Рейтинг летит в космос!\n\n<i>Один матч может сделать тебя легендой. Бегом к столу!</i> 💥";
      } else {
          tgMsg = "🔥 <b>ВКЛЮЧЕН ГЛОБАЛЬНЫЙ БУСТ x" + mult + "!</b> 🔥\n\nОчки за победу умножены!\n\n<i>Скорее за стол!</i> 🏓";
      }
      
      if (typeof sendTelegramAlert === 'function') sendTelegramAlert(tgMsg);
      if (typeof customAlert === 'function') customAlert("✅ Буст x" + mult + " успешно включен!");
      
    } else {
      // Сообщение об отключении
      if (typeof sendTelegramAlert === 'function') sendTelegramAlert("🛑 <b>Халява кончилась.</b> Буст Эло отключен, возвращаемся к суровым будням и стандартному начислению (x1).");
      if (typeof customAlert === 'function') customAlert("✅ Буст отключен!");
    }
    
    closeAdminMenu();
  }).catch(function(e) {
    if (typeof customAlert === 'function') customAlert("Ошибка сохранения: " + e.message);
  });
};
window.clearBounty = function(silent) {
  if (!isSuperAdmin()) return;
  db.collection('settings').doc('bounty').delete().then(function() {
    if (!silent) {
      if(typeof sendTelegramAlert==='function') sendTelegramAlert("🛑 <b>Охота отменена.</b> Все награды отозваны.");
      if(typeof customAlert==='function') customAlert("✅ Все охоты отменены!");
      closeAdminMenu();
    }
  });
};

try {
  db.collection('settings').doc('bounty').onSnapshot(function(doc) {
    var banner = document.getElementById('global-bounty-banner');
    var container = document.getElementById('bounty-targets-container');
    
    if (doc.exists && doc.data().targets && Object.keys(doc.data().targets).length > 0) {
      window.currentBountyTargets = doc.data().targets;
      
      if (banner) banner.style.display = 'block';
      if (container) {
        container.innerHTML = ''; 
        Object.keys(window.currentBountyTargets).forEach(function(uid) {
          var name = window.currentBountyTargets[uid];
          
          var badge = document.createElement('div');
          badge.style = "display: inline-flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border: 1px solid #ef4444; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: 0.2s;";
          badge.onmousedown = function(){ this.style.opacity='0.7'; };
          badge.onmouseup = function(){ this.style.opacity='1'; };
          badge.onmouseleave = function(){ this.style.opacity='1'; };
          badge.onclick = function() { window.openBountyProfile(uid); };
          
          badge.innerHTML = '<span style="font-size: 14px; margin-right: 8px;">👤</span>' +
                            '<span style="font-size: 14px; font-weight: 900; color: #fde047; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">' + cleanHtml(name) + '</span>' +
                            '<span id="bounty-tag-' + uid + '" style="display: none; margin-left: 8px; align-items: center;"></span>';
          container.appendChild(badge);

          db.collection('users').doc(uid).get().then(function(uDoc) {
            if (uDoc.exists) {
              var uData = uDoc.data();
              var tagEl = document.getElementById('bounty-tag-' + uid);
              if (tagEl) {
                var adminTag = (typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(uid) !== -1) ? '<span class="platform-badge badge-admin" style="font-size:10px; padding: 2px 4px;">Админ ⭐</span>' : '';
                var customBadge = (typeof getCustomBadge === 'function') ? getCustomBadge(uid) : '';
                var dbTag = uData.tag || uData.role || uData.status || uData.customTag || uData.roleTag || uData.title || "";
                var dbTagHtml = dbTag ? '<span style="background: #eab308; color: #000; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">' + cleanHtml(dbTag) + '</span>' : '';

                var combinedTags = (adminTag + " " + customBadge + " " + dbTagHtml).trim();
                if (combinedTags) {
                  tagEl.innerHTML = combinedTags;
                  tagEl.style.display = 'inline-flex';
                  tagEl.style.gap = '4px';
                  tagEl.style.background = 'transparent';
                  tagEl.style.padding = '0';
                }
              }
            }
          });
        });
      }
    } else {
      window.currentBountyTargets = {};
      if (banner) banner.style.display = 'none';
      if (container) container.innerHTML = '';
    }
  });
} catch(e) {}

function closeAdminMenu() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('admin-modal'); }
function sendAdminBroadcast() {
  if(!isSuperAdmin()) return; var t = document.getElementById('admin-broadcast-text').value.trim(); if(!t) return;
  if(typeof sendTelegramAlert==='function') sendTelegramAlert("📢 <b>Сообщение от администрации клуба:</b>\n\n" + cleanHtml(t)); document.getElementById('admin-broadcast-text').value = ''; closeAdminMenu(); if(typeof customAlert==='function') customAlert("✅ Отправлено");
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

    if(typeof sendTelegramAlert==='function') sendTelegramAlert(text);
    closeAdminMenu();
    if(typeof customAlert==='function') customAlert("✅ Статистика и ТОП-10 отправлены в чат!");
  }).catch(function(err) {
    if(typeof customAlert==='function') customAlert("Ошибка сбора статистики: " + err.message);
  });
}

function openAnnouncementModal(loc) { 
  if(!isSuperAdmin()) return; 
  document.getElementById('announcement-target-loc').value = 'vostok'; 
  
  var aData = announcementsData.vostok;
  var dateInput = document.getElementById('announcement-date');
  var descInput = document.getElementById('announcement-textarea');

  if (aData && typeof aData === 'object') {
      dateInput.value = aData.date || '';
      descInput.value = aData.desc || '';
  } else {
      dateInput.value = '';
      descInput.value = aData || '';
  }
  openModalSmoothly('announcement-modal'); 
}

function closeAnnouncementModal() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('announcement-modal'); }

function saveAnnouncement() { 
  var dateStr = document.getElementById('announcement-date').value.trim();
  var descStr = document.getElementById('announcement-textarea').value.trim();
  
  if (!dateStr && !descStr) return deleteAnnouncement();

  var obj = { vostok: { date: dateStr, desc: descStr } };
  
  db.collection('settings').doc('announcements').set(obj, { merge: true }).then(function() {
      closeAnnouncementModal(); 
      
      var tgText = "📢 <b>АНОНС ВСТРЕЧИ КЛУБА!</b>\n\n📍 Место: <b>в ДК «Восток» 🏛</b>\n";
      if (dateStr) tgText += "🗓 <b>Дата и время:</b> " + cleanHtml(dateStr) + "\n";
      if (descStr) tgText += "\n📝 " + cleanHtml(descStr) + "\n";
      tgText += "\n<i>Заходите в приложение, чтобы спланировать визит и занять стол!</i> 🏓";
      
      if(typeof sendTelegramAlert==='function') sendTelegramAlert(tgText);
  });
}

function deleteAnnouncement() { 
  if(!isSuperAdmin()) return; 
  var obj = { vostok: null };
  db.collection('settings').doc('announcements').set(obj, { merge: true }).then(function() {
      closeAnnouncementModal(); 
      if(typeof customAlert==='function') customAlert("✅ Анонс успешно удален");
  });
}

function showUserInfoModal(uid) {
  if(!uid) return;
  document.getElementById('info-modal-title').innerHTML = "👤 Загрузка..."; 
  document.getElementById('info-modal-content-area').innerHTML = "Загрузка данных профиля...";
  document.getElementById('info-modal-history').innerHTML = '<span class="empty-note">Загрузка матчей...</span>';
  
  var mMedals = document.getElementById('info-modal-medals');
  if(mMedals) mMedals.style.display = 'none';
  var mInv = document.getElementById('info-modal-inventory');
  if(mInv) mInv.style.display = 'none';
  
  openModalSmoothly('user-info-modal');
  
  var userPromise = db.collection('users').doc(uid).get({ source: 'server' }).catch(function() {
      return db.collection('users').doc(uid).get(); 
  });

  Promise.all([
    userPromise,
    db.collection('leaderboard').doc(uid).get()
  ]).then(function(docs) {
    var d = docs[0], ld = docs[1];
    if (!d.exists) { closeUserInfoModal(); return; }

    var u = d.data() || {};
    var myUid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    if (uid === myUid && typeof currentUserProfile !== 'undefined') {
      if (!u.blade && currentUserProfile.blade) u.blade = currentUserProfile.blade;
      if (!u.rubberL && currentUserProfile.rubberL) u.rubberL = currentUserProfile.rubberL;
      if (!u.rubberR && currentUserProfile.rubberR) u.rubberR = currentUserProfile.rubberR;
    }

    var adminTag = (typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(uid) !== -1) ? '<span class="platform-badge badge-admin" style="margin-left:4px;">Админ ⭐</span>' : '';
    var customBadge = (typeof getCustomBadge === 'function') ? getCustomBadge(uid) : '';
    var qBadge = (u.activeBadge && u.activeBadge.expires > Date.now()) ? '<span class="temporary-badge" style="color: ' + u.activeBadge.color + '; border-color: ' + u.activeBadge.color + '; cursor: pointer;" onclick="showBadgeInfo(\'' + cleanHtml(u.activeBadge.text) + '\')">' + cleanHtml(u.activeBadge.text) + '</span>' : '';
    
    document.getElementById('info-modal-title').innerHTML = "👤 " + cleanHtml(u.name || "Игрок") + " " + adminTag + " " + customBadge + " " + qBadge;
    
    var uidHtml = (typeof isSuperAdmin === 'function' && isSuperAdmin()) ? '<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; padding-bottom: 8px; border-bottom: 1px solid var(--card-border);"><span style="color: var(--text-muted);">UID:</span><span style="font-weight: 600; color: #f87171; font-family: monospace; font-size: 11px;">' + cleanHtml(uid) + '</span></div>' : '';
    
    var mins = (ld.exists && ld.data()) ? (ld.data().totalMinutes || 0) : 0;
    var wins = parseInt(u.wins, 10) || 0;
    var losses = parseInt(u.losses, 10) || 0;
    var matchesCount = parseInt(u.matches, 10) || 0;
    var winrate = matchesCount > 0 ? Math.round((wins / matchesCount) * 100) : 0;
    var lastDelta = parseInt(u.lastEloDelta, 10) || 0;
    var deltaHtml = lastDelta ? (lastDelta > 0 ? '<span class="elo-delta elo-up">(+' + lastDelta + ') 📈</span>' : '<span class="elo-delta elo-down">(' + lastDelta + ') 📉</span>') : '';
    var streakText = (u.winStreak && u.winStreak >= 3) ? '<span class="streak-fire" title="Серия побед">🔥' + u.winStreak + ' побед</span>' : '';

    if (mMedals) {
      var m = u.medals || { gold:0, silver:0, bronze:0 };
      if (m.gold > 0 || m.silver > 0 || m.bronze > 0 || u.tournamentsPlayed > 0) {
        mMedals.innerHTML = '<div class="medal-item">🏆 ' + (u.tournamentsPlayed || 0) + '</div><div class="medal-item">🥇 ' + (m.gold || 0) + '</div><div class="medal-item">🥈 ' + (m.silver || 0) + '</div><div class="medal-item">🥉 ' + (m.bronze || 0) + '</div>'; 
        mMedals.style.display = 'flex';
      } else { mMedals.style.display = 'none'; }
    }

    var eloDisplay = u.elo !== undefined ? u.elo : 1000;
    var pStatus = typeof getPlayerStatus === 'function' ? getPlayerStatus(eloDisplay) : 'Игрок';
    
    var invHtml = '';
    if (u.blade || u.rubberL || u.rubberR) {
        var renderRow = function(icon, label, val, searchPrefix) {
            if (!val) return '';
            var searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(searchPrefix + ' ' + val);
            return '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; min-height: 24px;">' +
                     '<div style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); flex-shrink: 0;"><span>' + icon + '</span><span>' + label + '</span></div>' +
                     '<div style="display: flex; align-items: center; gap: 6px; min-width: 0; justify-content: flex-end; text-align: right;">' +
                       '<b style="color: var(--text); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="' + cleanHtml(val) + '">' + cleanHtml(val) + '</b>' +
                       '<button class="btn-info" style="width: 20px; height: 20px; font-size: 10px; padding: 0; flex-shrink: 0;" onclick="openExternalLink(\'' + searchUrl + '\')">i</button>' +
                     '</div></div>';
        };

        invHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 6px;">' +
                  '<div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Ракетка:</div>' +
                  renderRow('🏓', 'Основание:', u.blade, 'Основание для ракетки настольного тенниса') +
                  renderRow('🔴', 'Накладка L:', u.rubberL, 'Накладка для ракетки настольного тенниса') +
                  renderRow('⚫', 'Накладка R:', u.rubberR, 'Накладка для ракетки настольного тенниса') +
                  '</div>';
    }
    
    var confirmedInvites = Math.max(0, parseInt(u.confirmedInvitesCount, 10) || 0);
    var pendingInvites = Math.max(0, parseInt(u.pendingInvitesCount, 10) || 0);

   var ambassadorBadge = (confirmedInvites >= 5) 
  ? '<span class="platform-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; margin-left: 4px; font-weight: 700; border: none; padding: 2px 7px; border-radius: 6px; font-size: 11px; cursor: pointer;" onclick="showBadgeInfo(\'🤝 Амбассадор\')">Амбассадор 🤝</span>' 
  : '';

    document.getElementById('info-modal-title').innerHTML = "👤 " + cleanHtml(u.name || "Игрок") + " " + adminTag + " " + customBadge + " " + ambassadorBadge;

    var invitesHtml = '';
    if (confirmedInvites > 0 || pendingInvites > 0) {
      var pendingStr = pendingInvites > 0 ? '<span style="color: var(--text-muted); opacity: 0.45; font-size: 12px; margin-left: 5px;" title="Ожидают квалификации (сыграно менее 3 матчей)">(+' + pendingInvites + ' ожид.)</span>' : '';
      invitesHtml = '<div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px; margin-bottom: 4px;">' +
                    '<span style="color: var(--text-muted);">Добавил участников:</span><div><span style="font-weight: 700; color: #10b981; font-size: 13px;">' + confirmedInvites + '</span>' + pendingStr + '<span style="margin-left: 4px;">🤝</span></div></div>';
    }

    document.getElementById('info-modal-content-area').innerHTML = uidHtml +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Клубный рейтинг:</span><div><span style="font-weight: 700; color: #9333ea;">' + eloDisplay + '</span>' + deltaHtml + '</div></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Рейтинг РТТФ:</span><span style="font-weight: 600; color: var(--text-muted);">' + (u.rttf || "Не указан") + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Статус:</span><span style="font-weight: 600;">' + pStatus + '</span></div>' +
      '<div id="dynamic-last-match-date" style="display: flex; justify-content: space-between; font-size: 13px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 6px; margin-top: 4px;"><span style="color: var(--text-muted);">Последняя игра:</span><span style="font-weight: 600; color: var(--text-muted);">Загрузка...</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px; margin-bottom: 4px;"><span style="color: var(--text-muted);">Время за столом:</span><span style="font-weight: 600; color: var(--accent-gold);">' + (typeof formatMinutes === 'function' ? formatMinutes(mins) : mins+' мин') + '</span></div>' +
      invitesHtml +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Матчей (всего):</span><span style="font-weight: 600;">' + matchesCount + '</span></div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="color: var(--text-muted);">Победы/Поражения:</span><div><span style="font-weight: 600; color: #059669;">' + wins + 'В - ' + losses + 'П (' + winrate + '%)</span>' + streakText + '</div></div>' + 
      invHtml;

    // СУПЕР-ОПТИМИЗАЦИЯ: Грузим ТОЛЬКО матчи этого игрока, а не всего клуба!
    db.collection('matches_history').where('participants', 'array-contains', uid).get().then(function(allSnaps) {
        var matches = [];
        allSnaps.forEach(function(docX) {
          var mx = docX.data();
          mx.docId = docX.id; 
          matches.push(mx);
        });

        var lastMatchStr = '<span style="font-weight: 600; color: var(--text-muted); opacity: 0.6;">Ещё не играл</span>';
        if (matches.length > 0) {
          matches.sort(function(a, b) { return (typeof parseTime==='function'?parseTime(b.timestamp):b.timestamp) - (typeof parseTime==='function'?parseTime(a.timestamp):a.timestamp); });
          try {
            var lastTs = typeof parseTime==='function'?parseTime(matches[0].timestamp):matches[0].timestamp;
            if (lastTs) {
              var mDate = new Date(lastTs);
              var day = ('0' + mDate.getDate()).slice(-2);
              var month = ('0' + (mDate.getMonth() + 1)).slice(-2);
              var today = new Date(); today.setHours(0,0,0,0);
              var matchDay = new Date(lastTs); matchDay.setHours(0,0,0,0);
              var diffDays = Math.round((today.getTime() - matchDay.getTime()) / 86400000);
              var daysText = (diffDays === 0) ? " (Сегодня)" : (diffDays === 1) ? " (Вчера)" : ' (<span style="' + (diffDays >= 7 ? 'color: var(--accent-red);' : 'color: var(--text-muted);') + '">' + diffDays + ' дн. назад</span>)';
              lastMatchStr = '<span style="font-weight: 600; color: var(--accent-sky);">' + day + '.' + month + '.' + mDate.getFullYear() + '<span style="font-size: 11px; margin-left: 6px;">' + daysText + '</span></span>';
            }
          } catch(e) {}
        }
        
        var dynRow = document.getElementById('dynamic-last-match-date');
        if (dynRow) dynRow.innerHTML = '<span style="color: var(--text-muted);">Последняя игра:</span>' + lastMatchStr;

        if (typeof renderUserHistoryList === 'function') renderUserHistoryList(matches, uid);
    }).catch(function(err) {
        document.getElementById('info-modal-history').innerHTML = '<span class="empty-note">История матчей временно недоступна</span>';
        var dynRow = document.getElementById('dynamic-last-match-date');
        if (dynRow) dynRow.innerHTML = '<span style="color: var(--text-muted);">Последняя игра:</span><span style="font-weight: 600; color: var(--text-muted); opacity: 0.6;">Ошибка сети</span>';
    });
  }).catch(function(e) { closeUserInfoModal(); });
}

function processMatchesData(matches, uid) {
    var lastMatchStr = '<span style="font-weight: 600; color: var(--text-muted); opacity: 0.6;">Ещё не играл</span>';
    if (matches.length > 0) {
      matches.sort(function(a, b) { return (typeof parseTime==='function'?parseTime(b.timestamp):b.timestamp) - (typeof parseTime==='function'?parseTime(a.timestamp):a.timestamp); });
      try {
        var lastTs = typeof parseTime==='function'?parseTime(matches[0].timestamp):matches[0].timestamp;
        if (lastTs) {
          var mDate = new Date(lastTs);
          var day = ('0' + mDate.getDate()).slice(-2);
          var month = ('0' + (mDate.getMonth() + 1)).slice(-2);
          var today = new Date(); today.setHours(0,0,0,0);
          var matchDay = new Date(lastTs); matchDay.setHours(0,0,0,0);
          var diffDays = Math.round((today.getTime() - matchDay.getTime()) / 86400000);
          var daysText = (diffDays === 0) ? " (Сегодня)" : (diffDays === 1) ? " (Вчера)" : ' (<span style="' + (diffDays >= 7 ? 'color: var(--accent-red);' : 'color: var(--text-muted);') + '">' + diffDays + ' дн. назад</span>)';
          lastMatchStr = '<span style="font-weight: 600; color: var(--accent-sky);">' + day + '.' + month + '.' + mDate.getFullYear() + '<span style="font-size: 11px; margin-left: 6px;">' + daysText + '</span></span>';
        }
      } catch(e) {}
    }
    
    var dynRow = document.getElementById('dynamic-last-match-date');
    if (dynRow) dynRow.innerHTML = '<span style="color: var(--text-muted);">Последняя игра:</span>' + lastMatchStr;
    if (typeof renderUserHistoryList === 'function') renderUserHistoryList(matches, uid);
}

function renderUserHistoryFromSnaps(snaps, uid) {
  var matches = [];
  snaps.forEach(function(docX) { matches.push(docX.data()); });
  if (typeof renderUserHistoryList === 'function') renderUserHistoryList(matches, uid);
}

function renderUserHistoryList(matches, uid) {
  var hEl = document.getElementById('info-modal-history');
  if (!hEl) return;
  if (!matches || matches.length === 0) { hEl.innerHTML = '<span class="empty-note">Матчей пока нет</span>'; return; }
  
  matches.sort(function(a, b) { return (typeof parseTime==='function'?parseTime(b.timestamp):b.timestamp) - (typeof parseTime==='function'?parseTime(a.timestamp):a.timestamp); });
  var recentMatches = matches.slice(0, 10);
  var html = '';
  
  recentMatches.forEach(function(m) {
    try {
      var isDoubles = m.type === 'doubles';
      var s1 = isDoubles ? m.team1Score : m.p1Score;
      var s2 = isDoubles ? m.team2Score : m.p2Score;
      
      var isMyTeamWin = false;
      if (isDoubles) {
        var isTeam1 = m.team1Uids && m.team1Uids.indexOf(uid) !== -1;
        isMyTeamWin = isTeam1 ? (s1 > s2) : (s2 > s1);
      } else {
        var isP1 = m.p1Uid === uid;
        isMyTeamWin = isP1 ? (s1 > s2) : (s2 > s1);
      }

      var p1Color = isMyTeamWin && ((isDoubles && m.team1Uids.indexOf(uid) !== -1) || (!isDoubles && m.p1Uid === uid)) ? 'color: #10b981;' : '';
      var p2Color = isMyTeamWin && ((isDoubles && m.team2Uids.indexOf(uid) !== -1) || (!isDoubles && m.p2Uid === uid)) ? 'color: #10b981;' : '';

      var d = new Date(typeof parseTime==='function'?parseTime(m.timestamp):m.timestamp);
      var day = ('0' + d.getDate()).slice(-2);
      var month = ('0' + (d.getMonth() + 1)).slice(-2);
      var hours = ('0' + d.getHours()).slice(-2);
      var minutes = ('0' + d.getMinutes()).slice(-2);
      var timeStr = day + '.' + month + '.' + d.getFullYear() + ' ' + hours + ':' + minutes;
      
      var badgeHtml = isDoubles ? '<span class="badge-mode badge-mode-doubles">2x2</span> ' : '<span class="badge-mode badge-mode-singles">1x1</span> ';

      var leftSideHtml = '';
      var rightSideHtml = '';

      if (isDoubles) {
        leftSideHtml = '<span style="text-align:right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; ' + p1Color + '">' + cleanHtml(m.team1Names) + '</span>';
        rightSideHtml = '<span style="text-align:left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; ' + p2Color + '">' + cleanHtml(m.team2Names) + '</span>';
      } else {
        leftSideHtml = '<span class="clickable-name" style="text-align:right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ' + p1Color + '" onclick="showUserInfoModal(\'' + escapeJS(m.p1Uid) + '\')">' + cleanHtml(m.p1Name) + '</span>';
        rightSideHtml = '<span class="clickable-name" style="text-align:left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ' + p2Color + '" onclick="showUserInfoModal(\'' + escapeJS(m.p2Uid) + '\')">' + cleanHtml(m.p2Name) + '</span>';
      }

      var adminDelBtn = (typeof isSuperAdmin === 'function' && isSuperAdmin() && m.docId) ? 
        '<div style="margin-left: 6px; cursor: pointer; font-size: 13px; opacity: 0.6; flex-shrink: 0;" onclick="deleteHistoryMatch(\'' + escapeJS(m.docId) + '\', \'' + escapeJS(uid) + '\')" title="Удалить из истории">🗑️</div>' : '';

      html += '<div style="background: var(--list-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; font-size: 13px; margin-bottom: 6px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                  '<div style="display:flex; flex:1; justify-content: flex-end; overflow: hidden;">' + leftSideHtml + '</div>' +
                  '<div style="font-weight: 800; font-size: 14px; background: var(--row-bg); border-radius: 6px; padding: 2px 8px; margin: 0 8px; white-space: nowrap;">' + s1 + ' : ' + s2 + '</div>' +
                  '<div style="display:flex; flex:1; justify-content: flex-start; overflow: hidden;">' + rightSideHtml + '</div>' +
                  adminDelBtn +
                '</div>' +
                '<div style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 4px;">' + badgeHtml + timeStr + '</div>' +
              '</div>';
    } catch(errRow) {}
  });
  hEl.innerHTML = html;
}

function closeUserInfoModal() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('user-info-modal'); }

function openTournamentModal(tourId) { 
  if (!isSuperAdmin()) return; currentEditingTourId = (tourId && typeof tourId === 'string') ? tourId : null; var btn = document.getElementById('btn-save-tour');
  if (currentEditingTourId) { btn.innerText = 'Сохранить изменения'; db.collection('tournaments').doc(currentEditingTourId).get().then(function(doc) { if (doc.exists) { var d = doc.data(); document.getElementById('tour-title').value = d.title || ''; document.getElementById('tour-date').value = d.rawDate || ''; document.getElementById('tour-desc').value = d.desc || ''; } }); } 
  else { btn.innerText = 'Создать'; document.getElementById('tour-title').value = ''; document.getElementById('tour-date').value = ''; document.getElementById('tour-desc').value = ''; }
  openModalSmoothly('tournament-modal');
}
function closeTournamentModal() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('tournament-modal'); }

function saveTournament() {
  if (!isSuperAdmin()) return; 
  var title = document.getElementById('tour-title').value.trim();
  var dateVal = document.getElementById('tour-date').value;
  var desc = document.getElementById('tour-desc').value.trim();
  
  if (!title) { if(typeof customAlert === 'function') customAlert('Введите название турнира'); return; }
  
  var dateStr = ''; 
  if (dateVal) { 
      var d = new Date(dateVal); 
      dateStr = d.toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}); 
  }
  
  var obj = { title: title, dateStr: dateStr, rawDate: dateVal, desc: desc };
  
  if (currentEditingTourId) { 
      // Режим редактирования существующего турнира
      db.collection('tournaments').doc(currentEditingTourId).update(obj).then(function() { 
          if(typeof customAlert === 'function') customAlert('✅ Турнир обновлен'); 
          closeTournamentModal(); 
      }).catch(function(e) { 
          if(typeof customAlert === 'function') customAlert('Ошибка сохранения: ' + e.message); 
      }); 
  } else { 
      // Режим создания НОВОГО турнира
      obj.status = 'registration'; 
      obj.likes = []; 
      obj.dislikes = []; 
      obj.participants = []; 
      obj.groups = {A:[], B:[]}; 
      obj.matches = []; 
      obj.playoffs = {}; 
      obj.results = null; 
      obj.createdAt = Date.now(); 
      
      db.collection('tournaments').add(obj).then(function() { 
          if(typeof customAlert === 'function') customAlert('✅ Турнир успешно создан'); 
          closeTournamentModal(); 
          
          // --- ОТПРАВКА АНОНСА В TELEGRAM ---
          var tgMsg = "🏆 <b>АНОНС ТУРНИРА!</b>\n\nОткрыта регистрация на турнир <b>«" + cleanHtml(title) + "»</b>!\n";
          if (dateStr) tgMsg += "🗓 <b>Дата и время:</b> " + dateStr + "\n";
          if (desc) tgMsg += "\n📝 <b>Информация:</b>\n" + cleanHtml(desc) + "\n";
          tgMsg += "\n<i>Заходите в приложение во вкладку «Турниры», чтобы успеть занять место!</i> 🏓";
          
          if(typeof sendTelegramAlert === 'function') sendTelegramAlert(tgMsg);
          
      }).catch(function(e) { 
          if(typeof customAlert === 'function') customAlert('Ошибка сохранения: ' + e.message); 
      }); 
  }
}

function deleteTournament(id) { 
  if (!isSuperAdmin()) return; 
  if(typeof openConfirmModal === 'function') openConfirmModal('Вы уверены, что хотите удалить этот турнир?', function() { db.collection('tournaments').doc(id).delete().then(function() { if(typeof customAlert === 'function') customAlert("✅ Турнир удален"); }).catch(function(e) { if(typeof customAlert === 'function') customAlert("❌ Ошибка удаления: " + e.message); }); });
}

function toggleTourReaction(id, type) {
  var uid = getVerifiedUserId(); if (!uid) return typeof customAlert==='function'?customAlert('Авторизуйтесь!'):null;
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
  var uid = getVerifiedUserId(); if (!uid) return typeof customAlert==='function'?customAlert('Авторизуйтесь!'):null;
  var ref = db.collection('tournaments').doc(id); var joined = false;
  db.runTransaction(function(t) {
      return t.get(ref).then(function(doc) {
          if (!doc.exists || doc.data().status !== 'registration') return;
          var parts = doc.data().participants || []; var isInList = false;
          for(var i=0; i<parts.length; i++) { if (parts[i].uid === uid) isInList = true; }
          if (!isInList) { parts.push({uid: uid, name: currentUserProfile.name, elo: parseInt(currentUserProfile.elo, 10) || 1000}); t.update(ref, { participants: parts }); joined = true; }
      });
  }).then(function() { if (joined && typeof canSendTgAlert === 'function' && canSendTgAlert('tour_join_' + uid + '_' + id)) { if(typeof sendTelegramAlert === 'function') sendTelegramAlert("🏆 Игрок <b>" + cleanHtml(currentUserProfile.name) + "</b> зарегистрировался на турнир <b>" + title + "</b>!\n\nЗаходите в приложение, чтобы тоже принять участие!"); } }).catch(function(e) {});
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
    if (parts.length < 4) { if(typeof customAlert === 'function') customAlert('Для турнира нужно минимум 4 участника!'); return; }
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
    if (a.length < 2 || b.length < 2) { if(typeof customAlert === 'function') customAlert("Недостаточно игроков в группах для плей-офф!"); return; }

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
    if (!firstM || !thirdM || firstM.score1 === null || thirdM.score1 === null) { if(typeof customAlert === 'function') customAlert("Завершите финалы!"); return; }

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
            if(typeof sendTelegramAlert === 'function') sendTelegramAlert("🏆 <b>Турнир «" + cleanHtml(data.title) + "» завершен!</b>\n\n🥇 <b>1 место:</b> " + cleanHtml(gld.name) + "\n🥈 <b>2 место:</b> " + cleanHtml(slv.name) + "\n🥉 <b>3 место:</b> " + cleanHtml(brn.name) + "\n\nСпасибо всем участникам! Заходите в приложение, чтобы посмотреть сетку и обновленные профили.");
        });
    });
  }).catch(function(e) {});
}

function openTourMatchModal(tourId, matchId, p1Name, p2Name) {
  document.getElementById('tour-match-id-val').value = matchId; 
  document.getElementById('tour-id-val').value = tourId; 
  document.getElementById('tour-match-players-label').innerText = cleanHtml(p1Name) + ' ПРОТИВ ' + cleanHtml(p2Name);
  selectTourScore(3, 0); 
  openModalSmoothly('tour-match-modal'); 
}

function closeTourMatchModal() { if(typeof closeModalSmoothly === 'function') closeModalSmoothly('tour-match-modal'); }

function selectTourScore(s1, s2) { 
    document.getElementById('tour-match-s1').value = s1; 
    document.getElementById('tour-match-s2').value = s2; 
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
              var myDelta = typeof calculateElo === 'function' ? calculateElo(p1Elo, p2Elo, isPWin ? 1 : 0) : 10;
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
  db.collection('users').onSnapshot({ includeMetadataChanges: true }, function(snap) {
    var listEl = document.getElementById('rating-list');
    if (!listEl) return;
    if (snap.empty) { listEl.innerHTML = '<span class="empty-note">Сыграйте первый матч!</span>'; return; }
    
    var users = [];
    var myUid = getVerifiedUserId();
    
    var maxStreak = 0; var streakUid = null;
    var maxMatches = 0; var ironUid = null;

    snap.forEach(function(doc) {
      var d = doc.data();
      if (doc.id.match(/^(tg|google)_/) || d.isVerified) {
        users.push({ uid: doc.id, data: d });
        
        var s = parseInt(d.winStreak, 10) || 0;
        if (s > maxStreak && s >= 3) { maxStreak = s; streakUid = doc.id; }
        
        var m = parseInt(d.matches, 10) || 0;
        if (m > maxMatches && m >= 10) { maxMatches = m; ironUid = doc.id; }
      }
    });

    window.__TT_DYNAMIC_BADGES = window.__TT_DYNAMIC_BADGES || {};
    for (var k in window.__TT_DYNAMIC_BADGES) {
       window.__TT_DYNAMIC_BADGES[k] = window.__TT_DYNAMIC_BADGES[k].filter(function(b) { return b.indexOf('Несокрушимый') === -1 && b.indexOf('Гладиатор') === -1; });
    }
    if (streakUid) {
        window.__TT_DYNAMIC_BADGES[streakUid] = window.__TT_DYNAMIC_BADGES[streakUid] || [];
        window.__TT_DYNAMIC_BADGES[streakUid].push('<span class="platform-badge" style="background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%); color: #fff; border:none; box-shadow: 0 0 8px rgba(239,68,68,0.5); cursor: pointer;" onclick="showBadgeInfo(\'🔥 Несокрушимый\')">🔥 Несокрушимый (' + maxStreak + ')</span>');
    }
    if (ironUid) {
        window.__TT_DYNAMIC_BADGES[ironUid] = window.__TT_DYNAMIC_BADGES[ironUid] || [];
        window.__TT_DYNAMIC_BADGES[ironUid].push('<span class="platform-badge" style="background: linear-gradient(135deg, #64748b 0%, #334155 100%); color: #fff; border:none; cursor: pointer;" onclick="showBadgeInfo(\'⚔️ Гладиатор\')">⚔️ Гладиатор</span>');
    }

    users.sort(function(a, b) { return (parseInt(b.data.elo, 10) || 1000) - (parseInt(a.data.elo, 10) || 1000); });

    var html = '', rank = 1;
    users.forEach(function(item) {
      try {
        var d = item.data;
        var docId = item.uid;
        if (docId === myUid) { 
            var currentTm = currentUserProfile.totalMinutes || 0;
            for(var pk in d) currentUserProfile[pk] = d[pk];
            currentUserProfile.totalMinutes = currentTm;
        }
        var rankClass = rank <= 3 ? 'leader-rank-' + rank : '', medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
        var wins = parseInt(d.wins, 10) || 0;
        var losses = parseInt(d.losses, 10) || 0;
        var matches = parseInt(d.matches, 10) || 0;
        var winrate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
        var adminBadgeHTML = (typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(docId) !== -1) ? '<span class="platform-badge badge-admin" style="cursor: pointer;" onclick="showBadgeInfo(\'Админ ⭐\')">Админ ⭐</span>' : '';
        var customBadge = typeof getCustomBadge === 'function' ? getCustomBadge(docId) : '';
        var rttfText = d.rttf ? ' • РТТФ: ' + d.rttf : '';
        
        var streakHtml = (d.winStreak && d.winStreak >= 3) ? '<span class="streak-fire" title="Серия побед">🔥' + d.winStreak + '</span>' : '';
        var deltaNum = parseInt(d.lastEloDelta, 10) || 0;
        var deltaHtml = deltaNum ? (deltaNum > 0 ? '<span class="elo-delta elo-up">(+' + deltaNum + ') 📈</span>' : '<span class="elo-delta elo-down">(' + deltaNum + ') 📉</span>') : '';

        html += '<div class="leader-row"><div class="leader-left"><span class="leader-rank ' + rankClass + '">' + medal + '</span><div><div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;"><b>' + cleanHtml(d.name) + '</b> ' + adminBadgeHTML + ' ' + customBadge + '</div><div class="player-status-tag">' + (typeof getPlayerStatus==='function'?getPlayerStatus(parseInt(d.elo, 10) || 1000):'Игрок') + rttfText + streakHtml + '</div></div></div><div style="display: flex; align-items: center; gap: 8px;"><div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;"><div><span class="rating-score">' + (parseInt(d.elo, 10) || 1000) + '</span>' + deltaHtml + '</div><span style="font-size: 10px; color: var(--text-muted);">' + wins + 'В - ' + losses + 'П (' + winrate + '%)</span></div><button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(docId) + '\')">i</button></div></div>';
        rank++;
      } catch(e) {}
    });
    listEl.innerHTML = html || '<span class="empty-note">Сыграйте первый матч!</span>';
    
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay(); 
  }, function(err) {});
}

function listenLeaderboard() {
  db.collection('leaderboard').onSnapshot(function(snap) {
    var listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    if (snap.empty) { listEl.innerHTML = '<span class="empty-note">Статистика собирается...</span>'; return; }
    
    var items = [];
    snap.forEach(function(doc) {
      if (doc.id.match(/^(tg|google)_/)) {
        items.push({ uid: doc.id, data: doc.data() });
      }
    });

    items.sort(function(a, b) { return (b.data.totalMinutes || 0) - (a.data.totalMinutes || 0); });

    window.__TT_DYNAMIC_BADGES = window.__TT_DYNAMIC_BADGES || {};
    for (var k in window.__TT_DYNAMIC_BADGES) {
       window.__TT_DYNAMIC_BADGES[k] = window.__TT_DYNAMIC_BADGES[k].filter(function(b) { return b.indexOf('Король стола') === -1; });
    }
    if (items.length > 0 && items[0].data.totalMinutes > 0) {
        var kingUid = items[0].uid;
        window.__TT_DYNAMIC_BADGES[kingUid] = window.__TT_DYNAMIC_BADGES[kingUid] || [];
        window.__TT_DYNAMIC_BADGES[kingUid].push('<span class="platform-badge" style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #000; border:none; box-shadow: 0 0 8px rgba(245,158,11,0.5); cursor: pointer;" onclick="showBadgeInfo(\'👑 Король стола\')">👑 Король стола</span>');
    }

    var html = '', rank = 1;
    items.forEach(function(item) {
      try {
        var d = item.data;
        var docId = item.uid;
        var hours = ((d.totalMinutes || 0) / 60).toFixed(1), rankClass = rank <= 3 ? 'leader-rank-' + rank : '', medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
        var adminBadgeHTML = (typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(docId) !== -1) ? '<span class="platform-badge badge-admin" style="cursor: pointer;" onclick="showBadgeInfo(\'Админ ⭐\')">Админ ⭐</span>' : '';
        var customBadge = typeof getCustomBadge === 'function' ? getCustomBadge(docId) : ''; 
        
        html += '<div class="leader-row"><div class="leader-left"><span class="leader-rank ' + rankClass + '">' + medal + '</span><div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;"><b>' + cleanHtml(d.name) + '</b> ' + adminBadgeHTML + ' ' + customBadge + '</div></div><div style="display: flex; align-items: center; gap: 8px;"><span class="leader-score">' + hours + ' ч (' + (d.sessions || 0) + ' игр)</span><button class="btn-info" onclick="showUserInfoModal(\'' + escapeJS(docId) + '\')">i</button></div></div>';
        rank++;
      } catch (e) {}
    });
    listEl.innerHTML = html || '<span class="empty-note">Статистика собирается...</span>';
    
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay(); 
  }, function(err) {});
}

// ==========================================
// ТОЧКА СТАРТА ПРИЛОЖЕНИЯ И ОТЛОЖЕННАЯ ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  
  // 30 ВРЕДНЫХ СОВЕТОВ ПРО НАСТОЛЬНЫЙ ТЕННИС (И КЛУБ ЧМЗ)
  var ttJokes = [
    "Если ты продул всухую<br>И твой Эло покатился,<br>Ни за что не жми на кнопку<br>«Записать свой результат».",
    "Если вдруг удар не вышел,<br>Сразу жалуйся на ветер,<br>Даже если ты играешь<br>В самом центре ДК «Восток».",
    "Если лупишь ты по сетке<br>Уже пятый раз подряд,<br>Громко крикни: «Это тактика!»<br>Пусть соперник задрожит.",
    "Если стол тебе не нравится<br>В нашем клубе ЧМЗ,<br>Смело двигай его к выходу,<br>Там прохладней и свежей.",
    "Чтобы точно взять победу<br>И поднять свой рейтинг вверх,<br>Прячь ракетку под футболку,<br>Отбивай мячи рукой.",
    "Если Эло стало падать,<br>Удали скорее бота,<br>Нету бота — нет проблемы,<br>Ты по-прежнему звезда.",
    "Выходя к столу в «Востоке»,<br>Сразу делай грозный вид.<br>Промахнешься — смело требуй,<br>Чтобы дали переигровку.",
    "На подаче прячь свой мячик<br>Глубоко в карман штанов,<br>А потом кидай внезапно<br>Прямо в глаз оппоненту.",
    "Если кто-то крутит топсы,<br>Не пытайся отбивать.<br>Лучше просто отвернись<br>И скажи, что ты устал.",
    "Если счет летит к 10:0,<br>И не в твою, увы, пользу,<br>Сделай вид, что ты размялся,<br>И иди попей воды.",
    "Приходи в ДК «Восток»<br>В зимних валенках с шипами.<br>Сцепление будет просто супер,<br>Только пол придется мыть.",
    "Если мяч улетел в угол,<br>Не спеши за ним бежать.<br>Пусть соперник сам приносит,<br>Ему нужнее этот балл.",
    "Чтобы сбить прицел чужой,<br>Громко топай под столом.<br>Теннис — это вам не шахматы,<br>Здесь важна звуковая атака.",
    "Покупай себе ракетку<br>С самой длинною резиной.<br>Чтобы сам не понимал ты,<br>Как и куда летит твой мяч.",
    "Если рейтинг твой пробит,<br>И в таблице ты на дне,<br>Говори, что ты играешь<br>Чисто ради фана, бро.",
    "Перед матчем съешь беляш,<br>Руки вытри об шорты.<br>Хват ракетки будет жестким,<br>И соперник убежит.",
    "На турнире всем кричи:<br>«Я играю в поддавки!»<br>Если выиграл — ты гений,<br>Проиграл — ну, так и было.",
    "Если сетка помешала<br>Перебросить мяч тебе,<br>Аккуратно, незаметно<br>Опусти ее пониже.",
    "Забывай считать очки,<br>Особенно когда летишь.<br>А в конце скажи уверенно:<br>«Ноль одиннадцать, я вин!»",
    "Если в клубе ЧМЗ<br>Места нет, столы заняты,<br>Доставай свою фанеру<br>И играй прям на полу.",
    "Мажь ракетку майонезом,<br>Чтоб крутило как в кино.<br>Пусть соперник долго плачет,<br>Оттирая белый шар.",
    "Спорь до хрипоты с соседом,<br>Что был край, а не ребро.<br>Пусть весь зал ДК «Восток»<br>Изучает геометрию.",
    "Не регистрируйся в боте,<br>Играй тайно по ночам.<br>Чтобы Эло твой высокий<br>Не достался никому.",
    "Бросай ракетку прямо в стену,<br>Если слил ты важный сет.<br>Ракетка новая найдется,<br>А вот гордость — никогда.",
    "Говори, что у тебя<br>Травма пальца на ноге.<br>Это лучшее прикрытие<br>Для любых твоих провалов.",
    "Тренируйся только дома<br>С кошкой на кухонном столе.<br>А на турнире гордо скажи,<br>Что у вас разные весовые.",
    "Если стол чуть-чуть шатается,<br>Не подкладывай картонку.<br>Лучше стой и балансируй,<br>Как на палубе матрос.",
    "На разминке бей со всей дури<br>Прямо в стену иль в потолок.<br>Пусть соперник сразу видит,<br>Сколько дури у тебя.",
    "Заяви, что ты сегодня<br>Будешь левой рукой играть.<br>Если что — всегда отмазка,<br>А если выиграл — ты герой.",
    "После каждого удара<br>Громко хлопай сам себе.<br>Клуб любителей тенниса<br>Любит шоу и аплодисменты."
  ];

  var isFirstStart = !sessionStorage.getItem('tt_app_loaded');
  var randomJoke = ttJokes[Math.floor(Math.random() * ttJokes.length)];
  var jokeEl = document.getElementById('preloader-joke');
  var bar = document.getElementById('preloader-bar');
  var txt = document.getElementById('preloader-text');
  
  if (txt) txt.innerText = 'Загрузка приложения...';

  // ОТОБРАЖЕНИЕ ПРЕЛОАДЕРА (Оставляем 8 секунд для чтения шуток)
  if (isFirstStart) {
    sessionStorage.setItem('tt_app_loaded', 'true');
    if (jokeEl) {
      var rawLines = randomJoke.split('<br>');
      var linesHtml = '';
      for (var i = 0; i < rawLines.length; i++) {
        linesHtml += '<div class="joke-line" style="animation-delay: ' + (i * 0.3) + 's;">' + rawLines[i] + '</div>';
      }
      jokeEl.innerHTML = linesHtml;
      jokeEl.style.display = 'flex';
    }
    if (bar) {
      bar.style.transition = 'width 8s linear'; 
      setTimeout(function() { bar.style.width = '100%'; }, 50);
    }
    window.setAppProgress = function(percent, text) {}; 
    
    setTimeout(function() {
      if (typeof vibrate === 'function') vibrate('medium');
      var loader = document.getElementById('app-preloader');
      if (loader) {
        loader.style.transition = 'opacity 0.6s ease-out';
        loader.style.opacity = '0';
        setTimeout(function() {
          loader.classList.add('hidden');
          loader.style.display = 'none';
        }, 600);
      }
    }, 8000); // 8 секунд на чтение шутки
    
  } else {
    if (jokeEl) jokeEl.style.display = 'none';
    if (bar) bar.style.width = '100%';
    
    window.setAppProgress = function(percent) {
      if (percent >= 100) {
        var loader = document.getElementById('app-preloader');
        if (loader) {
          loader.classList.add('hidden');
          loader.style.display = 'none';
        }
      }
    };
  }

  // 1. МГНОВЕННАЯ ОТРИСОВКА ИНТЕРФЕЙСА (БЕЗ ЗАДЕРЖЕК)
  try { restoreCardStates(); } catch(e) {}
  try { initTheme(); } catch(e) {}
  try { initNavTab(); } catch(e) {}
  if (typeof renderQuestBoard === 'function') { try { renderQuestBoard(); } catch(e) {} }
  if (typeof setAppProgress === 'function') setAppProgress(70, 'Подключение...');

  // 2. ОТЛОЖЕННАЯ ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ И TELEGRAM (через 100мс)
  // Это позволяет браузеру моментально нарисовать шутку и анимацию загрузки
  setTimeout(function() {
      // Инициализация виджета Telegram в фоне
      var tgAttempts = 0;
      var tgCheck = setInterval(function() {
        if (window.Telegram && window.Telegram.WebApp) {
          try { window.Telegram.WebApp.ready(); if (typeof window.Telegram.WebApp.expand === 'function') window.Telegram.WebApp.expand(); } catch(e) {}
          clearInterval(tgCheck);
        }
        if (++tgAttempts > 20) clearInterval(tgCheck);
      }, 100);

      // Загрузка профиля (теперь она не блокирует начальный экран!)
      try { initUserProfile(); } catch(e) {}
      try { updateAdminControls(); } catch(e) {}
      
      // Запуск фоновых слушателей Firebase
      if(typeof listenPendingMatches === 'function') { try { listenPendingMatches(); } catch(e) {} }
      
      ['park', 'vostok'].forEach(function(loc) {
        try {
          db.collection('locations').doc(loc).onSnapshot(function(doc) { 
              try { 
                  var data = doc.data() || {}; 
                  if(typeof locationsData !== 'undefined' && locationsData[loc]) {
                     locationsData[loc].plans = data.plans || []; 
                     locationsData[loc].players = (data.players || []).map(function(p) { return typeof p === 'string' ? { name: p, time: Date.now(), uid: p, maxLimitMs: (typeof DEFAULT_LIMIT_MS !== 'undefined' ? DEFAULT_LIMIT_MS : 7200000) } : p; }); 
                     if(typeof renderAll === 'function') renderAll(); 
                  }
              } catch(e){} 
          }, function(err) {});
        } catch(e) {}
      });

      try {
        db.collection('settings').doc('announcements').onSnapshot(function(doc) {
          try {
            if(typeof announcementsData !== 'undefined') announcementsData = doc.data() || { vostok: null };
            var badgeBox = document.getElementById('announcement-box-vostok');
            var textBox = document.getElementById('announcement-text-vostok');
            if (badgeBox && textBox && typeof announcementsData !== 'undefined') { 
                var aData = announcementsData.vostok;
                if (aData) { 
                    if (typeof aData === 'object') {
                        var resHtml = '';
                        if (aData.date) resHtml += '🗓 <b>' + cleanHtml(aData.date) + '</b><br>';
                        if (aData.desc) resHtml += cleanHtml(aData.desc).replace(/\n/g,'<br>');
                        textBox.innerHTML = resHtml;
                    } else { textBox.innerHTML = cleanHtml(aData).replace(/\n/g,'<br>'); }
                    badgeBox.style.display = 'flex'; 
                } else { badgeBox.style.display = 'none'; } 
            }
          } catch(e) {}
        });
      } catch(e) {}

      try {
        db.collection('settings').doc('elo_boost').onSnapshot(function(doc) {
          if (doc.exists) {
            var mult = parseInt(doc.data().multiplier, 10) || 1;
            window.currentEloMultiplier = mult;
            var selectEl = document.getElementById('admin-elo-boost'); if (selectEl) selectEl.value = mult;
            var banner = document.getElementById('global-boost-banner'), btnBadge = document.getElementById('match-btn-boost-badge');
            if (mult > 1) { if (banner) { banner.style.display = 'block'; document.getElementById('global-boost-value').innerText = 'x' + mult; } if (btnBadge) { btnBadge.style.display = 'block'; btnBadge.innerText = '🔥 x' + mult; } } 
            else { if (banner) banner.style.display = 'none'; if (btnBadge) btnBadge.style.display = 'none'; }
          }
        });
      } catch(e) {}

      if(typeof listenRecentMatches === 'function') { try { listenRecentMatches(); } catch(e) {} }
      try { listenRatings(); } catch(e) {}
      try { listenLeaderboard(); } catch(e) {}
      try { listenTournaments(); } catch(e) {}

      if(typeof monitorSessions === 'function') {
         setTimeout(monitorSessions, 1000);
         setInterval(monitorSessions, 60000); 
      }
      if(typeof renderAll === 'function') setInterval(renderAll, 30000); 

      if (typeof loadParkWeather === 'function') { 
          try { loadParkWeather(); } catch(e) {} 
          setInterval(loadParkWeather, 600000); 
      }
      
      if (typeof loadTableTennisNews === 'function') loadTableTennisNews();

      if (typeof setAppProgress === 'function') setAppProgress(100, 'Готово!');
      
  }, 100); 
});

function deleteHistoryMatch(docId, profileUid) {
  if (!isSuperAdmin()) return;
  
  var btn = document.querySelector('#confirm-modal .btn-join');
  var title = document.querySelector('#confirm-modal h3');
  var box = document.querySelector('#confirm-modal .modal-box');
  
  if (btn) { btn.innerText = "Да, удалить"; btn.style.background = "var(--accent-red)"; }
  if (title) { title.innerText = "Внимание"; title.style.color = "var(--accent-red)"; }
  if (box) { box.style.borderColor = "var(--accent-red)"; }
  
  var confirmText = 'Удалить этот матч из истории?<br><br><span style="font-size: 12px; opacity: 0.8;">(Рейтинги игроков не изменятся, удалится только карточка матча)</span>';
  
  if (typeof openConfirmModal === 'function') {
      openConfirmModal(confirmText, function() {
        db.collection('matches_history').doc(docId).delete().then(function() {
          if (typeof customAlert === 'function') customAlert('✅ Матч удален из истории');
          if (profileUid) {
            showUserInfoModal(profileUid);
          }
        }).catch(function(e) {
          if (typeof customAlert === 'function') customAlert('Ошибка удаления: ' + e.message);
        });
      });
  }
}

window.applyEloDecay = function() {
  if (!isSuperAdmin()) return;

  var confirmMsg = 'Запустить сканирование неактивных игроков?<br><br><span style="font-size: 12px; opacity: 0.8;">Все, кто не играл последние 7 дней (включая новичков), получат штраф <b>-50 Эло</b>. Система защищена: игрок не получит штраф дважды за одну неделю.</span>';
  
  var btn = document.querySelector('#confirm-modal .btn-join');
  var title = document.querySelector('#confirm-modal h3');
  var box = document.querySelector('#confirm-modal .modal-box');
  if (btn) { btn.innerText = "Запустить списание"; btn.style.background = "var(--accent-red)"; }
  if (title) { title.innerText = "Списание рейтинга"; title.style.color = "var(--accent-red)"; }
  if (box) { box.style.borderColor = "var(--accent-red)"; }

  if(typeof openConfirmModal === 'function') {
      openConfirmModal(confirmMsg, function() {
        if(typeof customAlert === 'function') customAlert("⏳ Анализируем историю матчей за 7 дней...");

        var now = Date.now();
        var sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

        db.collection('matches_history').where('timestamp', '>=', sevenDaysAgo).get().then(function(snap) {
          var activeUids = new Set();
          snap.forEach(function(doc) {
            var m = doc.data();
            if (m.participants) {
              m.participants.forEach(function(uid) { activeUids.add(uid); });
            }
          });

          db.collection('users').get().then(function(usersSnap) {
            var batch = db.batch();
            var penalizedCount = 0;
            var penalizedNames = [];

            usersSnap.forEach(function(uDoc) {
              var u = uDoc.data();
              var uid = uDoc.id;

              if (activeUids.has(uid)) return;

              var regDate = u.createdAt || u.timestamp || 0;
              if (regDate) {
                var regTime = typeof parseTime === 'function' ? parseTime(regDate) : Number(regDate);
                if (now - regTime < 7 * 24 * 60 * 60 * 1000) {
                  return; 
                }
              }

              var lastPenalty = u.lastPenaltyDate || 0;
              if (now - lastPenalty >= (6 * 24 * 60 * 60 * 1000)) {
                var currentElo = parseInt(u.elo, 10) || 1000;
                var newElo = Math.max(100, currentElo - 50);

                batch.set(db.collection('users').doc(uid), {
                  elo: newElo,
                  lastPenaltyDate: now, 
                  lastEloDelta: -50 
                }, { merge: true });

                penalizedCount++;
                penalizedNames.push(cleanHtml(u.name));
              }
            });

            if (penalizedCount > 0) {
              batch.commit().then(function() {
                if(typeof customAlert === 'function') customAlert("✅ Штраф -50 Эло применен к " + penalizedCount + " игрокам!");
                
                var tgMessage = "⏳ <b>Рейтинг тает!</b>\n\nСледующие игроки не выходили к столу более 7 дней и получают штраф за неактивность (<b>-50 Эло</b>):\n\n• " + penalizedNames.join('\n• ') + "\n\n<i>Пора расчехлять ракетки и возвращать позиции!</i> 🏓";
                if(typeof sendTelegramAlert === 'function') sendTelegramAlert(tgMessage);
                
                closeAdminMenu();
              }).catch(function(e) { if(typeof customAlert === 'function') customAlert("❌ Ошибка при списании: " + e.message); });
            } else {
              if(typeof customAlert === 'function') customAlert("✅ Проверка завершена. Все лентяи уже оштрафованы, остальные — активно играют!");
              closeAdminMenu();
            }

          }).catch(function(e) { if(typeof customAlert === 'function') customAlert("❌ Ошибка базы пользователей: " + e.message); });
        }).catch(function(e) { if(typeof customAlert === 'function') customAlert("❌ Ошибка истории матчей: " + e.message); });
      });
  }
};


// ==========================================
// ГЛОБАЛЬНЫЙ МЕХАНИЗМ ЗАКРЫТИЯ СВАЙПОМ
// ==========================================
var sheetYDown = null;
var activeSheet = null;
var currentYDiff = 0;

document.addEventListener('touchstart', function(evt) {
  if (evt.touches.length > 1) return;
  var box = evt.target.closest('.modal-box');
  if (!box) return;
  
  var scrollable = evt.target.closest('div[style*="overflow-y: auto"], .scrollable-list, .player-list, #info-modal-history');
  if (scrollable && scrollable.scrollTop > 0) return;

  sheetYDown = evt.touches[0].clientY;
  activeSheet = box;
  currentYDiff = 0;
  
  activeSheet.style.animation = 'none'; 
  activeSheet.style.transition = 'none'; 
}, {passive: true});

document.addEventListener('touchmove', function(evt) {
  if (!sheetYDown || !activeSheet) return;
  var yUp = evt.touches[0].clientY;
  currentYDiff = Math.max(0, yUp - sheetYDown); 

  if (currentYDiff > 0) {
    activeSheet.style.transform = 'translateY(' + currentYDiff + 'px)';
    if (evt.cancelable) evt.preventDefault(); 
  }
}, {passive: false});

document.addEventListener('touchend', function(evt) {
  if (!activeSheet) return;
  
  var currentBox = activeSheet; 
  var overlay = currentBox.closest('.modal-overlay');

  if (currentYDiff > 80) { 
    currentBox.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    currentBox.style.transform = 'translateY(100%)'; 
    if(typeof vibrate==='function') vibrate('light'); 
    
    if (overlay) {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';
    }
    
    setTimeout(function() {
      if (overlay) {
        overlay.style.display = 'none';
        overlay.style.opacity = ''; 
        overlay.style.transition = '';
      }
      currentBox.style.transform = ''; 
      currentBox.style.transition = '';
      currentBox.style.animation = ''; 
    }, 300); 

  } else {
    currentBox.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    currentBox.style.transform = 'translateY(0)';
    
    setTimeout(function() {
      currentBox.style.transform = ''; 
      currentBox.style.transition = '';
      currentBox.style.animation = ''; 
    }, 300);
  }
  
  sheetYDown = null;
  activeSheet = null;
  currentYDiff = 0;
});

window.closeModalSmoothly = function(modalId) {
  var overlay = document.getElementById(modalId);
  if (!overlay) return;
  var box = overlay.querySelector('.modal-box');

  if (box) {
    box.style.animation = 'none';
    box.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    box.style.transform = 'translateY(100%)';
  }
  
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity = '0';

  setTimeout(function() {
    overlay.style.display = 'none';
    overlay.style.opacity = '';
    overlay.style.transition = '';
    if (box) {
      box.style.transform = '';
      box.style.transition = '';
      box.style.animation = '';
    }
  }, 300);
};

/* ==========================================
   ФИНАЛЬНАЯ КАРУСЕЛЬ (С ПОЛНОЙ ЗАЩИТОЙ СКРОЛЛА)
   ========================================== */
var swipeState = {
  isDragging: false,
  isVerticalScroll: false,
  isAnimating: false,
  startX: 0,
  startY: 0,
  activeView: null,
  targetView: null,
  direction: 0,
  width: 0,
  gap: 20,
  tabs: ['profile', 'radar', 'ratings', 'tournaments', 'quests', 'news']
};

document.addEventListener('touchstart', function(e) {
  if (swipeState.isAnimating) return;
  if (document.querySelector('.modal-overlay[style*="display: flex"]') || document.querySelector('.swal2-container')) return;

  swipeState.startX = e.touches[0].clientX;
  swipeState.startY = e.touches[0].clientY;
  swipeState.isDragging = false;
  swipeState.isVerticalScroll = false;
  swipeState.activeView = document.querySelector('.main-view.active');
  swipeState.targetView = null;
}, {passive: true});

document.addEventListener('touchmove', function(e) {
  if (swipeState.isAnimating || !swipeState.activeView) return;

  var dx = e.touches[0].clientX - swipeState.startX;
  var dy = e.touches[0].clientY - swipeState.startY;

  if (!swipeState.isDragging) {
    // ЖЕСТКАЯ ЗАЩИТА СКРОЛЛА: Если палец дернулся вверх/вниз - сразу отдаем управление браузеру!
    if (Math.abs(dy) > 8 || Math.abs(dy) > Math.abs(dx)) {
      swipeState.isVerticalScroll = true;
      return;
    }

    // Начинаем свайп ТОЛЬКО если движение явно горизонтальное (dx > dy в полтора раза)
    if (!swipeState.isVerticalScroll && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipeState.isDragging = true;
      document.body.classList.add('disable-animations');

      var currentIndex = swipeState.tabs.indexOf(swipeState.activeView.id.replace('view-', ''));
      swipeState.direction = dx < 0 ? 1 : -1;

      var targetIndex = (currentIndex + swipeState.direction + swipeState.tabs.length) % swipeState.tabs.length;
      swipeState.targetView = document.getElementById('view-' + swipeState.tabs[targetIndex]);

      if (swipeState.targetView) {
        swipeState.width = swipeState.activeView.offsetWidth;

        swipeState.targetView.style.display = 'flex';
        swipeState.targetView.style.position = 'absolute';
        swipeState.targetView.style.top = swipeState.activeView.offsetTop + 'px';
        swipeState.targetView.style.left = swipeState.activeView.offsetLeft + 'px';
        swipeState.targetView.style.width = swipeState.width + 'px';

        var startOffset = swipeState.direction === 1 ? (swipeState.width + swipeState.gap) : -(swipeState.width + swipeState.gap);
        swipeState.targetView.style.transform = 'translate3d(' + startOffset + 'px, 0, 0)';

        swipeState.activeView.style.zIndex = '5';
        swipeState.targetView.style.zIndex = '6';
      }
    }
  }

  // Если свайп вбок прошел проверку — двигаем карточки
  if (swipeState.isDragging && swipeState.targetView) {
    if (e.cancelable) e.preventDefault();
    var startOffset = swipeState.direction === 1 ? (swipeState.width + swipeState.gap) : -(swipeState.width + swipeState.gap);
    swipeState.activeView.style.transform = 'translate3d(' + dx + 'px, 0, 0)';
    swipeState.targetView.style.transform = 'translate3d(' + (startOffset + dx) + 'px, 0, 0)';
  }
}, {passive: false});

document.addEventListener('touchend', function(e) {
  if (swipeState.isAnimating || !swipeState.isDragging || !swipeState.activeView) {
      swipeState.isDragging = false;
      swipeState.isVerticalScroll = false;
      return;
  }

  var dx = e.changedTouches[0].clientX - swipeState.startX;
  var threshold = 40; 

  if (swipeState.targetView) {
    swipeState.isAnimating = true; 
    swipeState.activeView.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    swipeState.targetView.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';

    var isValidSwipe = (swipeState.direction === 1 && dx < -threshold) || (swipeState.direction === -1 && dx > threshold);

    if (isValidSwipe) {
      if (window.TTAudio && typeof window.TTAudio.playRandomBounce === 'function') window.TTAudio.playRandomBounce();
      if (navigator.vibrate) navigator.vibrate(10);

      var finalX = swipeState.direction === 1 ? -(swipeState.width + swipeState.gap) : (swipeState.width + swipeState.gap);

      swipeState.activeView.style.transform = 'translate3d(' + finalX + 'px, 0, 0)';
      swipeState.targetView.style.transform = 'translate3d(0px, 0, 0)';

      var targetId = swipeState.targetView.id.replace('view-', '');

      setTimeout(function() {
        if (typeof switchNavTab === 'function') switchNavTab(targetId);
        cleanupSwipe();
      }, 250);

    } else {
      var startOffset = swipeState.direction === 1 ? (swipeState.width + swipeState.gap) : -(swipeState.width + swipeState.gap);
      swipeState.activeView.style.transform = 'translate3d(0px, 0, 0)';
      swipeState.targetView.style.transform = 'translate3d(' + startOffset + 'px, 0, 0)';

      setTimeout(cleanupSwipe, 250);
    }
  } else {
    document.body.classList.remove('disable-animations');
    swipeState.isDragging = false;
    swipeState.isVerticalScroll = false;
  }
}, {passive: true});

function cleanupSwipe() {
    var views = document.querySelectorAll('.main-view');
    for (var i = 0; i < views.length; i++) {
        views[i].style.transform = '';
        views[i].style.transition = '';
        views[i].style.position = '';
        views[i].style.width = '';
        views[i].style.zIndex = '';
        views[i].style.top = '';
        views[i].style.left = '';
        views[i].style.display = ''; 
    }
    document.body.classList.remove('disable-animations');
    swipeState.isDragging = false;
    swipeState.isVerticalScroll = false;
    swipeState.isAnimating = false; 
}

document.addEventListener('touchcancel', function(e) {
  if (swipeState.isDragging || swipeState.isAnimating) cleanupSwipe();
});


// Защита при звонке или системном прерывании
document.addEventListener('touchcancel', function(e) {
  if (swipeState.isDragging || swipeState.isAnimating) cleanupSwipe();
});
// ==========================================
// НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ==========================================
window.switchNavTab = function(tabId) {
  if (typeof vibrate === 'function') vibrate('light');
  
  var views = document.querySelectorAll('.main-view'); 
  for(var i=0; i<views.length; i++) {
      views[i].classList.remove('active');
      views[i].style.display = ''; // Сбрасываем стили после свайпа
  }
  
  var items = document.querySelectorAll('.nav-item'); 
  for(var j=0; j<items.length; j++) {
      items[j].classList.remove('active');
  }
  
  var viewEl = document.getElementById('view-' + tabId);
  var navEl = document.getElementById('nav-' + tabId);
  
  if(viewEl) viewEl.classList.add('active');
  if(navEl) navEl.classList.add('active');
  window.scrollTo(0, 0); 
  
  sessionStorage.setItem('tt_session_tab', tabId);

  // Управляем активностью 3D-игры
  if (tabId === 'arcade') {
      window.arcadeActive = true;
      if (typeof initArcadeGame === 'function') initArcadeGame();
  } else {
      window.arcadeActive = false; // Тормозим рендеринг вне вкладки аркады
  }
  
  if (tabId === 'radar' && typeof updateAdminControls === 'function') updateAdminControls();
  if (tabId === 'quests' && typeof renderQuestBoard === 'function') renderQuestBoard();
};

window.initNavTab = function() {
  var savedTab = sessionStorage.getItem('tt_session_tab') || 'profile';
  switchNavTab(savedTab);
};

window.switchTab = function(tab) {
  var tabRating = document.getElementById('tab-btn-rating');
  var tabTime = document.getElementById('tab-btn-time');
  var viewRating = document.getElementById('view-rating-content');
  var viewTime = document.getElementById('view-time-content');

  if (tab === 'rating') {
    if (tabRating) tabRating.classList.add('active'); 
    if (tabTime) tabTime.classList.remove('active');
    if (viewRating) viewRating.style.display = 'flex'; 
    if (viewTime) viewTime.style.display = 'none';
  } else {
    if (tabTime) tabTime.classList.add('active'); 
    if (tabRating) tabRating.classList.remove('active');
    if (viewTime) viewTime.style.display = 'flex'; 
    if (viewRating) viewRating.style.display = 'none';
  }
};

// ==========================================
// УПРАВЛЕНИЕ ТЕМОЙ И ШТОРКАМИ
// ==========================================
window.initTheme = function() {
  var savedTheme = localStorage.getItem('tt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  var btn = document.getElementById('btn-theme');
  if (btn) btn.innerText = savedTheme === 'light' ? '☀️' : '🌙';
};

window.toggleTheme = function() {
  var root = document.documentElement;
  var current = root.getAttribute('data-theme') || 'dark';
  var newTheme = current === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', newTheme);
  localStorage.setItem('tt_theme', newTheme);
  var btn = document.getElementById('btn-theme');
  if (btn) btn.innerText = newTheme === 'light' ? '☀️' : '🌙';
};

window.toggleCard = function(loc) { 
  if (typeof vibrate === 'function') vibrate('medium'); 
  var c = document.getElementById('card-' + loc);
  if (!c) return;
  var isExpanded = c.classList.toggle('expanded');
  localStorage.setItem('tt_card_' + loc, isExpanded ? '1' : '0');
};

window.restoreCardStates = function() {
  ['park', 'vostok'].forEach(function(loc) {
    var c = document.getElementById('card-' + loc);
    if (!c) return;
    var savedState = localStorage.getItem('tt_card_' + loc);
    if (savedState === '1') c.classList.add('expanded');
    else c.classList.remove('expanded');
  });
};

/* ==========================================
   ДВИЖОК ПЛАВАЮЩЕГО ИНДИКАТОРА МЕНЮ
   ========================================== */
document.addEventListener('DOMContentLoaded', function() {
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;

  var indicator = document.createElement('div');
  indicator.id = 'nav-sliding-indicator';
  nav.appendChild(indicator);

  var navItems = nav.querySelectorAll('.nav-item');

  function moveIndicator() {
    var activeItem = nav.querySelector('.nav-item.active');
    if (!activeItem) return;
    
    var navRect = nav.getBoundingClientRect();
    var itemRect = activeItem.getBoundingClientRect();
    
    // Центруем полоску относительно активной иконки
    var offsetLeft = (itemRect.left - navRect.left) + (itemRect.width / 2) - 18;
    indicator.style.transform = 'translateX(' + offsetLeft + 'px)';
    
    // Красим каретку в цвет активной вкладки
    var color = getComputedStyle(activeItem).getPropertyValue('--nav-glow').trim() || '#3b82f6';
    indicator.style.setProperty('--nav-glow', color);
  }

  // Следим за переключением класса active
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target.classList.contains('active')) moveIndicator();
    });
  });

  navItems.forEach(function(item) {
    observer.observe(item, { attributes: true, attributeFilter: ['class'] });
  });

  window.addEventListener('resize', moveIndicator);
  setTimeout(moveIndicator, 300);
});

/* ==========================================
   ФИНАЛЬНЫЕ ФИКСЫ: АЛЕРТЫ И ИСТОРИЯ МАТЧЕЙ
   ========================================== */

// 1. ИСПРАВЛЕНИЕ АЛЕРТОВ (ТЕПЕРЬ ТЕГИ <br> И <b> РАБОТАЮТ КОРРЕКТНО)
window.customAlert = function(htmlMsg) {
  var el = document.getElementById('custom-alert-modal');
  var txt = document.getElementById('custom-alert-text');
  if (txt) txt.innerHTML = htmlMsg; // Заменили innerText на innerHTML
  if (el) el.style.display = 'flex';
};

window.openConfirmModal = function(htmlText, onConfirm) {
  var el = document.getElementById('confirm-modal-text');
  if (el) el.innerHTML = htmlText; // Заменили innerText на innerHTML
  window.confirmCallback = onConfirm;
  var modal = document.getElementById('confirm-modal');
  if (modal) modal.style.display = 'flex';
};

window.executeConfirm = function() {
  if (typeof window.confirmCallback === 'function') window.confirmCallback();
  if (typeof closeModalSmoothly === 'function') closeModalSmoothly('confirm-modal');
};

window.closeConfirmModal = function() {
  if (typeof closeModalSmoothly === 'function') closeModalSmoothly('confirm-modal');
  window.confirmCallback = null;
};

// 2. ИДЕАЛЬНАЯ ИСТОРИЯ МАТЧЕЙ (КЛИКАБЕЛЬНЫЕ ИМЕНА 2х2 И ВЫРАВНИВАНИЕ)
window.renderUserHistoryList = function(matches, uid) {
  var hEl = document.getElementById('info-modal-history');
  if (!hEl) return;
  if (!matches || matches.length === 0) { 
    hEl.innerHTML = '<span class="empty-note">Матчей пока нет</span>'; 
    return; 
  }
  
  // Сортировка от новых к старым
  matches.sort(function(a, b) { 
      var timeA = typeof parseTime === 'function' ? parseTime(a.timestamp) : a.timestamp;
      var timeB = typeof parseTime === 'function' ? parseTime(b.timestamp) : b.timestamp;
      return timeB - timeA; 
  });
  
  var recentMatches = matches.slice(0, 10);
  var h = '';
  
  recentMatches.forEach(function(mx) {
    try {
      var isDoubles = mx.type === 'doubles';
      var isTeam1 = isDoubles ? (mx.team1Uids && mx.team1Uids.indexOf(uid) !== -1) : (mx.p1Uid === uid);
      
      var s1 = mx.team1Score !== undefined ? mx.team1Score : (mx.scoreTeam1 !== undefined ? mx.scoreTeam1 : (mx.p1Score !== undefined ? mx.p1Score : "?"));
      var s2 = mx.team2Score !== undefined ? mx.team2Score : (mx.scoreTeam2 !== undefined ? mx.scoreTeam2 : (mx.p2Score !== undefined ? mx.p2Score : "?"));

      var myS = isTeam1 ? s1 : s2;
      var opS = isTeam1 ? s2 : s1;
      var isWin = (myS !== "?" && opS !== "?") ? myS > opS : false;
      
      var myColor = isWin ? '#10b981' : 'var(--text-muted)';
      var opColor = !isWin ? '#10b981' : 'var(--text-muted)';
      var myWeight = isWin ? '700' : '500';
      var opWeight = !isWin ? '700' : '500';
      
      var myEmoji = isWin ? '<span style="color: #10b981; font-size: 10px; flex-shrink:0;">▲</span>' : '<span style="color: var(--text-muted); font-size: 10px; opacity: 0.5; flex-shrink:0;">▼</span>';
      var opEmoji = !isWin ? '<span style="color: #10b981; font-size: 10px; flex-shrink:0;">▲</span>' : '<span style="color: var(--text-muted); font-size: 10px; opacity: 0.5; flex-shrink:0;">▼</span>';

      var timestamp = typeof parseTime === 'function' ? parseTime(mx.timestamp) : mx.timestamp;
      var dtStr = new Date(timestamp).toLocaleDateString();
      var modeBadge = isDoubles ? '<span class="badge-mode badge-mode-doubles" style="margin-right: 6px; flex-shrink:0;">2x2</span>' : '<span class="badge-mode badge-mode-singles" style="margin-right: 6px; flex-shrink:0;">1x1</span>';
      
      var leftContentHtml = '';
      
      // Единый стиль для обрезки длинных имен (max-width + ellipsis)
      var nameStyleTemplate = 'display: inline-block; max-width: 85px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; transition: 0.2s;';

      if (isDoubles) {
          var tArr = isTeam1 ? mx.team1NamesArr : mx.team2NamesArr;
          var tUids = isTeam1 ? mx.team1Uids : mx.team2Uids;
          var myPartner = null, myPartnerUid = null;
          
          if (tArr && tUids) {
              if (tUids[0] === uid) { myPartner = tArr[1]; myPartnerUid = tUids[1]; }
              else { myPartner = tArr[0]; myPartnerUid = tUids[0]; }
          }
          
          // Кликабельный напарник
          var partnerHtml = myPartner ? '<span class="clickable-name" style="color:'+myColor+'; font-weight:'+myWeight+'; '+nameStyleTemplate+'" onclick="showUserInfoModal(\''+escapeJS(myPartnerUid)+'\')">' + cleanHtml(myPartner) + '</span>' : '<span style="color:'+myColor+'; font-weight:'+myWeight+';">Неизвестно</span>';
          
          var opArr = isTeam1 ? mx.team2NamesArr : mx.team1NamesArr;
          var opUids = isTeam1 ? mx.team2Uids : mx.team1Uids;
          var opHtml = '';
          
          // Кликабельные соперники
          if (opArr && opUids && opArr.length > 1) {
              opHtml = '<span class="clickable-name" style="color:'+opColor+'; font-weight:'+opWeight+'; '+nameStyleTemplate+'" onclick="showUserInfoModal(\''+escapeJS(opUids[0])+'\')">' + cleanHtml(opArr[0]) + '</span>' +
                       '<span style="color:var(--text-muted); font-size: 10px; margin: 0 3px; flex-shrink:0;">&</span>' +
                       '<span class="clickable-name" style="color:'+opColor+'; font-weight:'+opWeight+'; '+nameStyleTemplate+'" onclick="showUserInfoModal(\''+escapeJS(opUids[1])+'\')">' + cleanHtml(opArr[1]) + '</span>';
          } else {
              var opN = isTeam1 ? mx.team2Names : mx.team1Names;
              opHtml = '<span style="color:'+opColor+'; font-weight:'+opWeight+'; '+nameStyleTemplate+' max-width: 140px;">' + cleanHtml(opN || "Неизвестные игроки") + '</span>';
          }

          leftContentHtml = '<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; width: 100%;">' + modeBadge + '<span style="font-size: 11px; color: var(--text-muted); flex-shrink:0;">в паре с:</span> ' + myEmoji + partnerHtml + '</div>' +
                            '<div style="display: flex; align-items: center; gap: 6px; width: 100%;"><span style="font-size: 11px; color: var(--text-muted); flex-shrink:0;">против:</span> ' + opEmoji + opHtml + '</div>';

      } else {
          var opUid = isTeam1 ? mx.p2Uid : mx.p1Uid;
          var opName = isTeam1 ? mx.p2Name : mx.p1Name;
          
          // Кликабельный соперник 1x1
          var opHtml = '<span class="clickable-name" style="color:'+opColor+'; font-weight:'+opWeight+'; '+nameStyleTemplate+' max-width: 130px;" onclick="showUserInfoModal(\''+escapeJS(opUid)+'\')">' + cleanHtml(opName || "Неизвестно") + '</span>';
          
          leftContentHtml = '<div style="display: flex; align-items: center; gap: 6px; width: 100%; margin-top: 2px;">' + modeBadge + '<span style="font-size: 11px; color: var(--text-muted); flex-shrink:0;">против:</span> ' + opEmoji + opHtml + '</div>';
      }

      var adminDelBtn = (typeof isSuperAdmin === 'function' && isSuperAdmin() && mx.docId) ? '<div style="margin-left: 10px; cursor: pointer; font-size: 14px; opacity: 0.6; padding: 4px;" onclick="deleteHistoryMatch(\'' + escapeJS(mx.docId) + '\', \'' + escapeJS(uid) + '\')" title="Удалить из истории">🗑</div>' : '';

      h += '<div style="background: var(--card-bg); padding: 10px 12px; border: 1px solid var(--card-border); border-radius: 8px; display:flex; justify-content:space-between; align-items:center; font-size:13px; gap: 8px; margin-bottom: 6px; overflow: hidden;">' +
             '<div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">' + 
               leftContentHtml +
               '<div style="color:var(--text-muted); font-size:10px; margin-top:8px;">' + dtStr + '</div>' +
             '</div>' +
             '<div style="display: flex; align-items: center; flex-shrink: 0;">' +
               '<div style="display: flex; align-items: center; justify-content: center; font-weight:800; font-size: 16px; background: var(--row-bg); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">' +
                 '<span style="color:' + myColor + '">' + myS + '</span>' +
                 '<span style="color:var(--text-muted); opacity: 0.5; margin: 0 4px;">:</span>' +
                 '<span style="color:' + opColor + '">' + opS + '</span>' +
               '</div>' +
               adminDelBtn +
             '</div>' +
           '</div>';
    } catch(errRow) {
      console.log("Пропуск записи матча", errRow);
    }
  });
  
  hEl.innerHTML = h;
};

/* ==========================================
   СИСТЕМА ПЛАШЕК И ТИТУЛОВ (СЛОВАРЬ ОПИСАНИЙ)
   ========================================== */
var BADGE_DESCRIPTIONS = {
  // Динамические и системные титулы
  "👑 Король стола": { title: "Король стола", icon: "👑", desc: "Выдается игроку, который провел больше всего суммарного времени за тренировками и играми в клубе. Докажи, что стол принадлежит тебе!" },
  "🔥 Несокрушимый": { title: "Несокрушимый", icon: "🔥", desc: "Присваивается игроку с самой длинной активной серией побед в клубе (от 3 матчей подряд). Горячая рука не прощает соперников!" },
  "⚔️ Гладиатор": { title: "Гладиатор", icon: "⚔️", desc: "Знак истинной стойкости. Выдается бойцам, которые сыграли наибольшее количество матчей в клубе (от 10 игр и выше)." },
  "🤝 Амбассадор": { title: "Амбассадор", icon: "🤝", desc: "Особый статус за развитие клуба. Выдается игрокам, которые успешно пригласили в приложение 5 и более новых участников." },
  "Админ ⭐": { title: "Администратор", icon: "⭐", desc: "Основатель и организатор клуба ЧМЗ. Управляет турнирами, ивентами, ботом и следит за порядком у столов." },

  // Именные и кастомные плашки
  "Учитель 🎓": { title: "Учитель", icon: "🎓", desc: "Почетный статус наставника. Этот игрок всегда готов поделиться опытом, подсказать правильную стойку и помочь новичкам улучшить технику игры." },
  "Темщик 🕶️": { title: "Темщик", icon: "🕶️", desc: "Уникальный статус особого участника. Всегда на стиле, всегда в теме, знает все расклады в клубе." },
  "Хоккеист 🏒": { title: "Хоккеист", icon: "🏒", desc: "Суровый челябинский стиль! Двойная угроза: одинаково опасен как на льду с клюшкой, так и у стола с ракеткой." },
  "Бот 🤖": { title: "Бот", icon: "🤖", desc: "Системный аккаунт или роботизированный участник. Ходят слухи, что он никогда не промахивается." },
  "Тренер 📋": { title: "Тренер", icon: "📋", desc: "Официальный тренер клуба. Знает, как поставить мощный топс, грамотно выйти на мяч и разнести соперника тактически." }
};

window.showBadgeInfo = function(badgeKey) {
  if (typeof vibrate === 'function') vibrate('light'); // Легкая вибрация при клике
  
  var info = BADGE_DESCRIPTIONS[badgeKey];
  
  // Если плашка нестандартная (например, временная за квест)
  if (!info) {
    info = {
      title: badgeKey.replace(/<[^>]*>?/gm, '').trim(),
      icon: "🏅",
      desc: "Это награда или особый статус участника клуба."
    };
  }

  var titleEl = document.getElementById('badge-modal-title');
  var descEl = document.getElementById('badge-modal-desc');
  var iconEl = document.getElementById('badge-modal-icon');
  var modal = document.getElementById('badge-info-modal');

  if (titleEl) titleEl.innerText = info.title;
  if (descEl) descEl.innerText = info.desc;
  if (iconEl) iconEl.innerText = info.icon;
  if (modal) modal.style.display = 'flex';
};

window.closeBadgeInfoModal = function() {
  if (typeof closeModalSmoothly === 'function') {
    closeModalSmoothly('badge-info-modal');
  } else {
    document.getElementById('badge-info-modal').style.display = 'none';
  }
};

/* ==========================================
   60 FPS ДВИЖОК МОДАЛЬНЫХ ОКОН И АЛЕРТОВ
   ========================================== */

// Умная функция открытия (Дает браузеру 1 кадр на отрисовку DOM перед анимацией)
window.openModalSmoothly = function(modalId) {
  if (typeof vibrate === 'function') vibrate('light');
  var overlay = document.getElementById(modalId);
  if (!overlay) return;
  var box = overlay.querySelector('.modal-box');

  // 1. Делаем окно "физически" видимым, но полностью прозрачным и опущенным вниз
  overlay.style.transition = 'none';
  overlay.style.opacity = '0';
  overlay.style.display = 'flex';
  
  if (box) {
    box.style.transition = 'none';
    box.style.transform = 'translateY(100%)';
  }

  // 2. Ждем ровно 1 кадр (около 16мс), чтобы телефон "переварил" display: flex
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      // 3. Плавно включаем свет и выкатываем окно с красивой Apple-физикой
      overlay.style.transition = 'opacity 0.35s ease-out';
      overlay.style.opacity = '1';
      
      if (box) {
        box.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
        box.style.transform = 'translateY(0)';
      }
    });
  });
};

// --- ПЕРЕОПРЕДЕЛЯЕМ ВСЕ СТАРЫЕ АЛЕРТЫ НА НОВЫЙ ДВИЖОК ---

window.customAlert = function(htmlMsg) {
  var txt = document.getElementById('custom-alert-text');
  if (txt) txt.innerHTML = htmlMsg; 
  openModalSmoothly('custom-alert-modal');
};

window.openConfirmModal = function(htmlText, onConfirm) {
  var el = document.getElementById('confirm-modal-text');
  if (el) el.innerHTML = htmlText; 
  window.confirmCallback = onConfirm;
  openModalSmoothly('confirm-modal');
};

window.showBadgeInfo = function(badgeKey) {
  var info = BADGE_DESCRIPTIONS ? BADGE_DESCRIPTIONS[badgeKey] : null;
  if (!info) info = { title: badgeKey.replace(/<[^>]*>?/gm, '').trim(), icon: "🏅", desc: "Это награда или особый статус участника." };
  
  var titleEl = document.getElementById('badge-modal-title');
  var descEl = document.getElementById('badge-modal-desc');
  var iconEl = document.getElementById('badge-modal-icon');
  
  if (titleEl) titleEl.innerText = info.title;
  if (descEl) descEl.innerText = info.desc;
  if (iconEl) iconEl.innerText = info.icon;
  
  openModalSmoothly('badge-info-modal');
};
  /* ==========================================
   РЕФЕРАЛЬНАЯ СИСТЕМА И QR-КОД
   ========================================== */
var BOT_USERNAME = "tennis_club_chmz_bot"; 

window.showRefQrModal = function() {
  var myUid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
  if (!myUid) {
    if (typeof customAlert === 'function') customAlert("Сначала необходимо авторизоваться!");
    else alert("Сначала необходимо авторизоваться!");
    return;
  }
  
  var refLink = "https://t.me/" + BOT_USERNAME + "?startapp=" + encodeURIComponent(myUid);
  var qrContainer = document.getElementById("ref-qrcode");
  
  if (qrContainer && typeof QRCode !== 'undefined') {
      qrContainer.innerHTML = ""; 
      new QRCode(qrContainer, {
        text: refLink, width: 200, height: 200,
        colorDark : "#000000", colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
  }

  if (typeof openModalSmoothly === 'function') {
      openModalSmoothly('ref-qr-modal');
  } else {
      var modal = document.getElementById('ref-qr-modal');
      if (modal) modal.style.display = 'flex';
  }
};

window.closeRefQrModal = function() { 
  if(typeof closeModalSmoothly === 'function') closeModalSmoothly('ref-qr-modal'); 
};

window.shareMyRefLink = function() {
  var myUid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
  if (!myUid) return alert("Сначала необходимо авторизоваться!");

  var refLink = "https://t.me/" + BOT_USERNAME + "?startapp=" + encodeURIComponent(myUid);
  var inviteText = "🏓 Вступай в клуб настольного тенниса! Сыграй 3 рейтинговых матча, чтобы закрепиться в нашей лиге.";

  if (navigator.share) {
    navigator.share({ title: "Клуб ЧМЗ", text: inviteText, url: refLink }).catch(function(){});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteText + "\n" + refLink).then(function() {
      alert("Ссылка скопирована в буфер обмена!");
    });
  }
};
/* ==========================================
   ГЛОБАЛЬНАЯ ЗВУКОВАЯ СИСТЕМА (ИНТЕРЦЕПТОР)
   ========================================== */

// 1. Озвучиваем абсолютно все клики по интерфейсу
document.addEventListener('click', function(e) {
  // Ищем, кликнули ли мы по интерактивному элементу
  var btn = e.target.closest('.btn, .btn-info, .btn-opt, .score-btn, .tab-btn, .nav-item, .clickable-name, .platform-badge, .quest-choice-card, .medal-item, .club-header-top');
  
  if (btn && window.TTAudio) {
    // Звук отмены / закрытия
    if (btn.classList.contains('btn-cancel-modal') || btn.closest('.close-btn')) {
       if (typeof window.TTAudio.playSwoosh === 'function') window.TTAudio.playSwoosh();
    } 
    // Звук успеха / подтверждения
    else if (btn.classList.contains('btn-join') || btn.innerText.includes('Сохранить')) {
       if (typeof window.TTAudio.playSuccess === 'function') window.TTAudio.playSuccess();
       else if (typeof window.TTAudio.playClick === 'function') window.TTAudio.playClick();
    }
    // Обычный сочный клик для всего остального (табы, имена, плашки)
    else {
       if (typeof window.TTAudio.playClick === 'function') window.TTAudio.playClick();
    }
  }
});

// 2. Озвучиваем открытие всех модальных окон (звук всплытия - Pop)
var _originalOpenModal = window.openModalSmoothly;
window.openModalSmoothly = function(modalId) {
  if (window.TTAudio) {
    if (typeof window.TTAudio.playPop === 'function') window.TTAudio.playPop();
    else if (typeof window.TTAudio.playClick === 'function') window.TTAudio.playClick();
  }
  if (_originalOpenModal) _originalOpenModal(modalId);
};

// 3. Озвучиваем закрытие всех модальных окон (звук смахивания - Swoosh)
var _originalCloseModal = window.closeModalSmoothly;
window.closeModalSmoothly = function(modalId) {
  if (window.TTAudio && typeof window.TTAudio.playSwoosh === 'function') {
    window.TTAudio.playSwoosh();
  }
  if (_originalCloseModal) _originalCloseModal(modalId);
};

// 4. Озвучиваем системные уведомления и алерты (Notification)
var _originalCustomAlert = window.customAlert;
window.customAlert = function(msg) {
  if (window.TTAudio) {
    if (typeof window.TTAudio.playNotification === 'function') window.TTAudio.playNotification();
    else if (typeof window.TTAudio.playPop === 'function') window.TTAudio.playPop();
  }
  if (_originalCustomAlert) _originalCustomAlert(msg);
};
