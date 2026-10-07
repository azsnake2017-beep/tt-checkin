// ==========================================
// js/arcade.js — 3D Аркадный Пинг-Понг (Полная версия с кнопкой и наградой)
// ==========================================

window.arcadeGameInitialized = false;
window.isArcadeGameRunning = false;

function initArcadeGame() {
    if (typeof THREE === 'undefined') {
        setTimeout(initArcadeGame, 100);
        return;
    }

    if (window.arcadeGameInitialized) {
        window.arcadeActive = true;
        if (window.isArcadeGameRunning && typeof window.resumeArcade === 'function') {
            window.resumeArcade();
        }
        return;
    }
    
    window.arcadeGameInitialized = true;
    window.arcadeActive = true;

    // ВЫДАЧА НАГРАДЫ (Связь с базой данных)
    function rewardPlayer() {
        var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
        if (!uid || typeof db === 'undefined') return;

        var ref = db.collection('users').doc(uid);
        ref.get().then(function(doc) {
            if (doc.exists) {
                var data = doc.data();
                if (!data.arcadeRewardClaimed) {
                    var currentElo = parseInt(data.elo, 10) || 1000;
                    ref.update({
                        elo: currentElo + 50,
                        arcadeRewardClaimed: true
                    }).then(function() {
                        if (typeof currentUserProfile !== 'undefined') {
                            currentUserProfile.elo = currentElo + 50;
                            currentUserProfile.arcadeRewardClaimed = true;
                        }
                        if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
                        setTimeout(() => {
                            if (typeof customAlert === 'function') {
                                customAlert("🎉 <b>ОТЛИЧНАЯ ИГРА!</b><br><br>Вы впервые одолели Робо-Бро! Вам начислен стартовый бонус <b style='color:#10b981;'>+50 Эло</b> в клубный рейтинг!");
                            }
                        }, 1000);
                    });
                }
            }
        });
    }

    // Тексты для ИИ и интерфейса
    const JOKES = {
        miss: ["Мазила!", "Очки купи!", "Глаз-алмаз (нет)", "Мимо!"],
        hit: ["Хорош!", "Найс!", "Хрясь!", "Получай!"],
        aiNames: ["Робо-Бро", "Скайнет", "Калькулятор", "Тостер"]
    };
    const BOT_WIN = ["Легкотня!", "Мешок!", "Роботы рулят!", "Получай!"];
    const BOT_LOSE = ["Черт!", "Лаки!", "Баг системы!", "Я поддавался!"];
    const SPECTATOR_PHRASES = [
        "Слыш, а мячик на пиво меняешь?", "Давай, я на робота ставил!", "Ты меня уважаешь? А робота?", 
        "Хорош махать, пошли покурим.", "Да я в юности также лупил!", "Ногами, ногами работай!", 
        "Эх, молодежь...", "Я в 70-х мастера взял!", "Раньше ракетки из фанеры были!", "Топ-спин крути, дубина!"
    ];

    let currentDifficulty = 1; 
    const DIFF_LEVELS = [
        { name: "ЛЕГКО", aiLerp: 4, aiMissChance: 0.50, flightTime: 0.75, aiAim: 0.5 },
        { name: "НОРМА", aiLerp: 8, aiMissChance: 0.30, flightTime: 0.55, aiAim: 0.85 },
        { name: "ХАРДКОР", aiLerp: 14, aiMissChance: 0.15, flightTime: 0.33, aiAim: 1.05 }
    ];

    document.getElementById('diff-btn').addEventListener('click', () => {
        currentDifficulty = (currentDifficulty + 1) % 3;
        document.getElementById('diff-btn').textContent = "СЛОЖНОСТЬ: " + DIFF_LEVELS[currentDifficulty].name;
        const colors = ['#4ade80', '#facc15', '#ef4444'];
        document.getElementById('diff-btn').style.backgroundColor = colors[currentDifficulty];
    });

    function setBanner(text) { document.getElementById('joke-banner').textContent = text; }

    function showBotPhrase(botWon) {
        const arr = botWon ? BOT_WIN : BOT_LOSE;
        const bubble = document.getElementById('bot-bubble');
        bubble.textContent = arr[Math.floor(Math.random() * arr.length)];
        bubble.style.display = 'block';
        setTimeout(() => bubble.style.display = 'none', 2000);
    }

    class RetroSound {
        constructor() { this.ctx = null; this.enabled = true; }
        init() {
            if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') this.ctx.resume();
        }
        playTone(freq, type, duration, vol, slideTo = null) {
            if (!this.enabled || !this.ctx) return;
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, t);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
            gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(t); osc.stop(t + duration);
        }
        hit() { this.playTone(600, 'square', 0.15, 0.1, 150); }
        bounce() { this.playTone(300, 'triangle', 0.1, 0.2, 500); }
        score() { this.playTone(400, 'square', 0.3, 0.1, 800); }
        fail() { this.playTone(200, 'sawtooth', 0.5, 0.1, 50); }
    }
    const sound = new RetroSound();

    document.getElementById('sound-btn').addEventListener('click', () => {
        sound.init(); sound.enabled = !sound.enabled;
        document.getElementById('sound-btn').textContent = sound.enabled ? '🔊' : '🔇';
    });

    function spawnVFX(type) {
        const words = type === 'hit' ? ['BAM!', 'POW!', 'SMASH!'] : ['OOPS!', 'FAIL!'];
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.fontFamily = "'Bangers', cursive";
        el.style.fontSize = "4rem";
        el.style.WebkitTextStroke = "3px black";
        el.style.textShadow = "4px 4px 0px #000";
        el.style.pointerEvents = "none";
        el.style.zIndex = "50";
        el.style.animation = "pow-anim 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";
        el.textContent = words[Math.floor(Math.random() * words.length)];
        el.style.left = Math.random() * 40 + 30 + '%'; el.style.top = Math.random() * 40 + 30 + '%';
        el.style.color = type === 'hit' ? `hsl(${Math.random()*60 + 10}, 100%, 50%)` : '#94a3b8';
        document.getElementById('vfx-layer').appendChild(el);
        setTimeout(() => el.remove(), 600);
    }
    function vibrate(time) { if (navigator.vibrate) try { navigator.vibrate(time); } catch(e){} }

    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene(); scene.background = null; 

    // ОБЯЗАТЕЛЬНО используем ширину и высоту контейнера для пропорций!
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3.8); // Чуть дальше назад, чтобы стол и скамейка точно влезли в кадр
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6); dirLight.position.set(5, 10, 5); scene.add(dirLight);

    function addOutline(mesh) {
        const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
        mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));
    }

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshToonMaterial({ color: 0x4ade80 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; scene.add(ground);

    function createTree(x, z) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshToonMaterial({color: 0x78350f}));
        trunk.position.y = 0.25; addOutline(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 7), new THREE.MeshToonMaterial({color: 0x15803d}));
        leaves.position.y = 1.5; addOutline(leaves);
        group.add(trunk, leaves); group.position.set(x, -0.5, z); scene.add(group);
    }
    createTree(-4, -5); createTree(5, -6); createTree(-6, 2); createTree(6, 3);

    const benchGroup = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), new THREE.MeshToonMaterial({color: 0xa16207})); seat.position.y = 0.4;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), new THREE.MeshToonMaterial({color: 0xa16207})); back.position.set(0, 0.7, -0.25);
    addOutline(seat); addOutline(back); benchGroup.add(seat, back);
    // Скамейка сбоку от стола, чтобы попадать в кадр камеры
    benchGroup.position.set(-2.2, -0.5, 0.5); 
    benchGroup.rotation.y = Math.PI / 4; 
    scene.add(benchGroup);

    const silhouetteMat = new THREE.MeshToonMaterial({color: 0x1e293b});
    function createSilhouette() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6), silhouetteMat); body.position.y = 0.7;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), silhouetteMat); head.position.y = 1.1;
        addOutline(body); addOutline(head); group.add(body, head); return { group, head };
    }
    const spec1 = createSilhouette(); spec1.group.position.set(-0.5, 0, 0); benchGroup.add(spec1.group);
    const spec2 = createSilhouette(); spec2.group.position.set(0.5, 0, 0); benchGroup.add(spec2.group);

    let activeSpeaker = null; let spectatorTimer = 0;
    function updateSpectators(dt) {
        spectatorTimer -= dt;
        const uiBubble = document.getElementById('spectator-ui');
        if (spectatorTimer <= 0) {
            if (Math.random() > 0.4) {
                activeSpeaker = Math.random() > 0.5 ? spec1 : spec2;
                document.getElementById('spectator-text').textContent = SPECTATOR_PHRASES[Math.floor(Math.random() * SPECTATOR_PHRASES.length)];
                uiBubble.style.display = 'block'; spectatorTimer = 5 + Math.random() * 4;
            } else { activeSpeaker = null; uiBubble.style.display = 'none'; spectatorTimer = 3 + Math.random() * 3; }
        }
        if (activeSpeaker) {
            const headPos = new THREE.Vector3(); activeSpeaker.head.getWorldPosition(headPos); headPos.y += 0.4;
            headPos.project(camera);
            const targetX = (headPos.x * .5 + .5) * container.clientWidth; const targetY = (headPos.y * -.5 + .5) * container.clientHeight;
            uiBubble.style.left = `${targetX}px`; uiBubble.style.top = `${targetY}px`;
        }
    }

    const TABLE_W = 2.0; const TABLE_L = 3.0; const TABLE_H = 0.5;
    const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.1, TABLE_L), new THREE.MeshToonMaterial({ color: 0x0ea5e9 }));
    table.position.y = TABLE_H; addOutline(table); scene.add(table);

    const net = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W + 0.2, 0.2, 0.05), new THREE.MeshToonMaterial({ color: 0xf97316 }));
    net.position.set(0, TABLE_H + 0.15, 0); addOutline(net); scene.add(net);

    function createRealisticRacket() {
        const group = new THREE.Group();
        
        // Основание ракетки (лопасть)
        const bladeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32);
        const bladeMat = new THREE.MeshToonMaterial({ color: 0x854d0e }); // Деревянный торец
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotateX(Math.PI / 2);
        addOutline(blade);

        // Накладки (красная и черная сторона)
        const rubberGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.032, 32);
        const rubberRed = new THREE.Mesh(rubberGeo, new THREE.MeshToonMaterial({ color: 0xef4444 }));
        rubberRed.rotateX(Math.PI / 2);
        rubberRed.position.z = 0.002;

        const rubberBlack = new THREE.Mesh(rubberGeo, new THREE.MeshToonMaterial({ color: 0x111111 }));
        rubberBlack.rotateX(Math.PI / 2);
        rubberBlack.position.z = -0.002;

        // Ручка ракетки
        const handleGeo = new THREE.BoxGeometry(0.08, 0.35, 0.04);
        const handleMat = new THREE.MeshToonMaterial({ color: 0x78350f });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, -0.3, 0);
        addOutline(handle);

        group.add(blade, rubberRed, rubberBlack, handle);
        return group;
    }

    const paddlePlayer = createRealisticRacket(); const PLAYER_Z = TABLE_L / 2 + 0.2; 
    paddlePlayer.position.set(0, TABLE_H + 0.3, PLAYER_Z); scene.add(paddlePlayer);

    const paddleAi = createRealisticRacket(); const AI_Z = -TABLE_L / 2 - 0.2;
    paddleAi.position.set(0, TABLE_H + 0.3, AI_Z); scene.add(paddleAi);

    const BALL_RADIUS = 0.06;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 16, 16), new THREE.MeshToonMaterial({ color: 0xfef08a }));
    addOutline(ball); scene.add(ball);

    const trailMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
    const trailGeo = new THREE.BufferGeometry(); const MAX_TRAIL = 10;
    const trailPositions = new Float32Array(MAX_TRAIL * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailLine = new THREE.Line(trailGeo, trailMat); scene.add(trailLine);

    const GRAVITY = -12; 
    const state = {
        status: 'serve_wait', ball: new THREE.Vector3(0, TABLE_H + 0.5, PLAYER_Z - 0.2), vel: new THREE.Vector3(0, 0, 0),
        targetX: 0, targetY: TABLE_H + 0.3, aiTargetX: 0, aiTargetY: TABLE_H + 0.3,
        playerScore: 0, aiScore: 0, matchStartServer: 'player', serving: 'player'
    };

    document.getElementById('ai-name').textContent = JOKES.aiNames[Math.floor(Math.random()*JOKES.aiNames.length)];

    function updatePointer(clientX, clientY) {
        let rect = container.getBoundingClientRect();
        let nx = ((clientX - rect.left) / container.clientWidth)  * 2 - 1;
        let ny = -((clientY - rect.top) / container.clientHeight) * 2 + 1;
        state.targetX = nx * (TABLE_W * 1.2); state.targetY = TABLE_H + 0.2 + (ny + 1) * 0.4;
    }

    function tryServe() {
        if (state.status === 'serve_wait' && state.serving === 'player') {
            sound.init(); state.status = 'serve_toss'; state.vel.set(0, 4.5, 0); setBanner("ПОДБРОС!");
        }
    }

   container.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
    container.addEventListener('pointerdown', (e) => { updatePointer(e.clientX, e.clientY); tryServe(); });
    
    // Дополнительно страхуем тач-события для мобильных
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
            tryServe();
        }
    }, {passive: true});

    container.addEventListener('touchmove', (e) => { 
        if (e.touches.length > 0) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY); 
        }
    }, {passive: true});
    
   function performArcadeHit(isPlayer) {
        let isServe = (state.status === 'serve_toss' || state.status === 'serve_bounce');
        state.status = 'playing'; 
        let sign = isPlayer ? -1 : 1; 
        const diff = DIFF_LEVELS[currentDifficulty];
        
        let targetZ, targetX, targetY, time = diff.flightTime;

        if (isServe) {
            // Траектория для подачи: летит на сторону противника с отскоком
            targetZ = sign * (TABLE_L / 4 + Math.random() * (TABLE_L / 4));
            targetX = (Math.random() - 0.5) * (TABLE_W * 0.7);
            targetY = TABLE_H;
        } else {
            // Обычный игровой удар
            targetZ = sign * (TABLE_L / 4 + Math.random() * (TABLE_L / 4));
            let aimWidth = isPlayer ? 0.85 : diff.aiAim;
            targetX = (Math.random() - 0.5) * (TABLE_W * aimWidth);
            targetY = TABLE_H; 
            if (!isPlayer) time *= (0.9 + Math.random() * 0.2);
        }
        
        state.vel.x = (targetX - state.ball.x) / time;
        state.vel.z = (targetZ - state.ball.z) / time;
        state.vel.y = (targetY - state.ball.y - 0.5 * GRAVITY * time * time) / time;

        sound.hit(); 
        vibrate(30); 
        spawnVFX('hit'); 
        setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]);
    }

    function checkWinCondition() {
        if (state.playerScore >= 11 && (state.playerScore - state.aiScore) >= 2) {
            setTimeout(() => { showModal(true); rewardPlayer(); }, 1000); return true;
        }
        if (state.aiScore >= 11 && (state.aiScore - state.playerScore) >= 2) {
            setTimeout(() => showModal(false), 1000); return true;
        }
        return false;
    }

    function scorePoint(winner) {
        if (state.status === 'scored') return;
        state.status = 'scored';
        
        if (winner === 'player') {
            state.playerScore++; document.getElementById('player-score').textContent = state.playerScore;
            sound.score(); setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]); showBotPhrase(false);
        } else {
            state.aiScore++; document.getElementById('ai-score').textContent = state.aiScore;
            sound.fail(); spawnVFX('miss'); setBanner(JOKES.miss[Math.floor(Math.random()*JOKES.miss.length)]); showBotPhrase(true);
        }

        if (!checkWinCondition()) {
            const total = state.playerScore + state.aiScore;
            if (state.playerScore >= 10 && state.aiScore >= 10) {
                state.serving = (total % 2 === 0) ? state.matchStartServer : (state.matchStartServer === 'player' ? 'ai' : 'player');
            } else {
                state.serving = (Math.floor(total / 2) % 2 === 0) ? state.matchStartServer : (state.matchStartServer === 'player' ? 'ai' : 'player');
            }
            setTimeout(resetBall, 1500);
        }
    }

    function resetBall() {
        state.status = 'serve_wait'; 
        state.vel.set(0,0,0);
        if (state.serving === 'player') {
            setBanner("КЛИКАЙ ПО ЭКРАНУ ДЛЯ ПОДАЧИ!");
        } else {
            setBanner("Подача Бота...");
            setTimeout(() => { 
                if(state.status === 'serve_wait') { 
                    state.status = 'serve_toss'; 
                    state.vel.set(0, 5, 0); 
                    setBanner("ПОДБРОС!"); 
                }
            }, 1000);
        }
    }

    const clock = new THREE.Clock();
    
    function animate() {
        if (!window.arcadeActive || !window.isArcadeGameRunning) return; 
        requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.05); updateSpectators(dt);

        paddlePlayer.position.x = THREE.MathUtils.lerp(paddlePlayer.position.x, state.targetX, 15 * dt);
        paddlePlayer.position.y = THREE.MathUtils.lerp(paddlePlayer.position.y, state.targetY, 15 * dt);
        paddlePlayer.rotation.z = THREE.MathUtils.lerp(paddlePlayer.rotation.z, state.targetX > 0 ? -0.3 : 0.3, 12 * dt);
        paddlePlayer.rotation.y = THREE.MathUtils.lerp(paddlePlayer.rotation.y, state.targetX > 0 ? -0.2 : 0.2, 12 * dt);
        paddlePlayer.rotation.x = THREE.MathUtils.lerp(paddlePlayer.rotation.x, (state.status === 'playing' && state.vel.z > 0) ? -0.4 : 0, 15 * dt);

        const aiLogic = DIFF_LEVELS[currentDifficulty];
        if (state.status === 'playing' && state.vel.z < 0) {
            state.aiTargetX = state.ball.x; state.aiTargetY = Math.max(TABLE_H + 0.2, state.ball.y);
        } else { state.aiTargetX = 0; state.aiTargetY = TABLE_H + 0.3; }
        
        paddleAi.position.x = THREE.MathUtils.lerp(paddleAi.position.x, state.aiTargetX, aiLogic.aiLerp * dt);
        paddleAi.position.y = THREE.MathUtils.lerp(paddleAi.position.y, state.aiTargetY, aiLogic.aiLerp * dt);
        paddleAi.rotation.z = THREE.MathUtils.lerp(paddleAi.rotation.z, state.aiTargetX > 0 ? -0.3 : 0.3, 10 * dt);
        paddleAi.rotation.x = THREE.MathUtils.lerp(paddleAi.rotation.x, (state.status === 'playing' && state.vel.z < 0) ? 0.4 : 0, 15 * dt);

        if (state.status === 'playing') {
            state.vel.y += GRAVITY * dt; state.ball.addScaledVector(state.vel, dt); ball.position.copy(state.ball);

            if (state.ball.y - BALL_RADIUS < TABLE_H && state.vel.y < 0) {
                if (Math.abs(state.ball.x) < TABLE_W/2 + 0.1 && Math.abs(state.ball.z) < TABLE_L/2 + 0.1) {
                    state.ball.y = TABLE_H + BALL_RADIUS; state.vel.y *= -0.8; sound.bounce(); vibrate(10);
                }
            }

            const HIT_RADIUS = 0.6;
            if (state.vel.z > 0 && state.ball.z > PLAYER_Z - 0.2) {
                let dist2D = Math.hypot(state.ball.x - paddlePlayer.position.x, state.ball.y - paddlePlayer.position.y);
                if (dist2D < HIT_RADIUS) { state.ball.z = PLAYER_Z - 0.2; performArcadeHit(true); } 
                else if (state.ball.z > PLAYER_Z + 0.5) scorePoint('ai');
            }

            if (state.vel.z < 0 && state.ball.z < AI_Z + 0.2) {
                let dist2D = Math.hypot(state.ball.x - paddleAi.position.x, state.ball.y - paddleAi.position.y);
                if (dist2D < HIT_RADIUS && Math.random() > aiLogic.aiMissChance) { state.ball.z = AI_Z + 0.2; performArcadeHit(false); } 
                else if (state.ball.z < AI_Z - 0.5) scorePoint('player');
            }

            if (state.ball.y < -1.5) scorePoint(state.vel.z > 0 ? 'ai' : 'player');
        } else if (state.status === 'serve_toss') {
            // Подброс мяча вверх
            state.vel.y += GRAVITY * dt; 
            state.ball.y += state.vel.y * dt; 
            ball.position.copy(state.ball); 
            ball.rotation.x += 10 * dt;

            // Когда мяч падает вниз после подброса — бьем о СВОЮ сторону стола
            let hitHeight = state.serving === 'player' ? paddlePlayer.position.y : paddleAi.position.y;
            if (state.vel.y < 0 && state.ball.y <= hitHeight + 0.1) {
                sound.hit();
                vibrate(20);
                state.status = 'serve_bounce';
                
                // Направляем мяч в свою половину стола для обязательного отскока перед сеткой
                let mySign = state.serving === 'player' ? 1 : -1;
                let bounceZ = mySign * (TABLE_L / 4);
                let bounceX = (Math.random() - 0.5) * 0.4;
                let tTime = 0.35; // Время полета до отскока на своей половине
                
                state.vel.x = (bounceX - state.ball.x) / tTime;
                state.vel.z = (bounceZ - state.ball.z) / tTime;
                state.vel.y = (TABLE_H - state.ball.y - 0.5 * GRAVITY * tTime * tTime) / tTime;
            }
        } else if (state.status === 'serve_bounce') {
            // Полет мяча до удара о свою сторону перед перелетом через сетку
            state.vel.y += GRAVITY * dt; 
            state.ball.addScaledVector(state.vel, dt); 
            ball.position.copy(state.ball);

            // Проверяем удар о свою половину стола
            if (state.ball.y - BALL_RADIUS <= TABLE_H && state.vel.y < 0) {
                state.ball.y = TABLE_H + BALL_RADIUS;
                sound.bounce();
                
                // Сразу после отскока от своей стороны отправляем мяч через сетку к противнику
                performArcadeHit(state.serving === 'player');
            }
        } else if (state.status === 'serve_wait') {
            if (state.serving === 'player') state.ball.set(paddlePlayer.position.x, paddlePlayer.position.y + 0.1, paddlePlayer.position.z - 0.1);
            else state.ball.set(paddleAi.position.x, paddleAi.position.y + 0.1, paddleAi.position.z + 0.1);
            ball.position.copy(state.ball); ball.rotation.x += Math.sin(Date.now() * 0.01) * 0.05;
        }

        if (state.status === 'playing') {
            for(let i = MAX_TRAIL - 1; i > 0; i--) { trailPositions[i*3] = trailPositions[(i-1)*3]; trailPositions[i*3+1] = trailPositions[(i-1)*3+1]; trailPositions[i*3+2] = trailPositions[(i-1)*3+2]; }
            trailPositions[0] = ball.position.x; trailPositions[1] = ball.position.y; trailPositions[2] = ball.position.z;
            trailGeo.attributes.position.needsUpdate = true;
        } else { trailPositions.fill(0); trailGeo.attributes.position.needsUpdate = true; }
        
        ball.rotation.x += state.vel.z * dt; ball.rotation.z -= state.vel.x * dt;
        renderer.render(scene, camera);
    }

    function showModal(playerWon) {
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        
        if (playerWon) {
            modalTitle.textContent = "ПОБЕДА!";
            modalTitle.style.color = "#10b981";
            modalDesc.textContent = "Робо-Бро уходит на переплавку.";
        } else {
            modalTitle.textContent = "СЛИВ!";
            modalTitle.style.color = "#e11d48";
            modalDesc.textContent = "Машины оказались сильнее человека.";
        }
    }

    document.getElementById('modal-btn').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
        state.playerScore = 0; state.aiScore = 0;
        state.matchStartServer = state.matchStartServer === 'player' ? 'ai' : 'player';
        state.serving = state.matchStartServer;
        document.getElementById('player-score').textContent = '0';
        document.getElementById('ai-score').textContent = '0';
        resetBall();
    });

    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Логика стартовой кнопки
    const startBtn = document.getElementById('btn-start-arcade');
    const triggerStart = (e) => {
        e.preventDefault(); // Защита от двойного срабатывания тапа и клика
        document.getElementById('arcade-start-screen').style.display = 'none';
        window.isArcadeGameRunning = true;
        sound.init(); 
        resetBall();
        animate();
    };
    startBtn.addEventListener('click', triggerStart);
    startBtn.addEventListener('touchstart', triggerStart, { passive: false });

    // Метод для возобновления рендеринга при возврате на вкладку
    window.resumeArcade = function() {
        if (window.isArcadeGameRunning) {
            animate();
        }
    };
    
    // Сцена отрендерится 1 раз статично (до старта), чтобы не было черного экрана сзади кнопки
    renderer.render(scene, camera); 
}
