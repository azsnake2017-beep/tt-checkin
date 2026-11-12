// ==========================================
// ЯВНОЕ ПОДТВЕРЖДЕНИЕ СЧЁТА МАТЧЕЙ (1х1, 2х2 и ТУРНИРНЫХ)
// Подключается ПОСЛЕ js/app.js и переопределяет окна подтверждения,
// чтобы счёт всегда показывался построчно: имя игрока — его цифра.
// Это устраняет путаницу, когда игроки подтверждают/указывают не тот счёт.
// ==========================================

// Построение построчного блока "Имя — счёт" с подсветкой победителя
function buildScoreConfirmRowsHtml(rows) {
    var html = '<div style="background: var(--list-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 4px 12px; margin: 10px 0; text-align: left;">';
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var color = r.isWin ? '#10b981' : '#f87171';
        var border = (i < rows.length - 1) ? 'border-bottom: 1px dashed var(--card-border);' : '';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; ' + border + '">' +
                '<span style="font-size: 14px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + cleanHtml(r.name) + '</span>' +
                '<span style="font-size: 22px; font-weight: 900; color: ' + color + '; flex-shrink: 0;">' + r.score + '</span>' +
                '</div>';
    }
    html += '</div>';
    return html;
}

// ==========================================
// 1. ПОДТВЕРЖДЕНИЕ ВХОДЯЩЕГО МАТЧА (соперник подтверждает счёт)
// ==========================================
window.promptConfirmMatch = function(matchId) {
    // Перекрашиваем окно в приятный зеленый цвет
    var btn = document.querySelector('#confirm-modal .btn-join');
    var title = document.querySelector('#confirm-modal h3');
    var box = document.querySelector('#confirm-modal .modal-box');

    if (btn) { btn.innerText = "Подтвердить"; btn.style.background = "#059669"; }
    if (title) { title.innerText = "Подтверждение матча"; title.style.color = "#059669"; }
    if (box) { box.style.borderColor = "#059669"; }

    // Подгружаем данные матча, чтобы показать счёт построчно с именами
    db.collection('pending_matches').doc(matchId).get().then(function(doc) {
        if (!doc.exists) {
            if (typeof customAlert === 'function') customAlert("Этот матч уже обработан.");
            return;
        }
        var m = doc.data();
        var rows;
        if (m.type === 'doubles') {
            rows = [
                { name: m.team1Names, score: m.scoreTeam1, isWin: m.scoreTeam1 > m.scoreTeam2 },
                { name: m.team2Names, score: m.scoreTeam2, isWin: m.scoreTeam2 > m.scoreTeam1 }
            ];
        } else {
            rows = [
                { name: m.proposerName, score: m.scoreProposer, isWin: m.scoreProposer > m.scoreOpponent },
                { name: m.opponentName, score: m.scoreOpponent, isWin: m.scoreOpponent > m.scoreProposer }
            ];
        }
        var text = 'Проверьте, у кого какой счёт:<br>' + buildScoreConfirmRowsHtml(rows) +
                   '<span style="font-size: 12px; opacity: 0.8;">После подтверждения матч запишется в историю, а рейтинг Эло будет обновлён.</span>';
        openConfirmModal(text, function() {
            confirmMatch(matchId);
        });
    }).catch(function(e) {
        // Запасной вариант при ошибке сети — старый текст вопроса
        openConfirmModal('Счет указан верно?<br><br><span style="font-size: 12px; opacity: 0.8;">После подтверждения матч запишется в историю, а ваш рейтинг Эло будет обновлен.</span>', function() {
            confirmMatch(matchId);
        });
    });
};

