// ==========================================
// ЗВУКОВОЙ ДВИЖОК КЛУБА (Рандомные отскоки)
// Файл: js/sounds.js
// ==========================================

window.TTAudio = {
  enabled: true, 
  
  // Массив из 5 звуков (файлы 1.mp3 - 5.mp3 в папке sounds)
  bounces: [
    new Audio('sounds/1.mp3'),
    new Audio('sounds/2.mp3'),
    new Audio('sounds/3.mp3'),
    new Audio('sounds/4.mp3'),
    new Audio('sounds/5.mp3')
  ],

  // Функция воспроизведения случайного звука
  playRandomBounce: function() {
    if (!this.enabled) return;
    
    // Выбираем случайную цифру от 0 до 4
    var randomIndex = Math.floor(Math.random() * this.bounces.length);
    var sound = this.bounces[randomIndex];
    
    if (sound) {
      try {
        sound.currentTime = 0; // Сбрасываем тайминг для быстрых двойных кликов
        sound.play().catch(function(e) {
            // Игнорируем блокировку браузера до первого взаимодействия
        });
      } catch(e) {}
    }
  },

  // Функция для включения/выключения звука (пригодится для кнопки настроек)
  toggle: function() {
    this.enabled = !this.enabled;
    if (this.enabled) this.playRandomBounce(); // Тестовый звук при включении
    return this.enabled;
  }
};

// Глобальный перехватчик всех кликов
document.addEventListener('click', function(e) {
  // Список всех кликабельных элементов в приложении
  var interactiveElement = e.target.closest('button, a, .btn, .nav-item, .quest-choice-card, .card, .action-btn, input');
  
  // Если тапнули по кнопке — играем звук
  if (interactiveElement && window.TTAudio) {
    window.TTAudio.playRandomBounce();
  }
});
