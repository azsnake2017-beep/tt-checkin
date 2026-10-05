// ==========================================
// js/quests.js — Движок еженедельных заданий (Параллельное выполнение)
// ==========================================

// Жесткая привязка к понедельникам: получаем уникальный ID недели
function getRecentMondayId() {
  var d = new Date();
  var day = d.getDay() || 7; 
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (day - 1)); 
  return 'week_' + d.getTime();
}

// База заданий
var QUEST_POOL = [
  // ЛЕГКИЕ (Уровень 1) - Награда: 25 Эло
  { id: 'q_e1', lvl: 1, title: 'Разминка', desc: 'Сыграть 3 любых матча за неделю (результат не важен).', target: 3, action: 'play_match', rewardElo: 25, rewardBadge: 'Разминающийся 🏓', badgeDays: 7, color: '#10b981' },
  { id: 'q_e2', lvl: 1, title: 'Командный дух', desc: 'Сыграть 2 парных матча (2х2).', target: 2, action: 'play_doubles', rewardElo: 25, rewardBadge: 'В паре 👥', badgeDays: 7, color: '#10b981' },
  { id: 'q_e3', lvl: 1, title: 'Любитель баланса', desc: 'Сыграть матч, который закончится со счетом 3:2.', target: 1, action: 'play_3_2', rewardElo: 25, rewardBadge: 'Боец ⚔️', badgeDays: 7, color: '#10b981' },
  { id: 'q_e4', lvl: 1, title: 'Турнирный боец', desc: 'Сыграть матч на выходных (сб или вс).', target: 1, action: 'play_weekend', rewardElo: 25, rewardBadge: 'Уикенд-воин 🏕', badgeDays: 7, color: '#10b981' },
  
  // СРЕДНИЕ (Уровень 2) - Награда: 50 Эло
  { id: 'q_m1', lvl: 2, title: 'Хет-трик', desc: 'Одержать победу в 3 матчах.', target: 3, action: 'win_match', rewardElo: 50, rewardBadge: 'Хет-трик 🎯', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m2', lvl: 2, title: 'Сыгранная пара', desc: 'Выиграть 2 парных матча (2х2).', target: 2, action: 'win_doubles', rewardElo: 50, rewardBadge: 'Сыгранная пара 🤝', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m3', lvl: 2, title: 'Сухарь', desc: 'Разгромить соперника со счетом 3:0.', target: 1, action: 'win_flawless', rewardElo: 50, rewardBadge: 'Сухарь 🍩', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m4', lvl: 2, title: 'Стальные нервы', desc: 'Выиграть тяжелейший матч со счетом 3:2.', target: 1, action: 'win_3_2', rewardElo: 50, rewardBadge: 'Стальные нервы 🥶', badgeDays: 7, color: '#f59e0b' },
  
  // СЛОЖНЫЕ (Уровень 3) - Награда: 100 Эло
  { id: 'q_h1', lvl: 3, title: 'Убийца гигантов', desc: 'Победить игрока, чей рейтинг выше вашего на 50+ очков.', target: 1, action: 'win_higher_elo', rewardElo: 100, rewardBadge: 'Давид 🗡️', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h2', lvl: 3, title: 'Тотальная доминация', desc: 'Одержать 3 победы со счетом 3:0.', target: 3, action: 'win_flawless', rewardElo: 100, rewardBadge: 'Доминатор 👑', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h3', lvl: 3, title: 'Гладиатор', desc: 'Одержать серию из 5 побед подряд.', target: 5, action: 'win_streak', rewardElo: 100, rewardBadge: 'Гладиатор 🛡️', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h4', lvl: 3, title: 'Легенда парного', desc: 'Выиграть 4 парных матча.', target: 4, action: 'win_doubles', rewardElo: 100, rewardBadge: 'Дуэт-Легенда 🏆', badgeDays: 14, color: '#f43f5e' }
];

window.renderQuestBoard = function() {
  var content = document.getElementById('quest-board-content');
  var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
  if (!content || !uid) return;

  var u = currentUserProfile;
  if (!u || !u.isVerified) { 
    content.innerHTML = '<span class="empty-note">Авторизуйтесь, чтобы получать задания...</span>'; 
    return; 
  }

  // 1. Очистка просроченного бейджа
  if (u.activeBadge && u.activeBadge.expires < Date.now()) {
    db.collection('users').doc(uid).update({ activeBadge: firebase.firestore.FieldValue.delete() });
    u.activeBadge = null;
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
  }

  // 2. Выдача квестов на неделю (С защитой от реролла)
  var currentWeekId = getRecentMondayId();
  
  if (u.questRollDate !== currentWeekId || !u.activeQuests || u.activeQuests.length === 0) {
    var cachedQuests = localStorage.getItem('tt_quests_v2_' + uid + '_' + currentWeekId);
    if (cachedQuests) {
        try { u.activeQuests = JSON.parse(cachedQuests); } catch(e) {}
    }
    
    if (!u.activeQuests || u.activeQuests.length === 0) {
        var poolE = QUEST_POOL.filter(function(x){return x.lvl===1;});
        var poolM = QUEST_POOL.filter(function(x){return x.lvl===2;});
        var poolH = QUEST_POOL.filter(function(x){return x.lvl===3;});
        
        // Математический хэш UID + Дата
        function getSeededQuest(pool, seedStr) {
            var hash = 0;
            for (var i = 0; i < seedStr.length; i++) {
                hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
                hash = hash & hash;
            }
            // Клонируем объект, чтобы не менять глобальный пул
            return JSON.parse(JSON.stringify(pool[Math.abs(hash) % pool.length])); 
        }
        
        var e = getSeededQuest(poolE, uid + currentWeekId + 'lvl1');
        var m = getSeededQuest(poolM, uid + currentWeekId + 'lvl2');
        var h = getSeededQuest(poolH, uid + currentWeekId + 'lvl3');
        
        // Инициализируем прогресс для каждого квеста
        e.progress = 0; e.isClaimed = false;
        m.progress = 0; m.isClaimed = false;
        h.progress = 0; h.isClaimed = false;
        
        u.activeQuests = [e, m, h];
        localStorage.setItem('tt_quests_v2_' + uid + '_' + currentWeekId, JSON.stringify(u.activeQuests));
    }
    
    // Записываем новые квесты и УДАЛЯЕМ следы старой системы выбора
    db.collection('users').doc(uid).update({ 
        activeQuests: u.activeQuests, 
        questRollDate: currentWeekId,
        activeQuest: firebase.firestore.FieldValue.delete(),
        questChoices: firebase.firestore.FieldValue.delete()
    }).catch(function(){});
  }

  // 3. Рендер 3 заданий на доске
  var htmlChoices = '<div style="font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 12px; text-align: center;">Ваши задания на эту неделю:</div>';
  
  u.activeQuests.forEach(function(q) {
    var percent = Math.min(100, Math.round((q.progress / q.target) * 100));
    var isDone = q.progress >= q.target;
    var isClaimed = q.isClaimed;

    htmlChoices += '<div class="quest-choice-card" style="cursor: default; border-left: 4px solid ' + (isClaimed ? '#475569' : q.color) + '; opacity: ' + (isClaimed ? '0.6' : '1') + ';">' +
                     '<div class="quest-header"><span>' + q.title + '</span>';
                     
    if (isClaimed) {
        htmlChoices += '<span style="color: #10b981; font-weight: 800;">Выполнено ✅</span>';
    } else {
        htmlChoices += '<span style="color: ' + q.color + ';">' + q.progress + ' / ' + q.target + '</span>';
    }
    
    htmlChoices += '</div><div class="quest-desc">' + q.desc + '</div>';
    
    if (!isClaimed) {
        htmlChoices += '<div class="quest-progress-bar"><div class="quest-progress-fill" style="width: ' + percent + '%; background: ' + q.color + '; box-shadow: 0 0 8px ' + q.color + ';"></div></div>';
    }
    
    htmlChoices += '<div class="quest-rewards" style="margin-top: 12px;"><span>Награда: </span><span class="quest-reward-elo">+' + q.rewardElo + ' Эло</span><span class="quest-reward-badge">' + q.rewardBadge + ' (' + q.badgeDays + ' дн.)</span></div>';

    if (isDone && !isClaimed) {
        htmlChoices += '<button class="btn btn-join" style="margin-top: 14px; background: ' + q.color + ';" onclick="claimQuestReward(\'' + q.id + '\', event)">🎁 Забрать награду</button>';
    }

    htmlChoices += '</div>';
  });
  
  content.innerHTML = htmlChoices;
};

// Забрать награду за конкретный квест
window.claimQuestReward = function(qId,event) {
  var uid = getVerifiedUserId(); 
  if (!uid || !currentUserProfile.activeQuests) return;
  
  var q = currentUserProfile.activeQuests.find(function(x) { return x.id === qId; });
  if (!q || q.progress < q.target || q.isClaimed) return;
  
  var currentElo = parseInt(currentUserProfile.elo, 10) || 1000;
  var newElo = currentElo + q.rewardElo;
  var completedCount = (parseInt(currentUserProfile.questsCompleted, 10) || 0) + 1;
  var expiryDate = Date.now() + (q.badgeDays * 24 * 60 * 60 * 1000);

  var newBadge = { text: q.rewardBadge, color: q.color, expires: expiryDate };
  
  q.isClaimed = true; // Отмечаем квест как полученный

  db.collection('users').doc(uid).update({
    elo: newElo,
    questsCompleted: completedCount,
    activeBadge: newBadge,
    activeQuests: currentUserProfile.activeQuests
  }).then(function() {
   
    // === ЗАПУСКАЕМ САЛЮТ И ВИБРАЦИЮ ===
    fireConfetti(event);
    currentUserProfile.elo = newElo;
    currentUserProfile.questsCompleted = completedCount;
    currentUserProfile.activeBadge = newBadge;
    
    if (typeof customAlert === 'function') customAlert("🎉 ПОЗДРАВЛЯЕМ!\n\nВы получили +" + q.rewardElo + " Эло и уникальную плашку в профиль.");
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
    renderQuestBoard();
    
    if (q.lvl === 3 && typeof sendTelegramAlert === 'function') {
        sendTelegramAlert("🎯 <b>Игрок выполнил сложный квест!</b>\n\n<b>" + cleanHtml(currentUserProfile.name) + "</b> успешно завершил испытание недели «" + q.title + "»!\n\n🏆 <i>Награда: +" + q.rewardElo + " Эло и статус [" + q.rewardBadge + "]</i>");
    }
  });
};

// Глобальный триггер прогресса (Проверяет сразу все квесты)
window.triggerQuestAction = function(uid, actionType, amount) {
  if (!uid) return;
  var increment = amount || 1;
  
  var ref = db.collection('users').doc(uid);
  ref.get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    
    if (data.activeQuests && Array.isArray(data.activeQuests)) {
      var changed = false;
      var newlyCompleted = [];
      
      data.activeQuests.forEach(function(q) {
        if (q.action === actionType && q.progress < q.target && !q.isClaimed) {
          q.progress += increment;
          if (q.progress >= q.target) {
              q.progress = q.target;
              newlyCompleted.push(q);
          }
          changed = true;
        }
      });
      
      if (changed) {
        ref.update({ activeQuests: data.activeQuests }).then(function() {
          if (uid === (typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null)) {
            currentUserProfile.activeQuests = data.activeQuests;
            
            if (typeof renderQuestBoard === 'function') renderQuestBoard();
            
            if (newlyCompleted.length > 0 && typeof customAlert === 'function') {
                var titles = newlyCompleted.map(function(c){return c.title;}).join(', ');
                customAlert("🎯 Квест выполнен: " + titles + "!\n\nЗайдите в раздел заданий, чтобы забрать награду.");
            }
          }
        });
      }
    }
  });
};