// ==========================================
// 2. ОТПРАВКА ЗАПРОСА НА МАТЧ (инициатор проверяет свой счёт)
// ==========================================
window.submitMatchProposal = function() {
  var uid = getVerifiedUserId();
  if (!uid) return;
  var myScore = parseInt(document.getElementById('match-my-score').value, 10);
  var oppScore = parseInt(document.getElementById('match-opp-score').value, 10);

  // Стилизуем окно подтверждения под "Матч" (фиолетовый акцент)
  var btn = document.querySelector('#confirm-modal .btn-join');
  var title = document.querySelector('#confirm-modal h3');
  var box = document.querySelector('#confirm-modal .modal-box');
  if (btn) { btn.innerText = "Отправить запрос"; btn.style.background = "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"; }
  if (title) { title.innerText = "Запись матча"; title.style.color = "var(--accent-purple)"; }
  if (box) { box.style.borderColor = "var(--accent-purple)"; }

  if (currentMatchModalType === 'singles') {
    var sel = document.getElementById('match-opponent-select');
    var oppUid = sel.value;
    if (!oppUid || uid === oppUid) return customAlert("Выберите соперника у стола!");
    var oppName = sel.options[sel.selectedIndex].text;

    // Показываем счёт построчно: кто сколько набрал
    var confirmRows = buildScoreConfirmRowsHtml([
        { name: 'Вы (' + currentUserProfile.name + ')', score: myScore, isWin: myScore > oppScore },
        { name: oppName, score: oppScore, isWin: oppScore > myScore }
    ]);

    openConfirmModal('Отправить запрос на матч с таким счётом?<br>' + confirmRows +
        '<span style="font-size: 12px; color: var(--text-muted);">Сопернику придёт уведомление на подтверждение.</span>', function() {
        closeMatchModal();
        db.collection('pending_matches').add({
          type: 'singles',
          proposerUid: uid,
          proposerName: currentUserProfile.name,
          opponentUid: oppUid,
          opponentName: oppName,
          scoreProposer: myScore,
          scoreOpponent: oppScore,
          targetUids: [oppUid],
          timestamp: Date.now()
        }).then(function() {
          customAlert("✅ Запрос на подтверждение матча 1х1 отправлен!");
        }).catch(function(e){});
    });

  } else {
    var pSel = document.getElementById('match-partner-select');
    var o1Sel = document.getElementById('match-opp1-select');
    var o2Sel = document.getElementById('match-opp2-select');
    var partnerUid = pSel.value;
    var opp1Uid = o1Sel.value;
    var opp2Uid = o2Sel.value;

    if (!partnerUid || !opp1Uid || !opp2Uid) {
      return customAlert("Для парного матча необходимо выбрать напарника и двух соперников!");
    }

    var uidsList = [uid, partnerUid, opp1Uid, opp2Uid];
    var uniqueUids = new Set(uidsList);
    if (uniqueUids.size < 4) {
      return customAlert("Все 4 игрока в парном матче должны быть разными участниками!");
    }

    var partnerName = pSel.options[pSel.selectedIndex].text;
    var opp1Name = o1Sel.options[o1Sel.selectedIndex].text;
    var opp2Name = o2Sel.options[o2Sel.selectedIndex].text;

    // Показываем счёт построчно по командам
    var confirmRowsD = buildScoreConfirmRowsHtml([
        { name: 'Ваша команда: ' + currentUserProfile.name + ' & ' + partnerName, score: myScore, isWin: myScore > oppScore },
        { name: 'Соперники: ' + opp1Name + ' & ' + opp2Name, score: oppScore, isWin: oppScore > myScore }
    ]);

    openConfirmModal('Отправить запрос на парный матч 2x2 с таким счётом?<br>' + confirmRowsD +
        '<span style="font-size: 12px; color: var(--text-muted);">Соперникам придёт уведомление на подтверждение.</span>', function() {
        closeMatchModal();
        db.collection('pending_matches').add({
          type: 'doubles',
          proposerUid: uid,
          team1Uids: [uid, partnerUid],
          team1Names: currentUserProfile.name + " & " + partnerName,
          team1NamesArr: [currentUserProfile.name, partnerName],
          team2Uids: [opp1Uid, opp2Uid],
          team2Names: opp1Name + " & " + opp2Name,
          team2NamesArr: [opp1Name, opp2Name],
          scoreTeam1: myScore,
          scoreTeam2: oppScore,
          targetUids: [opp1Uid, opp2Uid],
          timestamp: Date.now()
        }).then(function() {
          customAlert("✅ Запрос на подтверждение парного матча 2х2 отправлен соперникам!");
        }).catch(function(e){});
    });
  }
};

