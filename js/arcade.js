window.arcadeGameInitialized = false;

function initArcadeGame() {
    // Проверка загрузки Three.js
    if (typeof THREE === 'undefined') {
        setTimeout(initArcadeGame, 100);
        return;
    }

    if (window.arcadeGameInitialized) {
        window.arcadeActive = true;
        return;
    }
    window.arcadeGameInitialized = true;
    window.arcadeActive = true;

    // =========================================================
    //  <script>
        // Тексты для ИИ и интерфейса
        const JOKES = {
            miss: ["Мазила!", "Очки купи!", "Глаз-алмаз (нет)", "Мимо!"],
            hit: ["Хорош!", "Найс!", "Хрясь!", "Получай!"],
            aiNames: ["Робо-Бро", "Скайнет", "Калькулятор", "Тостер"]
        };
        const BOT_WIN = ["Легкотня!", "Мешок!", "Роботы рулят!", "Получай!"];
        const BOT_LOSE = ["Черт!", "Лаки!", "Баг системы!", "Я поддавался!"];

        // Тексты для зрителей на скамейке
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

        document.getElementById('diff-btn').addEventListener('click', () => {
            currentDifficulty = (currentDifficulty + 1) % 3;
            document.getElementById('diff-btn').textContent = "СЛОЖНОСТЬ: " + DIFF_LEVELS[currentDifficulty].name;
            // Смена цвета кнопки для индикации
            const colors = ['#4ade80', '#facc15', '#ef4444'];
            document.getElementById('diff-btn').style.backgroundColor = colors[currentDifficulty];
        });

        function setBanner(text) {
            document.getElementById('joke-banner').textContent = text;
            document.getElementById('joke-banner-mobile').textContent = text;
        }

        function showBotPhrase(botWon) {
            const arr = botWon ? BOT_WIN : BOT_LOSE;
            const bubble = document.getElementById('bot-bubble');
            bubble.textContent = arr[Math.floor(Math.random() * arr.length)];
            bubble.classList.remove('hidden');
            setTimeout(() => bubble.classList.add('hidden'), 2000);
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

        document.getElementById('sound-btn').addEventListener('click', () => {
            sound.init(); sound.enabled = !sound.enabled;
            document.getElementById('sound-btn').textContent = sound.enabled ? '🔊' : '🔇';
        });

        function spawnVFX(type) {
            const words = type === 'hit' ? ['BAM!', 'POW!', 'SMASH!'] : ['OOPS!', 'FAIL!'];
            const el = document.createElement('div');
            el.className = 'pow-text';
            el.textContent = words[Math.floor(Math.random() * words.length)];
            el.style.left = Math.random() * 40 + 30 + '%'; el.style.top = Math.random() * 40 + 30 + '%';
            el.style.color = type === 'hit' ? `hsl(${Math.random()*60 + 10}, 100%, 50%)` : '#94a3b8';
            document.getElementById('vfx-layer').appendChild(el);
            setTimeout(() => el.remove(), 600);

            if (type === 'hit') {
                document.body.classList.remove('shake');
                void document.body.offsetWidth;
                document.body.classList.add('shake');
            }
        }
        function vibrate(time) { if (navigator.vibrate) try { navigator.vibrate(time); } catch(e){} }

        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        // Убираем фоновый цвет сцены, чтобы было видно HTML-небо комикса
        scene.background = null; 

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 2.5, 4.5);
        camera.lookAt(0, 0.2, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        function addOutline(mesh, thickness = 0.03) {
            const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
            const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
            const edges = new THREE.LineSegments(edgeGeo, edgeMat);
            mesh.add(edges);
        }

        // --- СОЗДАНИЕ ПАРКА ---
        // Земля (Трава/Парк)
        const groundGeo = new THREE.PlaneGeometry(50, 50);
        const groundMat = new THREE.MeshToonMaterial({ color: 0x4ade80 }); // Зеленый
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5; // Ниже стола
        scene.add(ground);

        // Функция для создания простых деревьев
        function createTree(x, z) {
            const group = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshToonMaterial({color: 0x78350f}));
            trunk.position.y = 0.25;
            addOutline(trunk);
            const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 7), new THREE.MeshToonMaterial({color: 0x15803d}));
            leaves.position.y = 1.5;
            addOutline(leaves);
            group.add(trunk, leaves);
            group.position.set(x, -0.5, z);
            scene.add(group);
        }
        createTree(-4, -5); createTree(5, -6); createTree(-6, 2); createTree(6, 3);

        // Баскетбольное кольцо (на фоне)
        const hoopGroup = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), new THREE.MeshToonMaterial({color: 0x94a3b8}));
        pole.position.y = 1;
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1), new THREE.MeshToonMaterial({color: 0xffffff}));
        board.position.set(0, 2.2, 0.1);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), new THREE.MeshToonMaterial({color: 0xef4444}));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 1.9, 0.3);
        addOutline(pole); addOutline(board); addOutline(ring);
        hoopGroup.add(pole, board, ring);
        hoopGroup.position.set(4, -0.5, -8);
        scene.add(hoopGroup);

        // Скейтпарк (рампа на фоне)
        const ramp = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 16, 1, false, 0, Math.PI), new THREE.MeshToonMaterial({color: 0x64748b}));
        ramp.rotation.z = Math.PI / 2;
        ramp.position.set(-5, -0.5, -7);
        addOutline(ramp);
        scene.add(ramp);

        // Скамейка для зрителей (слева)
        const benchGroup = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), new THREE.MeshToonMaterial({color: 0xa16207}));
        seat.position.y = 0.4;
        const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), new THREE.MeshToonMaterial({color: 0xa16207}));
        back.position.set(0, 0.7, -0.25);
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.5), new THREE.MeshToonMaterial({color: 0x111111}));
        leg1.position.set(-0.8, 0.2, 0);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.5), new THREE.MeshToonMaterial({color: 0x111111}));
        leg2.position.set(0.8, 0.2, 0);
        addOutline(seat); addOutline(back);
        benchGroup.add(seat, back, leg1, leg2);
        benchGroup.position.set(-3, -0.5, 0);
        benchGroup.rotation.y = Math.PI / 3; // Повернута к столу
        scene.add(benchGroup);

        // Фигурки зрителей (силуэты)
        const silhouetteMat = new THREE.MeshToonMaterial({color: 0x1e293b}); // Темно-синий/серый силуэт
        
        function createSilhouette() {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6), silhouetteMat);
            body.position.y = 0.7; // Сидит на скамейке
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), silhouetteMat);
            head.position.y = 1.1;
            addOutline(body); addOutline(head);
            group.add(body, head);
            return { group, head };
        }

        const spec1 = createSilhouette();
        spec1.group.position.set(-0.5, 0, 0); // Левый зритель
        benchGroup.add(spec1.group);

        const spec2 = createSilhouette();
        spec2.group.position.set(0.5, 0, 0); // Правый зритель
        benchGroup.add(spec2.group);

        // Логика комментариев зрителей
        let activeSpeaker = null;
        let spectatorTimer = 0;
        
        function updateSpectators(dt) {
            spectatorTimer -= dt;
            const uiBubble = document.getElementById('spectator-ui');

            if (spectatorTimer <= 0) {
                if (Math.random() > 0.4) {
                    // Случайный выбор говорящего (левый или правый силуэт)
                    activeSpeaker = Math.random() > 0.5 ? spec1 : spec2;
                    document.getElementById('spectator-text').textContent = SPECTATOR_PHRASES[Math.floor(Math.random() * SPECTATOR_PHRASES.length)];
                    uiBubble.classList.remove('hidden');
                    spectatorTimer = 5 + Math.random() * 4; // Висит 5-9 секунд
                } else {
                    activeSpeaker = null;
                    uiBubble.classList.add('hidden');
                    spectatorTimer = 3 + Math.random() * 3; // Молчат 3-6 секунд
                }
            }

            // Обновляем позицию облачка HTML, чтобы оно висело над 3D головой говорящего
            if (activeSpeaker) {
                const headPos = new THREE.Vector3();
                activeSpeaker.head.getWorldPosition(headPos);
                headPos.y += 0.4; // Чуть выше головы

                // Проецируем на 2D экран
                headPos.project(camera);
                const targetX = (headPos.x * .5 + .5) * window.innerWidth;
                const targetY = (headPos.y * -.5 + .5) * window.innerHeight;

                // Ограничиваем позицию по X, чтобы облачко не вылезало за края экрана
                const bubbleWidth = uiBubble.offsetWidth || 200; // Ширина облачка
                const padding = 10; // Отступ от края экрана
                const minX = bubbleWidth / 2 + padding;
                const maxX = window.innerWidth - bubbleWidth / 2 - padding;
                
                const clampedX = Math.max(minX, Math.min(maxX, targetX));
                
                // Смещаем хвостик облачка, если само облачко пришлось сдвинуть
                let tailShift = targetX - clampedX;
                const maxTailShift = bubbleWidth / 2 - 25; // Чтобы хвостик не отрывался от краев
                tailShift = Math.max(-maxTailShift, Math.min(maxTailShift, tailShift));

                uiBubble.style.left = `${clampedX}px`;
                uiBubble.style.top = `${targetY}px`;
                uiBubble.style.setProperty('--tail-shift', `${tailShift}px`);
            }
        }

        const TABLE_W = 2.0; const TABLE_L = 3.0; const TABLE_H = 0.5;

        // Ножки стола
        const legMat = new THREE.MeshToonMaterial({ color: 0x111111 });
        const legG = new THREE.CylinderGeometry(0.04, 0.04, TABLE_H + 0.5);
        const offsets = [[1,1], [1,-1], [-1,1], [-1,-1]];
        offsets.forEach(pos => {
            const leg = new THREE.Mesh(legG, legMat);
            leg.position.set(pos[0] * (TABLE_W/2 - 0.1), (TABLE_H/2) - 0.25, pos[1] * (TABLE_L/2 - 0.1));
            scene.add(leg);
        });

        // Стол и Сетка
        const matTable = new THREE.MeshToonMaterial({ color: 0x0ea5e9 });
        const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.1, TABLE_L), matTable);
        table.position.y = TABLE_H;
        addOutline(table); scene.add(table);

        // Белая разметка на столе
        const lineMat = new THREE.MeshBasicMaterial({color: 0xffffff});
        const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.02, TABLE_L), lineMat);
        centerLine.rotation.x = -Math.PI/2; centerLine.position.set(0, TABLE_H + 0.051, 0);
        scene.add(centerLine);

        const net = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W + 0.2, 0.2, 0.05), new THREE.MeshToonMaterial({ color: 0xf97316 }));
        net.position.set(0, TABLE_H + 0.15, 0);
        addOutline(net); scene.add(net);

        function createRealisticRacket() {
            const group = new THREE.Group();
            const materials = [
                new THREE.MeshToonMaterial({ color: 0xeab308 }), // Дерево сбоку
                new THREE.MeshToonMaterial({ color: 0xef4444 }), // Красная накладка (Форхенд)
                new THREE.MeshToonMaterial({ color: 0x111111 })  // Черная накладка (Бэкхенд)
            ];
            const headGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32);
            headGeo.rotateX(Math.PI / 2);
            const head = new THREE.Mesh(headGeo, materials);
            addOutline(head); group.add(head);

            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.04), new THREE.MeshToonMaterial({color: 0xca8a04}));
            handle.position.y = -0.22;
            addOutline(handle); group.add(handle);
            return group;
        }

        const paddlePlayer = createRealisticRacket();
        const PLAYER_Z = TABLE_L / 2 + 0.2; 
        paddlePlayer.position.set(0, TABLE_H + 0.3, PLAYER_Z);
        scene.add(paddlePlayer);

        const paddleAi = createRealisticRacket();
        const AI_Z = -TABLE_L / 2 - 0.2;
        paddleAi.position.set(0, TABLE_H + 0.3, AI_Z);
        scene.add(paddleAi);

        const BALL_RADIUS = 0.06;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 16, 16), new THREE.MeshToonMaterial({ color: 0xfef08a }));
        addOutline(ball); scene.add(ball);

        // Шлейф мяча
        const trailMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
        const trailGeo = new THREE.BufferGeometry();
        const MAX_TRAIL = 10;
        const trailPositions = new Float32Array(MAX_TRAIL * 3);
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trailLine = new THREE.Line(trailGeo, trailMat);
        scene.add(trailLine);

        const GRAVITY = -12; 
        const state = {
            status: 'serve_wait', // serve_wait, serve_toss, playing, scored
            ball: new THREE.Vector3(0, TABLE_H + 0.5, PLAYER_Z - 0.2),
            vel: new THREE.Vector3(0, 0, 0),
            targetX: 0, targetY: TABLE_H + 0.3,
            aiTargetX: 0, aiTargetY: TABLE_H + 0.3,
            playerScore: 0, aiScore: 0,
            matchStartServer: 'player', serving: 'player'
        };

        document.getElementById('ai-name').textContent = JOKES.aiNames[Math.floor(Math.random()*JOKES.aiNames.length)];

        // Управление Игрока: Слежение за курсором/пальцем
        function updatePointer(clientX, clientY) {
            let nx = (clientX / window.innerWidth) * 2 - 1;
            let ny = -(clientY / window.innerHeight) * 2 + 1;
            state.targetX = nx * (TABLE_W * 1.2); 
            state.targetY = TABLE_H + 0.2 + (ny + 1) * 0.4;
        }

        // Подача происходит ТОЛЬКО по клику/тапу
        function tryServe() {
            if (state.status === 'serve_wait' && state.serving === 'player') {
                sound.init(); // Разрешаем звук по жесту пользователя
                state.status = 'serve_toss';
                state.vel.set(0, 4.5, 0); // Подброс мяча
                setBanner("ПОДБРОС!");
            }
        }

        window.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
        window.addEventListener('pointerdown', (e) => {
            updatePointer(e.clientX, e.clientY);
            tryServe(); // Пытаемся подать
        });
        window.addEventListener('touchmove', (e) => { e.preventDefault(); updatePointer(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});

        function performArcadeHit(isPlayer) {
            let isServe = (state.status === 'serve_toss');
            state.status = 'playing';
            let sign = isPlayer ? -1 : 1;
            
            const diff = DIFF_LEVELS[currentDifficulty];
            
            // Базовая цель по глубине
            let targetZ = sign * (TABLE_L / 4 + Math.random() * (TABLE_L / 4));
            
            // Ширина удара зависит от того, кто бьет и какая сложность
            let aimWidth = isPlayer ? 0.85 : diff.aiAim;
            let targetX = (Math.random() - 0.5) * (TABLE_W * aimWidth);
            
            // На хардкоре бот может коварно укорачивать или бить глубоко в край стола
            if (!isPlayer && currentDifficulty === 2 && !isServe) {
                targetZ = sign * (Math.random() > 0.5 ? TABLE_L / 2 - 0.1 : TABLE_L / 6);
            }

            let targetY = TABLE_H; 
            
            // Скорость полета (чем меньше время, тем быстрее летит пуля)
            let time = diff.flightTime; 
            if (!isPlayer) time *= (0.9 + Math.random() * 0.2); // Легкий рандом скорости от бота
            
            state.vel.x = (targetX - state.ball.x) / time;
            state.vel.z = (targetZ - state.ball.z) / time;
            state.vel.y = (targetY - state.ball.y - 0.5 * GRAVITY * time * time) / time;

            sound.hit(); vibrate(30); spawnVFX('hit');
            setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]);
        }

        function getNextServer() {
            const total = state.playerScore + state.aiScore;
            // Баланс 10:10 -> подача меняется каждое 1 очко
            if (state.playerScore >= 10 && state.aiScore >= 10) {
                return (total % 2 === 0) ? state.matchStartServer : (state.matchStartServer === 'player' ? 'ai' : 'player');
            } 
            // Обычная игра -> смена каждые 2 очка
            const turn = Math.floor(total / 2);
            return (turn % 2 === 0) ? state.matchStartServer : (state.matchStartServer === 'player' ? 'ai' : 'player');
        }

        function checkWinCondition() {
            if (state.playerScore >= 11 && (state.playerScore - state.aiScore) >= 2) {
                setTimeout(() => showModal(true), 1000); return true;
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
                sound.score(); setBanner(JOKES.hit[Math.floor(Math.random()*JOKES.hit.length)]);
                showBotPhrase(false);
            } else {
                state.aiScore++; document.getElementById('ai-score').textContent = state.aiScore;
                sound.fail(); spawnVFX('miss'); setBanner(JOKES.miss[Math.floor(Math.random()*JOKES.miss.length)]);
                showBotPhrase(true);
            }

            if (!checkWinCondition()) {
                state.serving = getNextServer();
                setTimeout(resetBall, 1500);
            }
        }

        function resetBall() {
            state.status = 'serve_wait';
            state.vel.set(0,0,0);
            const isDeuce = state.playerScore >= 10 && state.aiScore >= 10;
            const deuceText = isDeuce ? "БАЛАНС! " : "";

            if (state.serving === 'player') {
                setBanner(deuceText + "КЛИКАЙ ПО ЭКРАНУ ДЛЯ ПОДАЧИ!");
            } else {
                setBanner(deuceText + "Подача Бота...");
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
        
        function update(dt) {
            // Анимация зрителей на фоне
            updateSpectators(dt);

            // Игрок: Движение и наклон ракетки (Форхенд/Бэкхенд)
            paddlePlayer.position.x = THREE.MathUtils.lerp(paddlePlayer.position.x, state.targetX, 15 * dt);
            paddlePlayer.position.y = THREE.MathUtils.lerp(paddlePlayer.position.y, state.targetY, 15 * dt);

            let tPZ = 0, tPY = 0;
            if (state.targetX > 0) { tPZ = -0.3; tPY = -0.2; } // Вправо -> Красная
            else { tPZ = 0.3; tPY = 0.2; } // Влево -> Черная
            
            paddlePlayer.rotation.z = THREE.MathUtils.lerp(paddlePlayer.rotation.z, tPZ, 12 * dt);
            paddlePlayer.rotation.y = THREE.MathUtils.lerp(paddlePlayer.rotation.y, tPY, 12 * dt);
            paddlePlayer.rotation.x = THREE.MathUtils.lerp(paddlePlayer.rotation.x, (state.status === 'playing' && state.vel.z > 0) ? -0.4 : 0, 15 * dt);

            // ИИ: Движение с учетом сложности
            const aiLogic = DIFF_LEVELS[currentDifficulty];
            // ИСПРАВЛЕНО: Бот теперь следит за летящим в его сторону мячом (vel.z < 0)
            if (state.status === 'playing' && state.vel.z < 0) {
                state.aiTargetX = state.ball.x;
                state.aiTargetY = Math.max(TABLE_H + 0.2, state.ball.y);
            } else {
                state.aiTargetX = 0; state.aiTargetY = TABLE_H + 0.3;
            }
            paddleAi.position.x = THREE.MathUtils.lerp(paddleAi.position.x, state.aiTargetX, aiLogic.aiLerp * dt);
            paddleAi.position.y = THREE.MathUtils.lerp(paddleAi.position.y, state.aiTargetY, aiLogic.aiLerp * dt);
            
            paddleAi.rotation.z = THREE.MathUtils.lerp(paddleAi.rotation.z, state.aiTargetX > 0 ? -0.3 : 0.3, 10 * dt);
            paddleAi.rotation.x = THREE.MathUtils.lerp(paddleAi.rotation.x, (state.status === 'playing' && state.vel.z < 0) ? 0.4 : 0, 15 * dt);

            // Физика мяча
            if (state.status === 'playing') {
                state.vel.y += GRAVITY * dt;
                state.ball.addScaledVector(state.vel, dt);
                ball.position.copy(state.ball);

                // Отскок от стола
                if (state.ball.y - BALL_RADIUS < TABLE_H && state.vel.y < 0) {
                    if (Math.abs(state.ball.x) < TABLE_W/2 + 0.1 && Math.abs(state.ball.z) < TABLE_L/2 + 0.1) {
                        state.ball.y = TABLE_H + BALL_RADIUS; state.vel.y *= -0.8; 
                        sound.bounce(); vibrate(10);
                    }
                }

                const HIT_RADIUS = 0.6; // Аркадный хитбокс
                
                // Удар Игрока
                if (state.vel.z > 0 && state.ball.z > PLAYER_Z - 0.2) {
                    let dist2D = Math.hypot(state.ball.x - paddlePlayer.position.x, state.ball.y - paddlePlayer.position.y);
                    if (dist2D < HIT_RADIUS) {
                        state.ball.z = PLAYER_Z - 0.2; performArcadeHit(true);
                    } else if (state.ball.z > PLAYER_Z + 0.5) {
                        scorePoint('ai');
                    }
                }

                // Удар ИИ
                if (state.vel.z < 0 && state.ball.z < AI_Z + 0.2) {
                    let dist2D = Math.hypot(state.ball.x - paddleAi.position.x, state.ball.y - paddleAi.position.y);
                    if (dist2D < HIT_RADIUS && Math.random() > aiLogic.aiMissChance) {
                        state.ball.z = AI_Z + 0.2; performArcadeHit(false);
                    } else if (state.ball.z < AI_Z - 0.5) {
                        scorePoint('player');
                    }
                }

                if (state.ball.y < -1.5) scorePoint(state.vel.z > 0 ? 'ai' : 'player');
            } else if (state.status === 'serve_toss') {
                // Физика подброса мяча вверх
                state.vel.y += GRAVITY * dt;
                state.ball.y += state.vel.y * dt;
                ball.position.copy(state.ball);
                ball.rotation.x += 10 * dt;

                // Удар происходит автоматически, когда мяч падает до уровня ракетки
                let hitHeight = state.serving === 'player' ? paddlePlayer.position.y : paddleAi.position.y;
                if (state.vel.y < 0 && state.ball.y <= hitHeight + 0.1) {
                    performArcadeHit(state.serving === 'player');
                }
            } else if (state.status === 'serve_wait') {
                // Мяч парит перед ракеткой подающего и следует за ней
                if (state.serving === 'player') {
                    state.ball.set(paddlePlayer.position.x, paddlePlayer.position.y + 0.1, paddlePlayer.position.z - 0.1);
                } else {
                    state.ball.set(paddleAi.position.x, paddleAi.position.y + 0.1, paddleAi.position.z + 0.1);
                }
                ball.position.copy(state.ball);
                // Добавим легкое вращение для красоты пока мяч лежит
                ball.rotation.x += Math.sin(Date.now() * 0.01) * 0.05;
            }

            // Шлейф
            if (state.status === 'playing') {
                for(let i = MAX_TRAIL - 1; i > 0; i--) {
                    trailPositions[i*3] = trailPositions[(i-1)*3];
                    trailPositions[i*3+1] = trailPositions[(i-1)*3+1];
                    trailPositions[i*3+2] = trailPositions[(i-1)*3+2];
                }
                trailPositions[0] = ball.position.x; trailPositions[1] = ball.position.y; trailPositions[2] = ball.position.z;
                trailGeo.attributes.position.needsUpdate = true;
            } else {
                trailPositions.fill(0); trailGeo.attributes.position.needsUpdate = true;
            }
            
            ball.rotation.x += state.vel.z * dt; ball.rotation.z -= state.vel.x * dt;
            renderer.render(scene, camera);
        }

        function animate() {
            if (!window.arcadeActive) return;
            requestAnimationFrame(animate);
            update(Math.min(clock.getDelta(), 0.05));
        }

        const modal = document.getElementById('modal');
        function showModal(playerWon) {
            modal.classList.remove('hidden');
            document.getElementById('modal-title').textContent = playerWon ? "ПОБЕДА!" : "СЛИВ!";
            document.getElementById('modal-title').className = playerWon ? "comic-title-font text-5xl text-emerald-500 mb-2" : "comic-title-font text-5xl text-rose-600 mb-2";
        }
        document.getElementById('modal-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
            state.playerScore = 0; state.aiScore = 0;
            state.matchStartServer = state.matchStartServer === 'player' ? 'ai' : 'player';
            state.serving = state.matchStartServer;
            document.getElementById('player-score').textContent = '0';
            document.getElementById('ai-score').textContent = '0';
            resetBall();
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        resetBall();
        animate();
    </script>

    // =========================================================

    // ... твой скопированный код ...

    // ВАЖНО: В твоем вставленном коде найди функцию animate()
    // и добавь в её самое начало одну строчку:
    /*
    function animate() {
        if (!window.arcadeActive) return; // <--- Добавь это
        requestAnimationFrame(animate);
        // ...
    }
    */
}
