// ==========================================
// js/arcade.js — 3D Аркадный Пинг-Понг в Парке (Оптимизированный)
// ==========================================

window.arcadeGameInitialized = false;

function initArcadeGame() {
    if (window.arcadeGameInitialized) return;
    window.arcadeGameInitialized = true;

    // Тексты для ИИ и интерфейса
    const JOKES = {
        miss: ["Мазила!", "Очки купи!", "Глаз-алмаз (нет)", "Мимо!"],
        hit: ["Хорош!", "Найс!", "Хрясь!", "Получай!"],
        aiNames: ["Робо-Бро", "Скайнет", "Калькулятор", "Тостер"]
    };
    const BOT_WIN = ["Легкотня!", "Мешок!", "Роботы рулят!", "Получай!"];
    const BOT_LOSE = ["Черт!", "Лаки!", "Баг системы!", "Я поддавался!"];

    const SPECTATOR_PHRASES = [
        "Слыш, а мячик на пиво меняешь?", 
        "Давай, я на робота ставил!", 
        "Ты меня уважаешь? А робота?", 
        "Хорош махать, пошли покурим.", 
        "Да я в юности также лупил!",
        "Ногами, ногами работай!", 
        "Эх, молодежь...", 
        "Я в 70-х мастера взял!", 
        "Раньше ракетки из фанеры были!", 
        "Топ-спин крути, дубина!"
    ];

    let currentDifficulty = 1; // 0: Легко, 1: Норма, 2: Хардкор
    const DIFF_LEVELS = [
        { name: "ЛЕГКО", aiLerp: 4, aiMissChance: 0.30, flightTime: 0.75, aiAim: 0.5 },
        { name: "НОРМА", aiLerp: 8, aiMissChance: 0.15, flightTime: 0.55, aiAim: 0.85 },
        { name: "ХАРДКОР", aiLerp: 14, aiMissChance: 0.03, flightTime: 0.33, aiAim: 1.05 }
    ];

    document.getElementById('arcade-diff-btn').addEventListener('click', () => {
        currentDifficulty = (currentDifficulty + 1) % 3;
        document.getElementById('arcade-diff-btn').textContent = "СЛОЖНОСТЬ: " + DIFF_LEVELS[currentDifficulty].name;
        const colors = ['#4ade80', '#facc15', '#ef4444'];
        document.getElementById('arcade-diff-btn').style.backgroundColor = colors[currentDifficulty];
    });

    function setBanner(text) {
        const banner = document.getElementById('arcade-joke-banner');
        if (banner) banner.textContent = text;
    }

    function showBotPhrase(botWon) {
        const arr = botWon ? BOT_WIN : BOT_LOSE;
        const bubble = document.getElementById('arcade-bot-bubble');
        if (!bubble) return;
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
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
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

    document.getElementById('arcade-sound-btn').addEventListener('click', () => {
        sound.init(); sound.enabled = !sound.enabled;
        document.getElementById('arcade-sound-btn').textContent = sound.enabled ? '🔊' : '🔇';
    });

    function spawnVFX(type) {
        const words = type === 'hit' ? ['BAM!', 'POW!', 'SMASH!'] : ['OOPS!', 'FAIL!'];
        const el = document.createElement('div');
        el.className = 'pow-text';
        el.textContent = words[Math.floor(Math.random() * words.length)];
        el.style.position = 'absolute';
        el.style.left = Math.random() * 40 + 30 + '%'; el.style.top = Math.random() * 40 + 30 + '%';
        el.style.fontFamily = "'Bangers', cursive";
        el.style.fontSize = "3rem";
        el.style.zIndex = "50";
        el.style.color = type === 'hit' ? `hsl(${Math.random()*60 + 10}, 100%, 50%)` : '#94a3b8';
        document.getElementById('arcade-vfx-layer').appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    const container = document.getElementById('arcade-canvas-container');
    const scene = new THREE.Scene();
    scene.background = null; 

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2.5, 4.5);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    function addOutline(mesh) {
        const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);
    }

    // Земля и парк
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshToonMaterial({ color: 0x4ade80 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    function createTree(x, z) {
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshToonMaterial({color: 0x78350f}));
        trunk.position.y = 0.25; addOutline(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 7), new THREE.MeshToonMaterial({color: 0x15803d}));
        leaves.position.y = 1.5; addOutline(leaves);
        group.add(trunk, leaves); group.position.set(x, -0.5, z);
        scene.add(group);
    }
    createTree(-4, -5); createTree(5, -6); createTree(-6, 2); createTree(6, 3);

    // Скамейка со зрителями
    const benchGroup = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), new THREE.MeshToonMaterial({color: 0xa16207}));
    seat.position.y = 0.4;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), new THREE.MeshToonMaterial({color: 0xa16207}));
    back.position.set(0, 0.7, -0.25);
    addOutline(seat); addOutline(back);
    benchGroup.add(seat, back);
    benchGroup.position.set(-3, -0.5, 0);
    benchGroup.rotation.y = Math.PI / 3;
    scene.add(benchGroup);

    const silhouetteMat = new THREE.MeshToonMaterial({color: 0x1e293b});
    function createSilhouette() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6), silhouetteMat);
        body.position.y = 0.7;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), silhouetteMat);
        head.position.y = 1.1;
        addOutline(body); addOutline(head);
        group.add(body, head);
        return { group, head };
    }
    const spec1 = createSilhouette(); spec1.group.position.set(-0.5, 0, 0); benchGroup.add(spec1.group);
    const spec2 = createSilhouette(); spec2.group.position.set(0.5, 0, 0); benchGroup.add(spec2.group);

    let activeSpeaker = null;
    let spectatorTimer = 0;
    
    function updateSpectators(dt) {
        spectatorTimer -= dt;
        const uiBubble = document.getElementById('arcade-spectator-ui');
        if (!uiBubble) return;

        if (spectatorTimer <= 0) {
            if (Math.random() > 0.4) {
                activeSpeaker = Math.random() > 0.5 ? spec1 : spec2;
                document.getElementById('arcade-spectator-text').textContent = SPECTATOR_PHRASES[Math.floor(Math.random() * SPECTATOR_PHRASES.length)];
                uiBubble.style.display = 'block';
                spectatorTimer = 5 + Math.random() * 4;
            } else {
                activeSpeaker = null;
                uiBubble.style.display = 'none';
                spectatorTimer = 3 + Math.random() * 3;
            }
        }

        if (activeSpeaker) {
            const headPos = new THREE.Vector3();
            activeSpeaker.head.getWorldPosition(headPos);
            headPos.y += 0.4;
            headPos.project(camera);
            const targetX = (headPos.x * .5 + .5) * container.clientWidth;
            const targetY = (headPos.y * -.5 + .5) * container.clientHeight;
            uiBubble.style.left = `${targetX}px`;
            uiBubble.style.top = `${targetY}px`;
        }
    }

    const TABLE_W = 2.0; const TABLE_L = 3.0; const TABLE_H = 0.5;

    const matTable = new THREE.MeshToonMaterial({ color: 0x0ea5e9 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.1, TABLE_L), matTable);
    table.position.y = TABLE_H; addOutline(table); scene.add(table);

    const net = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W + 0.2, 0.2, 0.05), new THREE.MeshToonMaterial({ color: 0xf97316 }));
    net.position.set(0, TABLE_H + 0.15, 0); addOutline(net); scene.add(net);

    function createRealisticRacket() {
        const group = new THREE.Group();
        const materials = [
            new THREE.MeshToonMaterial({ color: 0xeab308 }),
            new THREE.MeshToonMaterial({ color: 0xef4444 }),
            new THREE.MeshToonMaterial({ color: 0x111111 })
        ];
        const headGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32);
        headGeo.rotateX(Math.PI / 2);
        const head = new THREE.Mesh(headGeo, materials);
        addOutline(head); group.add(head);
        return group;
    }

    const paddlePlayer = createRealisticRacket();
    const PLAYER_Z = TABLE_L / 2 + 0.2; 
    paddlePlayer.position.set(0, TABLE_H + 0.3, PLAYER_Z); scene.add(paddlePlayer);

    const paddleAi = createRealisticRacket();
    const AI_Z = -TABLE_L / 2 - 0.2;
    paddleAi.position.set(0, TABLE_H + 0.3, AI_Z); scene.add(paddleAi);

    const BALL_RADIUS = 0.06;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 16, 16), new THREE.MeshToonMaterial({ color: 0xfef08a }));
    addOutline(ball); scene.add(ball);

    const GRAVITY = -12; 
    const state = {
        status: 'serve_wait',
        ball: new THREE.Vector3(0, TABLE_H + 0.5, PLAYER_Z - 0.2),
        vel: new THREE.Vector3(0, 0, 0),
        targetX: 0, targetY: TABLE_H + 0.3,
        aiTargetX: 0, aiTargetY: TABLE_H + 0.3,
        playerScore: 0, aiScore: 0,
        matchStartServer: 'player', serving: 'player'
    };

    document.getElementById('arcade-ai-name').textContent = JOKES.aiNames[Math.floor(Math.random()*JOKES.aiNames.length)];

    function updatePointer(clientX, clientY) {
        let rect = container.getBoundingClientRect();
        let nx = ((clientX - rect.left) / container.clientWidth)  * 2 - 1;
        let ny = -((clientY - rect.top) / container.clientHeight) * 2 + 1;
        state.targetX = nx * (TABLE_W * 1.2); 
        state.targetY = TABLE_H + 0.2 + (ny + 1) * 0.4;
    }

    function tryServe() {
        if (state.status === 'serve_wait' && state.serving === 'player') {
            sound.init();
            state.status = 'serve_toss';
            state.vel.set(0, 4.5, 0);
            setBanner("ПОДБРОС!");
        }
    }

    container.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
    container.addEventListener('pointerdown', (e) => { updatePointer(e.clientX, e.clientY); tryServe(); });
    container.addEventListener('touchmove', (e) => { e.preventDefault(); updatePointer(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});

    function performArcadeHit(isPlayer) {
        let isServe = (state.status === 'serve_toss');
        state.status = 'playing';
        let sign = isPlayer ? -1 : 1;
        const diff = DIFF_LEVELS[currentDifficulty];
        
        let targetZ = sign * (TABLE_L / 4 + Math.random() * (TABLE_L / 4));
        let aimWidth = isPlayer ? 0.85 : diff.aiAim;
        let targetX = (Math.random() - 0.5) * (TABLE_W * aimWidth);
        let targetY = TABLE_H; 
        
        let time = diff.flightTime; 
        if (!isPlayer) time *= (0.9 + Math.random() * 0.2);
        
        state.vel.x = (targetX - state.ball.x) / time;
        state.vel.z = (targetZ - state.ball.z) / time;
        state.vel.y = (targetY - state.ball.y - 0.5 * GRAVITY * time * time) / time;

        sound.hit(); spawnVFX('hit');
        setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]);
    }

    function scorePoint(winner) {
        if (state.status === 'scored') return;
        state.status = 'scored';
        
        if (winner === 'player') {
            state.playerScore++; document.getElementById('arcade-player-score').textContent = state.playerScore;
            sound.score(); setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]);
            showBotPhrase(false);
        } else {
            state.aiScore++; document.getElementById('arcade-ai-score').textContent = state.aiScore;
            sound.fail(); spawnVFX('miss'); setBanner(JOKES.miss[Math.floor(Math.random()*JOKES.miss.length)]);
            showBotPhrase(true);
        }

        if (state.playerScore < 11 && state.aiScore < 11) {
            state.serving = state.serving === 'player' ? 'ai' : 'player';
            setTimeout(resetBall, 1500);
        } else {
            document.getElementById('arcade-modal').style.display = 'flex';
            document.getElementById('arcade-modal-title').textContent = state.playerScore >= 11 ? "ПОБЕДА!" : "СЛИВ!";
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
                    state.vel.set(0, 4.5, 0);
                    setBanner("ПОДБРОС!");
                }
            }, 1000);
        }
    }

    const clock = new THREE.Clock();
    
    function animate() {
        if (!window.arcadeActive) return; // Останавливаем рендеринг, если ушли с вкладки
        requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.05);
        updateSpectators(dt);

        paddlePlayer.position.x = THREE.MathUtils.lerp(paddlePlayer.position.x, state.targetX, 15 * dt);
        paddlePlayer.position.y = THREE.MathUtils.lerp(paddlePlayer.position.y, state.targetY, 15 * dt);

        const aiLogic = DIFF_LEVELS[currentDifficulty];
        if (state.status === 'playing' && state.vel.z < 0) {
            state.aiTargetX = state.ball.x;
            state.aiTargetY = Math.max(TABLE_H + 0.2, state.ball.y);
        } else {
            state.aiTargetX = 0; state.aiTargetY = TABLE_H + 0.3;
        }
        paddleAi.position.x = THREE.MathUtils.lerp(paddleAi.position.x, state.aiTargetX, aiLogic.aiLerp * dt);
        paddleAi.position.y = THREE.MathUtils.lerp(paddleAi.position.y, state.aiTargetY, aiLogic.aiLerp * dt);

        if (state.status === 'playing') {
            state.vel.y += GRAVITY * dt;
            state.ball.addScaledVector(state.vel, dt);
            ball.position.copy(state.ball);

            if (state.ball.y - BALL_RADIUS < TABLE_H && state.vel.y < 0) {
                if (Math.abs(state.ball.x) < TABLE_W/2 + 0.1 && Math.abs(state.ball.z) < TABLE_L/2 + 0.1) {
                    state.ball.y = TABLE_H + BALL_RADIUS; state.vel.y *= -0.8; 
                    sound.bounce();
                }
            }

            const HIT_RADIUS = 0.6;
            if (state.vel.z > 0 && state.ball.z > PLAYER_Z - 0.2) {
                let dist2D = Math.hypot(state.ball.x - paddlePlayer.position.x, state.ball.y - paddlePlayer.position.y);
                if (dist2D < HIT_RADIUS) { state.ball.z = PLAYER_Z - 0.2; performArcadeHit(true); } 
                else if (state.ball.z > PLAYER_Z + 0.5) { scorePoint('ai'); }
            }

            if (state.vel.z < 0 && state.ball.z < AI_Z + 0.2) {
                let dist2D = Math.hypot(state.ball.x - paddleAi.position.x, state.ball.y - paddleAi.position.y);
                if (dist2D < HIT_RADIUS && Math.random() > aiLogic.aiMissChance) { state.ball.z = AI_Z + 0.2; performArcadeHit(false); } 
                else if (state.ball.z < AI_Z - 0.5) { scorePoint('player'); }
            }

            if (state.ball.y < -1.5) scorePoint(state.vel.z > 0 ? 'ai' : 'player');
        } else if (state.status === 'serve_toss') {
            state.vel.y += GRAVITY * dt;
            state.ball.y += state.vel.y * dt;
            ball.position.copy(state.ball);
            let hitHeight = state.serving === 'player' ? paddlePlayer.position.y : paddleAi.position.y;
            if (state.vel.y < 0 && state.ball.y <= hitHeight + 0.1) { performArcadeHit(state.serving === 'player'); }
        } else if (state.status === 'serve_wait') {
            if (state.serving === 'player') {
                state.ball.set(paddlePlayer.position.x, paddlePlayer.position.y + 0.1, paddlePlayer.position.z - 0.1);
            } else {
                state.ball.set(paddleAi.position.x, paddleAi.position.y + 0.1, paddleAi.position.z + 0.1);
            }
            ball.position.copy(state.ball);
        }
        renderer.render(scene, camera);
    }

    document.getElementById('arcade-modal-btn').addEventListener('click', () => {
        document.getElementById('arcade-modal').style.display = 'none';
        state.playerScore = 0; state.aiScore = 0;
        document.getElementById('arcade-player-score').textContent = '0';
        document.getElementById('arcade-ai-score').textContent = '0';
        resetBall();
    });

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    window.arcadeActive = true;
    resetBall();
    animate();
}