// ==========================================
// 3. ОКНО ВНЕСЕНИЯ СЧЁТА ТУРНИРНОГО МАТЧА
// Метка сверху теперь явно объясняет, чья цифра первая, а чья вторая
// ==========================================
window.openTourMatchModal = function(tourId, matchId, p1Name, p2Name, stage) {
  document.getElementById('tour-match-id-val').value = matchId;
  document.getElementById('tour-id-val').value = tourId;

  // Запоминаем имена, чтобы показать их в окне подтверждения
  window.tourMatchP1Name = p1Name;
  window.tourMatchP2Name = p2Name;

  var labelEl = document.getElementById('tour-match-players-label');
  labelEl.innerHTML =
      '<div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Счёт указывается в порядке:</div>' +
      '<div style="display: flex; flex-direction: column; gap: 5px; text-align: left;">' +
        '<div style="display: flex; align-items: center; gap: 8px;"><span style="background: var(--accent-amber); color: #0b1120; font-weight: 900; border-radius: 6px; padding: 2px 8px; font-size: 12px; white-space: nowrap;">1-я цифра</span><b style="font-size: 14px;">' + cleanHtml(p1Name) + '</b></div>' +
        '<div style="display: flex; align-items: center; gap: 8px;"><span style="background: #64748b; color: #fff; font-weight: 900; border-radius: 6px; padding: 2px 8px; font-size: 12px; white-space: nowrap;">2-я цифра</span><b style="font-size: 14px;">' + cleanHtml(p2Name) + '</b></div>' +
      '</div>';

  var picker = document.getElementById('tour-match-score-picker');
  if (picker) {
      // Отборочные (Группы) И 1/4 финала играются быстро — до 2 побед!
      if (stage === 'group' || stage === 'quarter') {
          picker.style.gridTemplateColumns = 'repeat(2, 1fr)';
          picker.innerHTML =
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(2, 0)">2 : 0</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(2, 1)">2 : 1</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(1, 2)">1 : 2</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(0, 2)">0 : 2</button>';
          selectTourScore(2, 0);
      } else {
          // 1/2 финала, матч за 3-е место и Финал — до 3 побед!
          picker.style.gridTemplateColumns = 'repeat(3, 1fr)';
          picker.innerHTML =
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(3, 0)">3 : 0</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(3, 1)">3 : 1</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(3, 2)">3 : 2</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(2, 3)">2 : 3</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(1, 3)">1 : 3</button>' +
              '<button class="score-btn tour-score-btn" onclick="selectTourScore(0, 3)">0 : 3</button>';
          selectTourScore(3, 0);
      }
  }

  if (typeof openModalSmoothly === 'function') {
      openModalSmoothly('tour-match-modal');
  } else {
      document.getElementById('tour-match-modal').style.display = 'flex';
  }
};

