function getMatchHumor(winnerScore, loserScore, winnerName, loserName) {
  var jokes_3_0 = [
    "🔥 " + cleanHtml(winnerName) + " оформили сухой закон! " + cleanHtml(loserName) + ", держитесь, реванш не за горами!",
    "🧹 Полный вынос в одну калитку! " + cleanHtml(winnerName) + " буквально смели соперников со стола.",
    "⚡ Без шансов! " + cleanHtml(winnerName) + " побеждают всухую. " + cleanHtml(loserName) + ", нужно срочно менять накладки!",
    "🎯 Идеальная точность: " + cleanHtml(winnerName) + " не отдали ни сета. Это было быстро и безжалостно."
  ];
  var jokes_3_1 = [
    "💪 Уверенная победа! " + cleanHtml(loserName) + " взяли сет престижа, но " + cleanHtml(winnerName) + " своего не упустили.",
    "🎾 " + cleanHtml(winnerName) + " позволили соперникам размочить счет, но быстро расставили всё по местам!",
    "🥊 " + cleanHtml(loserName) + " огрызнулись одной партией, но против слаженности " + cleanHtml(winnerName) + " приема не нашлось.",
    "🚀 Четкая победа по делу! " + cleanHtml(winnerName) + " забирают матч с комфортным счетом."
  ];
  var jokes_3_2 = [
    "🍿 Валидольный триллер! " + cleanHtml(winnerName) + " и " + cleanHtml(loserName) + " устроили бой гладиаторов на балансе!",
    "⚡ Битва титанов до седых волос! В пяти партиях фортуна всё-таки улыбнулась " + cleanHtml(winnerName) + ".",
    "🔥 Вот это заруба! " + cleanHtml(winnerName) + " выгрызают победу в решающей пятой партии на зубах!",
    "😱 Корвалол в студию! Настоящая драма за столом завершается сложнейшей победой " + cleanHtml(winnerName) + "!"
  ];

  var pool = jokes_3_1;
  if (loserScore === 0) pool = jokes_3_0;
  else if (loserScore === 2) pool = jokes_3_2;
  return pool[Math.floor(Math.random() * pool.length)];
}

function calculateElo(rA, rB, scoreA, k) { 
  if (!k) k = 32; 
  var ratingA = parseInt(rA, 10) || 1000;
  var ratingB = parseInt(rB, 10) || 1000;
  return Math.round(k * (scoreA - (1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))))); 
}

function setMatchModalType(type) {
  currentMatchModalType = type;
  var btnS = document.getElementById('btn-match-type-singles');
  var btnD = document.getElementById('btn-match-type-doubles');
  var fS = document.getElementById('match-fields-singles');
  var fD = document.getElementById('match-fields-doubles');

  if (type === 'singles') {
    btnS.classList.add('active'); btnD.classList.remove('active');
    fS.style.display = 'flex'; fD.style.display = 'none';
  } else {
    btnD.classList.add('active'); btnS.classList.remove('active');
    fD.style.display = 'flex'; fS.style.display = 'none';
  }
}

function handleMatchClick() {
  if (!isUserVerified()) return customAlert("❌ Записывать матчи могут только авторизованные игроки!");
  var uid = getVerifiedUserId(); 
  if (!currentUserActiveLoc || !uid) return customAlert("❌ Записывать матчи могут только игроки за столом (сделайте чекин)!");
  
  var playersAtTable = (locationsData[currentUserActiveLoc] && locationsData[currentUserActiveLoc].players ? locationsData[currentUserActiveLoc].players : []);
  var opps = playersAtTable.filter(function(p) { return (p.uid || p) !== uid; });

  var sel = document.getElementById('match-opponent-select'); 
  sel.innerHTML = '';
  if (opps.length === 0) { 
    sel.innerHTML = '<option value="">(нет других игроков у стола)</option>'; 
  } else { 
    for(var i=0; i<opps.length; i++) { 
      sel.innerHTML += '<option value="' + escapeJS(opps[i].uid || opps[i]) + '">' + cleanHtml(opps[i].name) + '</option>'; 
    } 
  }

  var selPartner = document.getElementById('match-partner-select');
  var selOpp1 = document.getElementById('match-opp1-select');
  var selOpp2 = document.getElementById('match-opp2-select');
  selPartner.innerHTML = ''; selOpp1.innerHTML = ''; selOpp2.innerHTML = '';

  if (opps.length < 3) {
    var note = '<option value="">(нужно минимум 4 игрока у стола)</option>';
    selPartner.innerHTML = note; selOpp1.innerHTML = note; selOpp2.innerHTML = note;
  } else {
    for(var j=0; j<opps.length; j++) {
      var opt = '<option value="' + escapeJS(opps[j].uid || opps[j]) + '">' + cleanHtml(opps[j].name) + '</option>';
      selPartner.innerHTML += opt;
      selOpp1.innerHTML += opt;
      selOpp2.innerHTML += opt;
    }
    if (opps.length >= 3) {
      selPartner.selectedIndex = 0;
      selOpp1.selectedIndex = 1;
      selOpp2.selectedIndex = 2;
    }
  }

  setMatchModalType('singles');
  selectScore(3, 0); 
  document.getElementById('match-modal').style.display = 'flex';
}

