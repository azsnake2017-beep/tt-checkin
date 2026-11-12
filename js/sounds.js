// ==========================================
// ЗВУКОВОЙ ДВИЖОК v2 — СИНТЕЗИРОВАННЫЕ UI-ЗВУКИ (Web Audio API)
// Современные мягкие сигналы генерируются на лету, без mp3-файлов.
// Публичный API прежний: playClick / playPop / playSwoosh /
// playSuccess / playRandomBounce / vibrate / toggleSound
// ==========================================
window.TTAudio = {
  soundEnabled: localStorage.getItem('tt_sound_enabled') !== 'false',
  lastPlayTime: 0, // Защита от двойного воспроизведения
  _ctx: null,

  _ac: function() {
    if (!this._ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this._ctx = new AC();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  // Короткий тон с мягкой огибающей и опциональным глиссандо
  _tone: function(ctx, o) {
    var t0 = ctx.currentTime + (o.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.from, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  },

  // Шумовой «свиш» через движущийся полосовой фильтр
  _noise: function(ctx, o) {
    var t0 = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * o.dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(o.from, t0);
    bp.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start(t0);
  },

  _play: function(kind) {
    if (!this.soundEnabled) return;
    var now = Date.now();
    if (now - this.lastPlayTime < 50) return; // анти-спам, как раньше
    this.lastPlayTime = now;
    var ctx = this._ac();
    if (!ctx) return;
    try {
      switch (kind) {
        case 'click': // короткий сухой тик (кнопки, табы)
          this._tone(ctx, { from: 1900, to: 1300, dur: 0.045, vol: 0.16, type: 'triangle' });
          break;
        case 'pop': // упругий хлопок (открытие карточек, модалок)
          this._tone(ctx, { from: 420, to: 760, dur: 0.09, vol: 0.24, type: 'sine' });
          break;
        case 'swoosh': // воздушный свист (свайпы, переходы)
          this._noise(ctx, { dur: 0.22, vol: 0.13, from: 900, to: 2600 });
          break;
        case 'success': // двухнотный перезвон (победа, чек-ин)
          this._tone(ctx, { from: 659.25, dur: 0.12, vol: 0.22 });
          this._tone(ctx, { from: 987.77, dur: 0.18, vol: 0.22, delay: 0.09 });
          break;
        case 'bounce': // лёгкий отскок со случайной высотой (мячик)
          var f = 1400 + Math.random() * 700;
          this._tone(ctx, { from: f, to: f * 0.7, dur: 0.04, vol: 0.13, type: 'triangle' });
          break;
      }
    } catch (e) {}
  },

  vibrate: function(type) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type === 'success' ? 'heavy' : 'light');
    } else if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? [40, 60, 40] : [40]);
    }
  },

  playClick: function() { this._play('click'); },
  playPop: function() { this._play('pop'); },
  playSwoosh: function() { this._play('swoosh'); },
  playSuccess: function() { this.vibrate('success'); this._play('success'); },
  playRandomBounce: function() { this._play('bounce'); }, // совместимость со старым кодом

  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('tt_sound_enabled', this.soundEnabled);
    if (this.soundEnabled) this.playSuccess();
    else this.vibrate('warning');
    return this.soundEnabled;
  }
};

window.toggleAppSound = function() {
  if (!window.TTAudio) return;
  var isEnabled = window.TTAudio.toggleSound();
  var btn = document.getElementById('main-sound-toggle');
  if (btn) btn.innerText = isEnabled ? '🔊' : '🔇';
};

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('main-sound-toggle');
  if (btn && window.TTAudio) {
    btn.innerText = window.TTAudio.soundEnabled ? '🔊' : '🔇';
  }
});
