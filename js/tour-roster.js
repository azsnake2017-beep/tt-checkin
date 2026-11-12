// ==========================================
// УПРАВЛЕНИЕ СОСТАВОМ ТУРНИРА: ИГРОКИ КЛУБА (АДМИНКА)
// Подключается ПОСЛЕ js/app.js и переопределяет окно управления составом,
// добавляя возможность выбирать игроков из списка клуба (не только гостей).
// ==========================================

// Открытие окна управления составом (переопределяет версию из app.js):
// + отписка от старого слушателя и подгрузка списка игроков клуба
window.openTourPlayersModal = function(tourId) {
    if (typeof vibrate === 'function') vibrate('light');
    document.getElementById('manage-tour-id').value = tourId;
    openModalSmoothly('tour-players-modal');

    // Отписываемся от предыдущего слушателя, чтобы не плодить дубли при повторном открытии
    if (typeof window.tourPlayersUnsubscribe === 'function') {
        window.tourPlayersUnsubscribe();
        window.tourPlayersUnsubscribe = null;
    }

    // Подгружаем список игроков клуба для быстрого добавления в состав
    var sel = document.getElementById('tour-club-player-select');
    if (sel) sel.innerHTML = '<option value="">Загрузка списка игроков...</option>';
    db.collection('users').get().then(function(snap) {
        var clubPlayers = [];
        snap.forEach(function(uDoc) {
            var d = uDoc.data() || {};
            if (uDoc.id.match(/^(tg|google)_/) || d.isVerified) {
                clubPlayers.push({ uid: uDoc.id, name: d.name || 'Игрок', elo: parseInt(d.elo, 10) || 1000 });
            }
        });
        clubPlayers.sort(function(a, b) { return a.name.localeCompare(b.name, 'ru'); });
        window.tourClubPlayersCache = clubPlayers;
        db.collection('tournaments').doc(tourId).get().then(function(doc) {
            renderTourClubSelect(doc.exists ? (doc.data().participants || []) : []);
        });
    }).catch(function(e) {
        if (sel) sel.innerHTML = '<option value="">(Не удалось загрузить список)</option>';
    });

    // Слушаем список участников в реальном времени
    window.tourPlayersUnsubscribe = db.collection('tournaments').doc(tourId).onSnapshot(function(doc) {
        if (!doc.exists) return;
        var parts = doc.data().participants || [];
        var listEl = document.getElementById('tour-players-list');
        if (!listEl) return;

        var html = '';
        parts.forEach(function(p) {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; background: var(--list-bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--card-border);">' +
                    '<span style="font-size: 14px; font-weight: bold; color: #fff;">' + cleanHtml(p.name) + '</span>' +
                    '<button class="btn-info" style="background: var(--accent-red); color: #fff; width: auto; height: auto; padding: 4px 10px; border-radius: 4px; border: none; font-weight: bold;" onclick="removePlayerFromTour(\''+escapeJS(tourId)+'\', \''+escapeJS(p.uid)+'\')">Удалить</button>' +
                    '</div>';
        });
        listEl.innerHTML = html || '<span class="empty-note">Пока никто не записался</span>';

        // Обновляем выпадающий список клуба (исключаем уже добавленных)
        renderTourClubSelect(parts);
    });
};

window.closeTourPlayersModal = function() {
    if (typeof window.tourPlayersUnsubscribe === 'function') {
        window.tourPlayersUnsubscribe();
        window.tourPlayersUnsubscribe = null;
    }
    if(typeof closeModalSmoothly === 'function') closeModalSmoothly('tour-players-modal');
};

// Обновление выпадающего списка игроков клуба (показываем только тех, кого еще нет в составе)
function renderTourClubSelect(parts) {
    var sel = document.getElementById('tour-club-player-select');
    if (!sel) return;
    var cache = window.tourClubPlayersCache || [];
    var html = '<option value="">-- Выберите игрока клуба --</option>';
    var available = 0;
    cache.forEach(function(p) {
        var alreadyIn = false;
        (parts || []).forEach(function(tp) { if (tp.uid === p.uid) alreadyIn = true; });
        if (!alreadyIn) {
            html += '<option value="' + escapeJS(p.uid) + '">' + cleanHtml(p.name) + ' (' + (parseInt(p.elo, 10) || 1000) + ')</option>';
            available++;
        }
    });
    if (available === 0) html = '<option value="">(Все игроки клуба уже в составе)</option>';
    sel.innerHTML = html;
}

// Добавление игрока клуба из выпадающего списка (с настоящим uid и реальным Эло)
window.addClubPlayerToTour = function() {
    if (!isSuperAdmin()) return;
    var tourId = document.getElementById('manage-tour-id').value;
    var sel = document.getElementById('tour-club-player-select');
    var uid = sel ? sel.value : '';
    if (!tourId || !uid) return customAlert("Выберите игрока из списка клуба!");

    var player = null;
    var cache = window.tourClubPlayersCache || [];
    for (var i = 0; i < cache.length; i++) {
        if (cache[i].uid === uid) { player = cache[i]; break; }
    }
    if (!player) return customAlert("Игрок не найден в списке, обновите окно.");

    if (typeof vibrate === 'function') vibrate('light');

    var ref = db.collection('tournaments').doc(tourId);
    db.runTransaction(function(t) {
        return t.get(ref).then(function(doc) {
            if (!doc.exists) return;
            // Состав можно менять только до старта турнира
            if (doc.data().status && doc.data().status !== 'registration') return;
            var parts = doc.data().participants || [];
            for (var j = 0; j < parts.length; j++) {
                if (parts[j].uid === uid) return; // Уже в составе
            }
            parts.push({ uid: player.uid, name: player.name, elo: player.elo });
            t.update(ref, { participants: parts });
        });
    }).catch(function(e) { console.error("Ошибка добавления игрока клуба", e); });
};