// ==========================================
// 4. СОХРАНЕНИЕ СЧЁТА ТУРНИРНОГО МАТЧА
// Окно подтверждения теперь показывает счёт построчно с именами
// ==========================================
window.submitTourMatchScore = function() {
  var s1 = parseInt(document.getElementById('tour-match-s1').value, 10);
  var s2 = parseInt(document.getElementById('tour-match-s2').value, 10);

  var p1Name = window.tourMatchP1Name || 'Игрок 1';
  var p2Name = window.tourMatchP2Name || 'Игрок 2';

  var scoreRows = buildScoreConfirmRowsHtml([
      { name: p1Name, score: s1, isWin: s1 > s2 },
      { name: p2Name, score: s2, isWin: s2 > s1 }
  ]);

  openConfirmModal('Проверьте, у кого какой счёт:<br>' + scoreRows + '<span style="font-size: 12px; color: var(--text-muted);">После подтверждения Эло будет пересчитано, а очередь и таблица обновлены.</span>', function() {

      var tourId = document.getElementById('tour-id-val').value;
      var matchId = document.getElementById('tour-match-id-val').value;
      var uid = getVerifiedUserId();

      closeTourMatchModal();
      var recordedMatch = null;
      var isEditMode = false;

      db.runTransaction(function(t) {
          var ref = db.collection('tournaments').doc(tourId);
          return t.get(ref).then(function(doc) {
              if (!doc.exists) return; var data = doc.data(); var matches = data.matches || [];
              var mIdx = -1; for (var j = 0; j < matches.length; j++) { if (matches[j].id === matchId) { mIdx = j; break; } }
              if (mIdx === -1) return;
              var match = matches[mIdx];
              if (!isSuperAdmin() && match.p1Uid !== uid && match.p2Uid !== uid) return;

              // === БЛОК РЕДАКТИРОВАНИЯ ===
              if (match.score1 !== null) {
                  isEditMode = true;
                  var oldS1 = match.score1, oldS2 = match.score2;
                  var oldPWin = oldS1 > oldS2, isPWin = s1 > s2;
                  match.score1 = s1; match.score2 = s2;

                  if (match.stage === 'group') {
                      var groups = data.groups; var grp = groups[match.group];
                      var pl1 = null, pl2 = null;
                      for(var k=0; k<grp.length; k++) { if(grp[k].uid === match.p1Uid) pl1 = grp[k]; if(grp[k].uid === match.p2Uid) pl2 = grp[k]; }

                      if (oldPWin) { pl1.w--; pl1.pts -= 2; pl2.l--; pl2.pts -= 1; } else { pl2.w--; pl2.pts -= 2; pl1.l--; pl1.pts -= 1; }
                      if (isPWin) { pl1.w++; pl1.pts += 2; pl2.l++; pl2.pts += 1; } else { pl2.w++; pl2.pts += 2; pl1.l++; pl1.pts += 1; }

                      t.update(ref, { matches: matches, groups: groups });
                  } else {
                      t.update(ref, { matches: matches });
                  }
                  return;
              }

              // === БЛОК НОВОГО СОХРАНЕНИЯ ===
              match.score1 = s1; match.score2 = s2;

              var p1Ref = db.collection('users').doc(match.p1Uid), p2Ref = db.collection('users').doc(match.p2Uid);

              return Promise.all([t.get(p1Ref), t.get(p2Ref)]).then(function(uDocs) {
                  var p1Doc = uDocs[0], p2Doc = uDocs[1];
                  var p1Data = p1Doc.exists ? p1Doc.data() : { elo: 1000, wins:0, losses:0, matches:0, winStreak:0 };
                  var p2Data = p2Doc.exists ? p2Doc.data() : { elo: 1000, wins:0, losses:0, matches:0, winStreak:0 };

                  var isPWin = s1 > s2;
                  var p1Elo = parseInt(p1Data.elo, 10) || 1000;
                  var p2Elo = parseInt(p2Data.elo, 10) || 1000;
                  var rawDelta = typeof calculateElo === 'function' ? calculateElo(p1Elo, p2Elo, isPWin ? 1 : 0) : (isPWin ? 16 : -16);
                  var absDelta = Math.abs(rawDelta);

                  match.eloDelta = absDelta;
                  recordedMatch = match;

                  var p1Gain = isPWin ? absDelta : -absDelta;
                  var p2Gain = isPWin ? -absDelta : absDelta;

                  var newP1Elo = Math.max(100, p1Elo + p1Gain);
                  var newP2Elo = Math.max(100, p2Elo + p2Gain);
                  var p1S = isPWin ? ((parseInt(p1Data.winStreak, 10) || 0) + 1) : 0;
                  var p2S = isPWin ? 0 : ((parseInt(p2Data.winStreak, 10) || 0) + 1);

                  t.update(p1Ref, {
                    elo: newP1Elo, lastEloDelta: p1Gain, winStreak: p1S,
                    matches: (parseInt(p1Data.matches, 10) || 0) + 1, wins: (parseInt(p1Data.wins, 10) || 0) + (isPWin ? 1 : 0), losses: (parseInt(p1Data.losses, 10) || 0) + (isPWin ? 0 : 1)
                  });

                  t.update(p2Ref, {
                    elo: newP2Elo, lastEloDelta: p2Gain, winStreak: p2S,
                    matches: (parseInt(p2Data.matches, 10) || 0) + 1, wins: (parseInt(p2Data.wins, 10) || 0) + (isPWin ? 0 : 1), losses: (parseInt(p2Data.losses, 10) || 0) + (isPWin ? 1 : 0)
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
          if (isEditMode) {
              if (typeof customAlert === 'function') customAlert('✏️ <b>Счет успешно изменен!</b><br><br><span style="font-size: 12px; color: var(--text-muted);">Таблица групп обновлена. Эло игроков не пересчитывалось, чтобы не было задвоений.</span>');
          } else if (recordedMatch) {
            db.collection('matches_history').add({
              type: 'singles', p1Uid: recordedMatch.p1Uid, p1Name: recordedMatch.p1Name, p1Score: s1, p2Uid: recordedMatch.p2Uid, p2Name: recordedMatch.p2Name, p2Score: s2, participants: [recordedMatch.p1Uid, recordedMatch.p2Uid], timestamp: Date.now()
            });
            if (typeof triggerConfetti === 'function') triggerConfetti();
          }
      }).catch(function(e){});
  });
};
