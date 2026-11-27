// js/street.js — Вкладка "Улица" в Радаре: карта Leaflet, точки с 2ГИС, чекины и вызовы

(function() {
  var DEFAULT_STREET_SPOTS = [
    { id: 'street_70030076975354402', name: 'Стол • Калининский р-н #1', district: 'Калининский', desc: 'Уличный стол (2ГИС)', lat: 55.186104, lng: 61.438791, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076975354402' },
    { id: 'street_70030076975354407', name: 'Стол • Калининский р-н #2', district: 'Калининский', desc: 'Уличный стол (2ГИС)', lat: 55.186489, lng: 61.440128, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076975354407' },
    { id: 'street_70030076975354425', name: 'Стол • Калининский р-н #3', district: 'Калининский', desc: 'Есть фото в 2ГИС', lat: 55.184164, lng: 61.434646, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076975354425' },
    { id: 'street_70030077123730606', name: 'Стол • Калининский р-н #4', district: 'Калининский', desc: 'Уличный стол (2ГИС)', lat: 55.185055, lng: 61.423474, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077123730606' },
    { id: 'street_70030077122840060', name: 'Стол • Тракторозаводский #1', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.183317, lng: 61.443298, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077122840060' },
    { id: 'street_70030077182935584', name: 'Стол • Тракторозаводский #2', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.183997, lng: 61.449800, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077182935584' },
    { id: 'street_70030077012543226', name: 'Стол • Тракторозаводский #3', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.182837, lng: 61.446613, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077012543226' },
    { id: 'street_70030077012543225', name: 'Стол • Тракторозаводский #4', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.182569, lng: 61.446889, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077012543225' },
    { id: 'street_70030077124307990', name: 'Стол • Тракторозаводский #5', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.180347, lng: 61.439438, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077124307990' },
    { id: 'street_70030077109966668', name: 'Стол • Тракторозаводский #6', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.181230, lng: 61.451636, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077109966668' },
    { id: 'street_70030076990884001', name: 'Стол • Тракторозаводский #7', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.178711, lng: 61.435874, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076990884001' },
    { id: 'street_70030077109502050', name: 'Стол • Первоозёрный пос.', district: 'Тракторозаводский', desc: 'пос. Первоозёрный (2ГИС)', lat: 55.197763, lng: 61.475055, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077109502050' },
    { id: 'street_70030077007081154', name: 'Стол • Тракторозаводский #8', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.178133, lng: 61.443425, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077007081154' },
    { id: 'street_70030077183794085', name: 'Стол • Тракторозаводский #9', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.180710, lng: 61.456587, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077183794085' },
    { id: 'street_70030077007081150', name: 'Стол • Тракторозаводский #10', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.177428, lng: 61.442102, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077007081150' },
    { id: 'street_70030077125174089', name: 'Стол • Тракторозаводский #11', district: 'Тракторозаводский', desc: 'Отзыв 5★ + фото в 2ГИС', lat: 55.178107, lng: 61.454441, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077125174089' },
    { id: 'street_70030077200179721', name: 'Стол • Тракторозаводский #12', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.177112, lng: 61.423856, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077200179721' },
    { id: 'street_70030077011352690', name: 'Стол • Тракторозаводский #13', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.175331, lng: 61.431658, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077011352690' },
    { id: 'street_70030076950206676', name: 'Стол • Тракторозаводский #14', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.180766, lng: 61.465086, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076950206676' },
    { id: 'street_70030077182028058', name: 'Стол • Тракторозаводский #15', district: 'Тракторозаводский', desc: 'Уличный стол (2ГИС)', lat: 55.174767, lng: 61.448812, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030077182028058' },
    { id: 'street_70030076249991410', name: 'Стол для настольного тенниса', district: 'Тракторозаводский', desc: 'Есть фото в 2ГИС', lat: 55.178304, lng: 61.463356, gisUrl: 'https://2gis.ru/chelyabinsk/geo/70030076249991410' }
  ];

  var customStreetSpots = [];
  var streetPresenceMap = {};
  var activeDistrict = 'Все';
  var streetMap = null;
  var streetMarkersLayer = null;
  var streetMarkersById = {};
  var currentRadarMode = 'clubs';

  function getMergedSpots() {
    var byId = {};
    var list = [];
    DEFAULT_STREET_SPOTS.forEach(function(s) {
      byId[s.id] = s;
      list.push(s);
    });
    customStreetSpots.forEach(function(s) {
      if (!s || !s.id) return;
      if (byId[s.id]) {
        var idx = list.indexOf(byId[s.id]);
        if (idx !== -1) list[idx] = s;
      } else {
        list.push(s);
      }
      byId[s.id] = s;
    });
    return list;
  }

  window.getStreetSpotById = function(id) {
    if (!id) return null;
    var all = getMergedSpots();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  };

  window.getRadarLocTitle = function(loc) {
    if (typeof LOCATION_NAMES !== 'undefined' && LOCATION_NAMES[loc]) return LOCATION_NAMES[loc];
    if (typeof LOCATIONS !== 'undefined' && LOCATIONS[loc]) return LOCATIONS[loc].name;
    var spot = window.getStreetSpotById(loc);
    return spot ? (spot.name + ' (' + spot.district + ')') : loc;
  };

  window.switchRadarMode = function(mode) {
    currentRadarMode = mode === 'street' ? 'street' : 'clubs';
    var btnClubs = document.getElementById('radar-tab-btn-clubs');
    var btnStreet = document.getElementById('radar-tab-btn-street');
    var clubsEl = document.getElementById('radar-clubs-content');
    var streetEl = document.getElementById('radar-street-content');

    if (btnClubs) btnClubs.classList.toggle('active', currentRadarMode === 'clubs');
    if (btnStreet) btnStreet.classList.toggle('active', currentRadarMode === 'street');
    if (clubsEl) clubsEl.style.display = currentRadarMode === 'clubs' ? 'flex' : 'none';
    if (streetEl) streetEl.style.display = currentRadarMode === 'street' ? 'flex' : 'none';

    if (typeof vibrate === 'function') vibrate('light');
    if (currentRadarMode === 'street') {
      initStreetMap();
      renderStreetSection();
      setTimeout(function() {
        if (streetMap) streetMap.invalidateSize();
      }, 120);
    }
  };

  function initStreetMap() {
    var mapEl = document.getElementById('street-map');
    if (!mapEl || streetMap || typeof L === 'undefined') return;
    streetMap = L.map(mapEl, {
      center: [55.1815, 61.4455],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(streetMap);
    streetMarkersLayer = L.layerGroup().addTo(streetMap);
  }

  function renderStreetMapMarkers(spots) {
    if (!streetMap || !streetMarkersLayer || typeof L === 'undefined') return;
    streetMarkersLayer.clearLayers();
    streetMarkersById = {};

    spots.forEach(function(spot) {
      if (!spot.lat || !spot.lng) return;
      var st = streetPresenceMap[spot.id] || { players: [], plans: [] };
      var count = (st.players || []).length;
      var plansCount = (st.plans || []).length;
      var isBusy = count > 0 || plansCount > 0;

      var marker = L.circleMarker([spot.lat, spot.lng], {
        radius: isBusy ? 9 : 7,
        color: isBusy ? '#ffffff' : '#0f172a',
        weight: 2,
        fillColor: count > 0 ? '#10b981' : (plansCount > 0 ? '#f59e0b' : '#38bdf8'),
        fillOpacity: 0.92
      });

      var popupHtml =
        '<div style="min-width:170px; font-family:Inter,sans-serif;">' +
          '<div style="font-weight:800; font-size:13px; margin-bottom:2px;">' + cleanHtml(spot.name) + '</div>' +
          '<div style="font-size:11px; color:#64748b; margin-bottom:6px;">' + cleanHtml(spot.district) + ' р-н • Сейчас: <b>' + count + '</b></div>' +
          '<div style="display:flex; gap:6px;">' +
            '<button onclick="focusStreetCard(\'' + escapeJS(spot.id) + '\')" style="flex:1; padding:5px 8px; border:none; border-radius:6px; background:#10b981; color:#fff; font-weight:700; font-size:11px; cursor:pointer;">К столу</button>' +
            (spot.gisUrl ? '<a href="' + cleanHtml(spot.gisUrl) + '" target="_blank" rel="noopener" style="padding:5px 8px; border-radius:6px; background:#0f172a; color:#fff; font-weight:700; font-size:11px; text-decoration:none;">2ГИС</a>' : '') +
          '</div>' +
        '</div>';

      marker.bindPopup(popupHtml);
      marker.addTo(streetMarkersLayer);
      streetMarkersById[spot.id] = marker;
    });
  }

  window.focusStreetMapSpot = function(spotId) {
    var spot = window.getStreetSpotById(spotId);
    if (!spot) return;
    initStreetMap();
    if (streetMap && spot.lat && spot.lng) {
      streetMap.setView([spot.lat, spot.lng], 16, { animate: true });
      var m = streetMarkersById[spotId];
      if (m) m.openPopup();
      var mapEl = document.getElementById('street-map');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  window.focusStreetCard = function(spotId) {
    var card = document.getElementById('street-card-' + spotId);
    if (!card) return;
    card.classList.add('expanded');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.setStreetDistrictFilter = function(district) {
    activeDistrict = district || 'Все';
    if (typeof vibrate === 'function') vibrate('light');
    renderStreetSection();
  };

  window.toggleStreetCard = function(spotId) {
    var card = document.getElementById('street-card-' + spotId);
    if (card) card.classList.toggle('expanded');
    if (typeof vibrate === 'function') vibrate('light');
  };

  function renderStreetSection() {
    var allSpots = getMergedSpots();
    var districts = ['Все'];
    allSpots.forEach(function(s) {
      if (s.district && districts.indexOf(s.district) === -1) districts.push(s.district);
    });

    var filterBox = document.getElementById('street-district-filters');
    if (filterBox) {
      filterBox.innerHTML = districts.map(function(d) {
        var isAct = d === activeDistrict;
        return '<button class="street-district-pill ' + (isAct ? 'active' : '') + '" onclick="setStreetDistrictFilter(\'' + escapeJS(d) + '\')">' + cleanHtml(d) + '</button>';
      }).join('');
    }

    var filtered = activeDistrict === 'Все'
      ? allSpots
      : allSpots.filter(function(s) { return s.district === activeDistrict; });

    // Сортируем: сначала столы, где кто-то есть или планирует
    filtered = filtered.slice().sort(function(a, b) {
      var stA = streetPresenceMap[a.id] || { players: [], plans: [] };
      var stB = streetPresenceMap[b.id] || { players: [], plans: [] };
      var scoreA = (stA.players || []).length * 10 + (stA.plans || []).length;
      var scoreB = (stB.players || []).length * 10 + (stB.plans || []).length;
      return scoreB - scoreA;
    });

    renderStreetMapMarkers(filtered);

    var countEl = document.getElementById('street-spots-count');
    if (countEl) countEl.innerText = filtered.length + ' шт.';

    var listEl = document.getElementById('street-spots-list');
    if (!listEl) return;

    var myUid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    var html = '';

    filtered.forEach(function(spot) {
      var prevCard = document.getElementById('street-card-' + spot.id);
      var wasExpanded = prevCard && prevCard.classList.contains('expanded');
      var st = streetPresenceMap[spot.id] || { players: [], plans: [] };
      var players = st.players || [];
      var plans = st.plans || [];
      var count = players.length;

      var amIHere = false;
      var playersHtml = '';
      if (count === 0) {
        playersHtml = '<span class="empty-note">У стола пока свободно</span>';
      } else {
        players.forEach(function(p) {
          var pUid = p.uid || '';
          if (myUid && pUid === myUid) amIHere = true;
          var tStr = typeof formatDuration === 'function' ? formatDuration(p.time) : '';
          playersHtml += '<div class="player-row"><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(pUid) + '\')">' + cleanHtml(p.name || 'Игрок') + '</span><span style="font-size:11px; color:var(--text-muted);">' + tStr + '</span></div>';
        });
      }

      var amIPlanning = false;
      var plansHtml = '';
      if (plans.length === 0) {
        plansHtml = '<span class="empty-note">Никто не планировал</span>';
      } else {
        plans.forEach(function(pl) {
          var plUid = pl.uid || '';
          if (myUid && plUid === myUid) amIPlanning = true;
          var untilStr = typeof formatUntil === 'function' ? formatUntil(pl.planTime) : '';
          plansHtml += '<div class="player-row"><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(plUid) + '\')">' + cleanHtml(pl.name || 'Игрок') + '</span><span style="font-size:11px; color:var(--accent-amber);">' + untilStr + '</span></div>';
        });
      }

      var joinBtn = amIHere
        ? '<button class="btn btn-leave" onclick="streetLeave(\'' + escapeJS(spot.id) + '\')">Освободить стол</button>'
        : '<button class="btn btn-join" onclick="streetCheckIn(\'' + escapeJS(spot.id) + '\')">Я уже у стола</button>';

      var planBtn = amIPlanning
        ? '<button class="btn btn-leave" onclick="cancelPlan(\'' + escapeJS(spot.id) + '\')">Отменить план</button>'
        : '<button class="btn btn-plan" onclick="handlePlanClick(\'' + escapeJS(spot.id) + '\')">Буду позже...</button>';

      var badgeCls = count > 0 ? 'counter active' : 'counter';
      var suf = typeof getPlayersCountSuffix === 'function' ? getPlayersCountSuffix(count) : 'игроков';

      html +=
        '<div class="card street-spot-card' + (wasExpanded ? ' expanded' : '') + '" id="street-card-' + cleanHtml(spot.id) + '">' +
          '<div class="card-top" onclick="toggleStreetCard(\'' + escapeJS(spot.id) + '\')">' +
            '<div style="min-width:0; flex:1;">' +
              '<div class="card-title" style="font-size:14px;">' + cleanHtml(spot.name) + '</div>' +
              '<div class="card-desc">' + cleanHtml(spot.district) + ' р-н • ' + cleanHtml(spot.desc || 'Уличный стол') + '</div>' +
            '</div>' +
            '<span class="' + badgeCls + '">' + count + ' ' + suf + '</span>' +
          '</div>' +
          '<div class="street-quick-links">' +
            '<button class="btn-plan street-mini-btn" onclick="focusStreetMapSpot(\'' + escapeJS(spot.id) + '\')">На карте</button>' +
            (spot.gisUrl ? '<a class="btn-plan street-mini-btn" href="' + cleanHtml(spot.gisUrl) + '" target="_blank" rel="noopener">Открыть в 2ГИС</a>' : '') +
            '<button class="btn-plan street-mini-btn" onclick="inviteToStreetSpot(\'' + escapeJS(spot.id) + '\')">Позвать играть</button>' +
          '</div>' +
          '<div class="card-collapse-wrapper">' +
            '<div class="card-body-collapse">' +
              '<div class="card-body-inner">' +
                '<div class="section-label">Сейчас играют:</div>' +
                '<div class="player-list">' + playersHtml + '</div>' +
                '<div class="section-label">Собираются прийти:</div>' +
                '<div class="player-list">' + plansHtml + '</div>' +
                '<div class="action-group">' + joinBtn + planBtn + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    listEl.innerHTML = html || '<span class="empty-note">В этом районе пока нет столов</span>';
  }

  window.streetCheckIn = function(spotId) {
    var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    if (!uid || typeof currentUserProfile === 'undefined' || !currentUserProfile) {
      if (typeof customAlert === 'function') customAlert('Сначала авторизуйтесь в клубе!');
      return;
    }
    if (window.isTableActionRunning) return;
    window.isTableActionRunning = true;

    var spot = window.getStreetSpotById(spotId);
    var now = Date.now();
    var finalList = [];

    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(spotId)).then(function(doc) {
        var tP = doc.exists ? (doc.data().players || []) : [];
        var tPl = doc.exists ? (doc.data().plans || []) : [];
        var fFn = function(p) { return (p.uid || p) !== uid; };
        tP = tP.filter(fFn);
        tPl = tPl.filter(fFn);
        tP.unshift({
          name: currentUserProfile.name || 'Игрок',
          time: now,
          uid: uid,
          avatarSvg: currentUserProfile.avatarSvg || '',
          maxLimitMs: (typeof DEFAULT_LIMIT_MS !== 'undefined' ? DEFAULT_LIMIT_MS : 7200000)
        });
        finalList = tP;
        t.set(db.collection('locations').doc(spotId), { players: tP, plans: tPl }, { merge: true });
      });
    }).then(function() {
      if (typeof vibrate === 'function') vibrate('medium');
      if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_checkin_' + spotId + '_' + uid)) {
        var label = spot ? (spot.name + ' (' + spot.district + ' р-н)') : spotId;
        var linkLine = (spot && spot.gisUrl) ? ('\n📍 2ГИС: ' + spot.gisUrl) : '';
        if (typeof sendTelegramAlert === 'function') {
          sendTelegramAlert('🏓 игрок <b>' + cleanHtml(currentUserProfile.name || 'Игрок') + '</b> уже у уличного стола <b>' + cleanHtml(label) + '</b>!' + linkLine + '\n\nКто составит компанию?');
        }
      }
      window.isTableActionRunning = false;
    }).catch(function() {
      window.isTableActionRunning = false;
    });
  };

  window.streetLeave = function(spotId) {
    var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    if (!uid) return;
    if (window.isTableActionRunning) return;
    window.isTableActionRunning = true;

    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(spotId)).then(function(doc) {
        if (!doc.exists) return;
        var p = (doc.data().players || []).filter(function(pl) { return (pl.uid || pl) !== uid; });
        t.set(db.collection('locations').doc(spotId), { players: p }, { merge: true });
      });
    }).then(function() {
      if (typeof vibrate === 'function') vibrate('light');
      window.isTableActionRunning = false;
    }).catch(function() {
      window.isTableActionRunning = false;
    });
  };

  window.inviteToStreetSpot = function(spotId) {
    var spot = window.getStreetSpotById(spotId);
    if (!spot) return;
    var selectEl = document.getElementById('challenge-loc-select');
    if (selectEl) {
      var existing = selectEl.querySelector('option[value="' + spotId + '"]');
      if (!existing) {
        var opt = document.createElement('option');
        opt.value = spotId;
        opt.textContent = '🌳 ' + spot.name + ' (' + spot.district + ')';
        selectEl.appendChild(opt);
      }
      selectEl.value = spotId;
    }
    if (typeof openChallengeModal === 'function') openChallengeModal();
  };

  window.openStreetSpotModal = function() {
    if (typeof isSuperAdmin === 'function' && !isSuperAdmin()) return;
    if (typeof openModalSmoothly === 'function') openModalSmoothly('street-spot-modal');
  };

  window.saveStreetSpot = function() {
    if (typeof isSuperAdmin === 'function' && !isSuperAdmin()) return;
    var name = (document.getElementById('street-spot-name').value || '').trim();
    var district = (document.getElementById('street-spot-district').value || '').trim() || 'Челябинск';
    var desc = (document.getElementById('street-spot-desc').value || '').trim() || 'Уличный стол';
    var gisUrl = (document.getElementById('street-spot-gis').value || '').trim();
    var lat = parseFloat(document.getElementById('street-spot-lat').value);
    var lng = parseFloat(document.getElementById('street-spot-lng').value);

    // Автоизвлечение координат из ссылки 2ГИС вида .../geo/ID/61.438791%2C55.186104
    if ((isNaN(lat) || isNaN(lng)) && gisUrl) {
      var decoded = decodeURIComponent(gisUrl);
      var m = decoded.match(/(\d{2}\.\d+),\s*(\d{2}\.\d+)/);
      if (m) {
        var v1 = parseFloat(m[1]), v2 = parseFloat(m[2]);
        if (v1 > 58 && v2 < 58) { lng = v1; lat = v2; }
        else { lat = v1; lng = v2; }
      }
    }

    if (!name || isNaN(lat) || isNaN(lng)) {
      if (typeof customAlert === 'function') customAlert('Укажите название и координаты (или вставьте ссылку 2ГИС с координатами).');
      return;
    }

    var id = 'street_' + Date.now();
    db.collection('street_spots').doc(id).set({
      id: id,
      name: name,
      district: district,
      desc: desc,
      lat: lat,
      lng: lng,
      gisUrl: gisUrl,
      createdAt: Date.now()
    }).then(function() {
      if (typeof closeModalSmoothly === 'function') closeModalSmoothly('street-spot-modal');
      ['street-spot-name', 'street-spot-desc', 'street-spot-gis', 'street-spot-lat', 'street-spot-lng'].forEach(function(fid) {
        var el = document.getElementById(fid);
        if (el) el.value = '';
      });
      if (typeof customAlert === 'function') customAlert('✅ Уличный стол добавлен на карту!');
    }).catch(function(e) {
      if (typeof customAlert === 'function') customAlert('Ошибка сохранения: ' + e.message);
    });
  };

  function startStreetListeners() {
    if (typeof db === 'undefined') return;
    db.collection('street_spots').onSnapshot(function(snap) {
      var list = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        if (d) { d.id = d.id || doc.id; list.push(d); }
      });
      customStreetSpots = list;
      if (currentRadarMode === 'street') renderStreetSection();
    }, function() {});

    db.collection('locations').onSnapshot(function(snap) {
      var nextMap = {};
      snap.forEach(function(doc) {
        if (doc.id && doc.id.indexOf('street_') === 0) {
          nextMap[doc.id] = doc.data() || { players: [], plans: [] };
        }
      });
      streetPresenceMap = nextMap;
      if (currentRadarMode === 'street') renderStreetSection();
    }, function() {});
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startStreetListeners, 700);
  });
})();