function closeMatchModal() { document.getElementById('match-modal').style.display = 'none'; }

function selectScore(my, opp) { 
  document.getElementById('match-my-score').value = my; 
  document.getElementById('match-opp-score').value = opp; 
  var btns = document.querySelectorAll('.reg-score-btn');
  for(var i=0; i<btns.length; i++) {
    if (btns[i].innerText.replace(/\s+/g,'') === (my + ":" + opp)) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
}

function submitMatchProposal() {
  var uid = getVerifiedUserId();
  if (!uid) return;
  var myScore = parseInt(document.getElementById('match-my-score').value, 10);
  var oppScore = parseInt(document.getElementById('match-opp-score').value, 10);

  if (currentMatchModalType === 'singles') {
    var sel = document.getElementById('match-opponent-select');
    var oppUid = sel.value;
    if (!oppUid || uid === oppUid) return customAlert("Выберите соперника у стола!");
    
    closeMatchModal();
    db.collection('pending_matches').add({ 
      type: 'singles',
      proposerUid: uid, 
      proposerName: currentUserProfile.name, 
      opponentUid: oppUid, 
      opponentName: sel.options[sel.selectedIndex].text, 
      scoreProposer: myScore, 
      scoreOpponent: oppScore, 
      targetUids: [oppUid],
      timestamp: Date.now() 
    }).then(function() { 
      customAlert("✅ Запрос на подтверждение матча 1х1 отправлен!"); 
    }).catch(function(e){});

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
  }
}

function listenPendingMatches() {
  var myUid = getVerifiedUserId(); if (!myUid) return;
  db.collection('pending_matches').where('targetUids', 'array-contains', myUid).onSnapshot(function(snap) {
    try {
      var c = document.getElementById('pending-matches-container'); 
      if (snap.empty) { c.innerHTML = ''; return; }
      var html = '';
      snap.forEach(function(doc) { 
        var m = doc.data(); 
        var isDoubles = m.type === 'doubles';
        var title = isDoubles ? '👥 Подтверждение парного матча 2х2' : '⚔️ Подтверждение матча от <b>' + cleanHtml(m.proposerName) + '</b>';
        var scoreText = isDoubles 
          ? ('Счёт: <b>' + cleanHtml(m.team2Names) + '</b> ' + m.scoreTeam2 + ' : ' + m.scoreTeam1 + ' <b>' + cleanHtml(m.team1Names) + '</b>')
          : ('Счёт: Вы <b>' + m.scoreOpponent + ' : ' + m.scoreProposer + '</b> ' + cleanHtml(m.proposerName));

        html += '<div style="background: rgba(168, 85, 247, 0.1); border: 1px solid var(--accent-purple); padding: 12px; border-radius: 14px; display: flex; flex-direction: column; gap: 8px;">' +
                  '<div style="font-size: 13px; font-weight: 600; color: #9333ea;">' + title + '</div>' +
                  '<div style="font-size: 13px;">' + scoreText + '</div>' +
                  '<div style="font-size: 11px; color: var(--text-muted);">' + (isDoubles ? 'Достаточно подтверждения любого из соперников' : '') + '</div>' +
                  '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                    '<button class="btn btn-join" style="background: #059669; padding: 8px;" onclick="confirmMatch(\'' + escapeJS(doc.id) + '\')">Подтвердить</button>' +
                    '<button class="btn btn-leave" style="padding: 8px;" onclick="rejectMatch(\'' + escapeJS(doc.id) + '\')">Отклонить</button>' +
                  '</div>' +
                '</div>'; 
      });
      c.innerHTML = html;
    } catch(e) {}
  });
}

function confirmMatch(matchId) {
  var myUid = getVerifiedUserId(); if (!myUid) return;
  var matchRef = db.collection('pending_matches').doc(matchId);
  
  matchRef.get().then(function(matchDoc) {
    if (!matchDoc.exists) return;
    var m = matchDoc.data();
    
    if (m.type !== 'doubles') {
      var pRef = db.collection('users').doc(m.proposerUid);
      var oRef = db.collection('users').doc(m.opponentUid);

      Promise.all([pRef.get(), oRef.get()]).then(function(docs) {
        var pDoc = docs[0], oDoc = docs[1];
        var pData = pDoc.exists ? pDoc.data() : { name: m.proposerName, elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };
        var oData = oDoc.exists ? oDoc.data() : { name: m.opponentName, elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };
        
        var isPWin = m.scoreProposer > m.scoreOpponent;
        var pElo = parseInt(pData.elo, 10) || 1000;
        var oElo = parseInt(oData.elo, 10) || 1000;
        var myDelta = calculateElo(pElo, oElo, isPWin ? 1 : 0, 32);
        var newPElo = Math.max(100, pElo + myDelta);
        var newOElo = Math.max(100, oElo - myDelta);
        
        var pWinStreak = isPWin ? ((parseInt(pData.winStreak, 10) || 0) + 1) : 0;
        var oWinStreak = isPWin ? 0 : ((parseInt(oData.winStreak, 10) || 0) + 1);

        var batch = db.batch();
        batch.set(pRef, { 
          elo: newPElo, 
          lastEloDelta: isPWin ? myDelta : -myDelta, 
          winStreak: pWinStreak, 
          matches: (parseInt(pData.matches, 10) || 0) + 1, 
          wins: (parseInt(pData.wins, 10) || 0) + (isPWin ? 1 : 0), 
          losses: (parseInt(pData.losses, 10) || 0) + (isPWin ? 0 : 1), 
          updatedAt: Date.now() 
        }, { merge: true });

        batch.set(oRef, { 
          elo: newOElo, 
          lastEloDelta: isPWin ? -myDelta : myDelta, 
          winStreak: oWinStreak, 
          matches: (parseInt(oData.matches, 10) || 0) + 1, 
          wins: (parseInt(oData.wins, 10) || 0) + (isPWin ? 0 : 1), 
          losses: (parseInt(oData.losses, 10) || 0) + (isPWin ? 1 : 0), 
          updatedAt: Date.now() 
        }, { merge: true });

        batch.delete(matchRef);

        batch.commit().then(function() {
          db.collection('matches_history').add({ 
            type: 'singles',
            p1Uid: m.proposerUid, 
            p1Name: m.proposerName, 
            p1Score: m.scoreProposer, 
            p2Uid: m.opponentUid, 
            p2Name: m.opponentName, 
            p2Score: m.scoreOpponent, 
            participants: [m.proposerUid, m.opponentUid], 
            timestamp: Date.now() 
          }).then(function() {
            var winnerName = isPWin ? m.proposerName : m.opponentName;
            var loserName = isPWin ? m.opponentName : m.proposerName;
            var wScore = isPWin ? m.scoreProposer : m.scoreOpponent;
            var lScore = isPWin ? m.scoreOpponent : m.scoreProposer;
            var humorComment = getMatchHumor(wScore, lScore, winnerName, loserName);

            sendTelegramAlert(
              "🏆 <b>Одиночный матч подтверждён!</b>\n\n" +
              "🏓 <b>" + cleanHtml(m.proposerName) + "</b>  <code>" + m.scoreProposer + " : " + m.scoreOpponent + "</code>  <b>" + cleanHtml(m.opponentName) + "</b>\n\n" +
              "<i>" + humorComment + "</i>\n\n" +
              "<blockquote>📊 <b>Новый рейтинг Эло:</b>\n" +
              "• " + cleanHtml(m.proposerName) + ": <b>" + newPElo + "</b> (" + (isPWin ? "+" : "") + myDelta + ")\n" +
              "• " + cleanHtml(m.opponentName) + ": <b>" + newOElo + "</b> (" + (!isPWin ? "+" : "-") + myDelta + ")</blockquote>"
            );
          });
        }).catch(function(e) { customAlert("Ошибка сохранения: " + e.message); });
      });

    } else {
      var t1aRef = db.collection('users').doc(m.team1Uids[0]);
      var t1bRef = db.collection('users').doc(m.team1Uids[1]);
      var t2aRef = db.collection('users').doc(m.team2Uids[0]);
      var t2bRef = db.collection('users').doc(m.team2Uids[1]);

      Promise.all([t1aRef.get(), t1bRef.get(), t2aRef.get(), t2bRef.get()]).then(function(docs) {
        var d1a = docs[0].exists ? docs[0].data() : { name: m.team1NamesArr[0], elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };
        var d1b = docs[1].exists ? docs[1].data() : { name: m.team1NamesArr[1], elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };
        var d2a = docs[2].exists ? docs[2].data() : { name: m.team2NamesArr[0], elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };
        var d2b = docs[3].exists ? docs[3].data() : { name: m.team2NamesArr[1], elo: 1000, matches: 0, wins: 0, losses: 0, winStreak: 0 };

        var elo1a = parseInt(d1a.elo, 10) || 1000;
        var elo1b = parseInt(d1b.elo, 10) || 1000;
        var elo2a = parseInt(d2a.elo, 10) || 1000;
        var elo2b = parseInt(d2b.elo, 10) || 1000;

        var team1AvgElo = (elo1a + elo1b) / 2;
        var team2AvgElo = (elo2a + elo2b) / 2;

        var isTeam1Win = m.scoreTeam1 > m.scoreTeam2;
        var delta = calculateElo(team1AvgElo, team2AvgElo, isTeam1Win ? 1 : 0, 24);

        var newElo1a = Math.max(100, elo1a + delta);
        var newElo1b = Math.max(100, elo1b + delta);
        var newElo2a = Math.max(100, elo2a - delta);
        var newElo2b = Math.max(100, elo2b - delta);

        var batch = db.batch();

        batch.set(t1aRef, {
          elo: newElo1a,
          lastEloDelta: isTeam1Win ? delta : -delta,
          winStreak: isTeam1Win ? ((parseInt(d1a.winStreak, 10) || 0) + 1) : 0,
          matches: (parseInt(d1a.matches, 10) || 0) + 1,
          wins: (parseInt(d1a.wins, 10) || 0) + (isTeam1Win ? 1 : 0),
          losses: (parseInt(d1a.losses, 10) || 0) + (isTeam1Win ? 0 : 1),
          updatedAt: Date.now()
        }, { merge: true });

        batch.set(t1bRef, {
          elo: newElo1b,
          lastEloDelta: isTeam1Win ? delta : -delta,
          winStreak: isTeam1Win ? ((parseInt(d1b.winStreak, 10) || 0) + 1) : 0,
          matches: (parseInt(d1b.matches, 10) || 0) + 1,
          wins: (parseInt(d1b.wins, 10) || 0) + (isTeam1Win ? 1 : 0),
          losses: (parseInt(d1b.losses, 10) || 0) + (isTeam1Win ? 0 : 1),
          updatedAt: Date.now()
        }, { merge: true });

        batch.set(t2aRef, {
          elo: newElo2a,
          lastEloDelta: isTeam1Win ? -delta : delta,
          winStreak: isTeam1Win ? 0 : ((parseInt(d2a.winStreak, 10) || 0) + 1),
          matches: (parseInt(d2a.matches, 10) || 0) + 1,
          wins: (parseInt(d2a.wins, 10) || 0) + (isTeam1Win ? 0 : 1),
          losses: (parseInt(d2a.losses, 10) || 0) + (isTeam1Win ? 1 : 0),
          updatedAt: Date.now()
        }, { merge: true });

        batch.set(t2bRef, {
          elo: newElo2b,
          lastEloDelta: isTeam1Win ? -delta : delta,
          winStreak: isTeam1Win ? 0 : ((parseInt(d2b.winStreak, 10) || 0) + 1),
          matches: (parseInt(d2b.matches, 10) || 0) + 1,
          wins: (parseInt(d2b.wins, 10) || 0) + (isTeam1Win ? 0 : 1),
          losses: (parseInt(d2b.losses, 10) || 0) + (isTeam1Win ? 1 : 0),
          updatedAt: Date.now()
        }, { merge: true });

        batch.delete(matchRef);

        batch.commit().then(function() {
          db.collection('matches_history').add({ 
            type: 'doubles',
            team1Uids: m.team1Uids,
            team1Names: m.team1Names,
            team1NamesArr: m.team1NamesArr,
            team2Uids: m.team2Uids,
            team2Names: m.team2Names,
            team2NamesArr: m.team2NamesArr,
            team1Score: m.scoreTeam1,
            team2Score: m.scoreTeam2,
            participants: m.team1Uids.concat(m.team2Uids),
            timestamp: Date.now() 
          }).then(function() {
            var winTeam = isTeam1Win ? m.team1Names : m.team2Names;
            var loseTeam = isTeam1Win ? m.team2Names : m.team1Names;
            var wScore = isTeam1Win ? m.scoreTeam1 : m.scoreTeam2;
            var lScore = isTeam1Win ? m.scoreTeam2 : m.scoreTeam1;
            var humorComment = getMatchHumor(wScore, lScore, winTeam, loseTeam);

            sendTelegramAlert(
              "👥 <b>Парный матч 2х2 подтверждён!</b>\n\n" +
              "🏓 <b>" + cleanHtml(m.team1Names) + "</b>  <code>" + m.scoreTeam1 + " : " + m.scoreTeam2 + "</code>  <b>" + cleanHtml(m.team2Names) + "</b>\n\n" +
              "<i>" + humorComment + "</i>\n\n" +
              "<blockquote>📊 <b>Новый рейтинг Эло участников:</b>\n" +
              "• " + cleanHtml(m.team1NamesArr[0]) + ": <b>" + newElo1a + "</b> (" + (isTeam1Win ? "+" : "") + delta + ")\n" +
              "• " + cleanHtml(m.team1NamesArr[1]) + ": <b>" + newElo1b + "</b> (" + (isTeam1Win ? "+" : "") + delta + ")\n" +
              "• " + cleanHtml(m.team2NamesArr[0]) + ": <b>" + newElo2a + "</b> (" + (!isTeam1Win ? "+" : "-") + delta + ")\n" +
              "• " + cleanHtml(m.team2NamesArr[1]) + ": <b>" + newElo2b + "</b> (" + (!isTeam1Win ? "+" : "-") + delta + ")</blockquote>"
            );
          });
        }).catch(function(e) { customAlert("Ошибка сохранения: " + e.message); });
      });
    }
  });
}

function rejectMatch(matchId) { 
  db.collection('pending_matches').doc(matchId).delete().then(function() { 
    document.getElementById('pending-matches-container').innerHTML = ''; 
  }).catch(function(e) {}); 
}

function listenRecentMatches() {
  db.collection('matches_history').onSnapshot(function(snap) {
    try {
      var container = document.getElementById('recent-matches-container');
      if (!container) return;
      if (snap.empty) { container.innerHTML = ''; return; }
      
      var matches = [];
      snap.forEach(function(doc) { matches.push(doc.data()); });
      matches.sort(function(a, b) { return parseTime(b.timestamp) - parseTime(a.timestamp); });
      matches = matches.slice(0, 5);

      var html = '<div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin: 4px 0 8px 4px; text-transform: uppercase; letter-spacing: 0.5px;">Последние матчи:</div>';
      
      matches.forEach(function(m) {
        var isDoubles = m.type === 'doubles';
        var s1 = isDoubles ? m.team1Score : m.p1Score;
        var s2 = isDoubles ? m.team2Score : m.p2Score;
        var isP1Win = s1 > s2;
        var isP2Win = s2 > s1;
        var p1Color = isP1Win ? 'color: #10b981;' : '';
        var p2Color = isP2Win ? 'color: #10b981;' : '';
        
        var d = new Date(parseTime(m.timestamp));
        var day = ('0' + d.getDate()).slice(-2);
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var hours = ('0' + d.getHours()).slice(-2);
        var minutes = ('0' + d.getMinutes()).slice(-2);
        var timeStr = day + '.' + month + ' ' + hours + ':' + minutes;
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

        html += '<div style="background: var(--list-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; font-size: 13px; margin-bottom: 6px;">' +
                  '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                    '<div style="display:flex; flex:1; justify-content: flex-end; overflow: hidden;">' + leftSideHtml + '</div>' +
                    '<div style="font-weight: 800; font-size: 14px; background: var(--row-bg); border-radius: 6px; padding: 2px 8px; margin: 0 10px; white-space: nowrap;">' + s1 + ' : ' + s2 + '</div>' +
                    '<div style="display:flex; flex:1; justify-content: flex-start; overflow: hidden;">' + rightSideHtml + '</div>' +
                  '</div>' +
                  '<div style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 4px;">' + badgeHtml + timeStr + '</div>' +
                '</div>';
      });
      container.innerHTML = html;
    } catch(e) {}
  }, function(err) {});
}
