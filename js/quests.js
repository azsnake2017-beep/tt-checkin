// js/quests.js — Движок еженедельных заданий и наград

// Жесткая привязка к понедельникам: получаем уникальный ID недели (00:00 понедельника)
function getRecentMondayId() {
  var d = new Date();
  var day = d.getDay() || 7; // Делаем воскресенье 7-м днем недели
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (day - 1)); // Откатываем дату до ближайшего прошедшего понедельника
  return 'week_' + d.getTime();
}

// База заданий (Сбалансированная и защищенная от накруток)
var QUEST_POOL = [
  // ЛЕГКИЕ (Уровень 1) - Упор на активность, низкий риск накрутки
  { id: 'q_e1', lvl: 1, title: 'Разминка', desc: 'Сыграть 3 любых матча за неделю (результат не важен).', target: 3, action: 'play_match', rewardElo: 3, rewardBadge: 'Разминающийся 🏓', badgeDays: 7, color: '#10b981' },
  { id: 'q_e2', lvl: 1, title: 'Командный дух', desc: 'Сыграть 2 парных матча (2х2).', target: 2, action: 'play_doubles', rewardElo: 4, rewardBadge: 'В паре 👥', badgeDays: 7, color: '#10b981' },
  { id: 'q_e3', lvl: 1, title: 'Любитель баланса', desc: 'Сыграть матч, который закончится со счетом 3:2 (победа или поражение).', target: 1, action: 'play_3_2', rewardElo: 4, rewardBadge: 'Боец ⚔️', badgeDays: 7, color: '#10b981' },
  { id: 'q_e4', lvl: 1, title: 'Турнирный боец', desc: 'Сыграть матч на выходных (суббота или воскресенье).', target: 1, action: 'play_weekend', rewardElo: 3, rewardBadge: 'Уикенд-воин 🏕', badgeDays: 7, color: '#10b981' },
  
  // СРЕДНИЕ (Уровень 2) - Требуют подтвержденных побед
  { id: 'q_m1', lvl: 2, title: 'Хет-трик', desc: 'Одержать победу в 3 матчах.', target: 3, action: 'win_match', rewardElo: 10, rewardBadge: 'Хет-трик 🎯', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m2', lvl: 2, title: 'Сыгранная пара', desc: 'Выиграть 2 парных матча (2х2).', target: 2, action: 'win_doubles', rewardElo: 12, rewardBadge: 'Сыгранная пара 🤝', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m3', lvl: 2, title: 'Сухарь', desc: 'Разгромить соперника со счетом 3:0.', target: 1, action: 'win_flawless', rewardElo: 12, rewardBadge: 'Сухарь 🍩', badgeDays: 7, color: '#f59e0b' },
  { id: 'q_m4', lvl: 2, title: 'Стальные нервы', desc: 'Выиграть тяжелейший матч со счетом 3:2.', target: 1, action: 'win_3_2', rewardElo: 15, rewardBadge: 'Стальные нервы 🥶', badgeDays: 7, color: '#f59e0b' },
  
  // СЛОЖНЫЕ (Уровень 3) - Элитные челленджи (Накрутить почти невозможно)
  { id: 'q_h1', lvl: 3, title: 'Убийца гигантов', desc: 'Победить игрока, чей рейтинг строго выше вашего на 50+ очков.', target: 1, action: 'win_higher_elo', rewardElo: 30, rewardBadge: 'Давид 🗡️', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h2', lvl: 3, title: 'Тотальная доминация', desc: 'Одержать 3 победы со счетом 3:0.', target: 3, action: 'win_flawless', rewardElo: 35, rewardBadge: 'Доминатор 👑', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h3', lvl: 3, title: 'Гладиатор', desc: 'Одержать серию из 5 побед подряд.', target: 5, action: 'win_streak', rewardElo: 40, rewardBadge: 'Гладиатор 🛡️', badgeDays: 14, color: '#f43f5e' },
  { id: 'q_h4', lvl: 3, title: 'Легенда парного', desc: 'Выиграть 4 парных матча.', target: 4, action: 'win_doubles', rewardElo: 25, rewardBadge: 'Дуэт-Легенда 🏆', badgeDays: 14, color: '#f43f5e' }
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

  // 2. Рендер активного квеста
  if (u.activeQuest) {
    var q = u.activeQuest;
    var percent = Math.min(100, Math.round((q.progress / q.target) * 100));
    var isDone = q.progress >= q.target;

    var html = '<div class="quest-choice-card" style="cursor: default; border-left: 4px solid ' + q.color + ';">' +
                 '<div class="quest-header"><span>' + q.title + '</span><span style="color: ' + q.color + ';">' + q.progress + ' / ' + q.target + '</span></div>' +
                 '<div class="quest-desc">' + q.desc + '</div>' +
                 '<div class="quest-progress-bar"><div class="quest-progress-fill" style="width: ' + percent + '%; background: ' + q.color + '; box-shadow: 0 0 8px ' + q.color + ';"></div></div>' +
                 '<div class="quest-rewards" style="margin-top: 12px;"><span>Награда: </span><span class="quest-reward-elo">+' + q.rewardElo + ' Эло</span><span class="quest-reward-badge">' + q.rewardBadge + ' (' + q.badgeDays + ' дн.)</span></div>';
    
    if (isDone) {
      html += '<button class="btn btn-join" style="margin-top: 14px; background: ' + q.color + ';" onclick="claimQuestReward()">🎁 Забрать награду</button>';
    } else {
      html += '<button class="btn-cancel-modal" style="margin-top: 10px; width: 100%; text-align: center; color: var(--text-muted);" onclick="abandonQuest()">Отменить задание (до понедельника)</button>';
    }
    html += '</div>';
    content.innerHTML = html;
    return;
  }

  // 3. Генерация 3 случайных заданий (Раз в неделю по понедельникам)
  var currentWeekId = getRecentMondayId();
  if (u.questRollDate !== currentWeekId || !u.questChoices) {
    var poolE = QUEST_POOL.filter(function(x){return x.lvl===1;});
    var poolM = QUEST_POOL.filter(function(x){return x.lvl===2;});
    var poolH = QUEST_POOL.filter(function(x){return x.lvl===3;});
    
    var e = poolE[Math.floor(Math.random() * poolE.length)];
    var m = poolM[Math.floor(Math.random() * poolM.length)];
    var h = poolH[Math.floor(Math.random() * poolH.length)];
    
    u.questChoices = [e, m, h];
    db.collection('users').doc(uid).update({ questChoices: u.questChoices, questRollDate: currentWeekId });
  }

  // 4. Рендер выбора из 3 заданий
  var htmlChoices = '<div style="font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 12px; text-align: center;">Выберите одно задание на эту неделю:</div>';
  u.questChoices.forEach(function(c) {
    htmlChoices += '<div class="quest-choice-card quest-level-' + c.lvl + '" onclick="acceptQuest(\'' + c.id + '\')">' +
                     '<div class="quest-header"><span>' + c.title + '</span><span style="font-size: 11px; opacity: 0.7;">Сложность: ' + c.lvl + '</span></div>' +
                     '<div class="quest-desc">' + c.desc + '</div>' +
                     '<div class="quest-rewards"><span class="quest-reward-elo">+' + c.rewardElo + ' Эло</span><span class="quest-reward-badge">' + c.rewardBadge + '</span></div>' +
                   '</div>';
  });
  content.innerHTML = htmlChoices;
};

// Принять задание
window.acceptQuest = function(qId) {
  var uid = getVerifiedUserId(); if (!uid || !currentUserProfile.questChoices) return;
  var selected = currentUserProfile.questChoices.find(function(x) { return x.id === qId; });
  if (!selected) return;
  
  selected.progress = 0;
  db.collection('users').doc(uid).update({ activeQuest: selected, questChoices: firebase.firestore.FieldValue.delete() }).then(function() {
    currentUserProfile.activeQuest = selected;
    renderQuestBoard();
    if (typeof customAlert === 'function') customAlert("🎯 Задание принято!\n\nПрогресс будет заполняться автоматически в течение недели. Удачи!");
  });
};

// Отказаться от задания
window.abandonQuest = function() {
  if (typeof openConfirmModal === 'function') {
    openConfirmModal('Вы уверены, что хотите отменить задание?<br><br><span style="font-size: 12px; color: var(--accent-red);">Новое задание можно будет выбрать только в следующий понедельник!</span>', function() {
      var uid = getVerifiedUserId();
      db.collection('users').doc(uid).update({ activeQuest: firebase.firestore.FieldValue.delete() }).then(function() {
        currentUserProfile.activeQuest = null;
        renderQuestBoard();
      });
    });
  }
};

// Забрать награду
window.claimQuestReward = function() {
  var uid = getVerifiedUserId(); 
  var q = currentUserProfile.activeQuest; 
  if (!uid || !q || q.progress < q.target) return;
  
  var currentElo = parseInt(currentUserProfile.elo, 10) || 1000;
  var newElo = currentElo + q.rewardElo;
  var completedCount = (parseInt(currentUserProfile.questsCompleted, 10) || 0) + 1;
  var expiryDate = Date.now() + (q.badgeDays * 24 * 60 * 60 * 1000);

  var newBadge = { text: q.rewardBadge, color: q.color, expires: expiryDate };

  db.collection('users').doc(uid).update({
    elo: newElo,
    questsCompleted: completedCount,
    activeBadge: newBadge,
    activeQuest: firebase.firestore.FieldValue.delete()
  }).then(function() {
    currentUserProfile.elo = newElo;
    currentUserProfile.questsCompleted = completedCount;
    currentUserProfile.activeBadge = newBadge;
    currentUserProfile.activeQuest = null;
    
    if (typeof customAlert === 'function') customAlert("🎉 ПОЗДРАВЛЯЕМ!\n\nВы получили +" + q.rewardElo + " Эло и уникальную плашку в профиль.");
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
    renderQuestBoard();
    
    if (q.lvl === 3 && typeof sendTelegramAlert === 'function') {
        sendTelegramAlert("🎯 <b>Игрок выполнил сложный квест!</b>\n\n<b>" + cleanHtml(currentUserProfile.name) + "</b> успешно завершил испытание недели «" + q.title + "»!\n\n🏆 <i>Награда: +" + q.rewardElo + " Эло и статус [" + q.rewardBadge + "]</i>");
    }
  });
};

// Глобальный триггер прогресса
window.triggerQuestAction = function(uid, actionType, amount) {
  if (!uid) return;
  var increment = amount || 1;
  
  var ref = db.collection('users').doc(uid);
  ref.get().then(function(doc) {
    if (!doc.exists) return;
    var data = doc.data();
    
    if (data.activeQuest && data.activeQuest.action === actionType && data.activeQuest.progress < data.activeQuest.target) {
      data.activeQuest.progress += increment;
      
      if (data.activeQuest.progress > data.activeQuest.target) {
          data.activeQuest.progress = data.activeQuest.target;
      }
      
      ref.update({ activeQuest: data.activeQuest });
      
      if (uid === (typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null)) {
        currentUserProfile.activeQuest = data.activeQuest;
        
        if (typeof renderQuestBoard === 'function') renderQuestBoard();
        
        if (data.activeQuest.progress >= data.activeQuest.target && typeof sendDevicePushNotification === 'function') {
          sendDevicePushNotification("Квест выполнен!", "Вы достигли цели: " + data.activeQuest.title + ". Зайдите в задания за наградой!");
        }
      }
    }
  });
};
