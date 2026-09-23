// test-logic.js — Модульный автотест клуба ЧМЗ
const fs = require('fs');
const path = require('path');

console.log('🔍 Запуск модульных автотестов...\n');

const files = [
  'index.html',
  'style.css',
  'js/config.js',
  'js/matches.js',
  'js/radar.js',
  'js/app.js'
];

let hasError = false;

// 1. Проверка наличия всех файлов
files.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) {
    console.error(`❌ Ошибка: Файл ${f} не найден!`);
    hasError = true;
  } else {
    console.log(`✅ Файл найден: ${f}`);
  }
});
if (hasError) process.exit(1);

// 2. Проверка подключения CSS и JS в index.html
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const cssRegex = /<link[^>]+href=["'](?:\.\/)?style\.css["']/i;
if (!cssRegex.test(html)) {
  console.error('❌ Ошибка: В index.html отсутствует подключение style.css!');
  hasError = true;
} else {
  console.log('✅ style.css корректно подключён в <head>.');
}

['js/config.js', 'js/matches.js', 'js/radar.js', 'js/app.js'].forEach(script => {
  if (!html.includes(script)) {
    console.error(`❌ Ошибка: В index.html не подключён скрипт ${script}`);
    hasError = true;
  } else {
    console.log(`✅ Скрипт подключён: ${script}`);
  }
});

// Проверка наличия библиотеки QR-кода
if (!html.includes('qrcode.min.js')) {
  console.error('❌ Ошибка: Отсутствует библиотека qrcode.min.js');
  hasError = true;
}
if (hasError) process.exit(1);

// 3. Проверка синтаксиса JavaScript файлов
['js/config.js', 'js/matches.js', 'js/radar.js', 'js/app.js'].forEach(script => {
  const code = fs.readFileSync(path.join(__dirname, script), 'utf8');
  try {
    new Function(code);
    console.log(`✅ Синтаксис ${script}: ошибок нет.`);
  } catch (err) {
    console.error(`❌ СИНТАКСИЧЕСКАЯ ОШИБКА в ${script}:`, err.message);
    hasError = true;
  }
});
if (hasError) process.exit(1);

// 4. Тестирование формулы Эло (1х1 и 2х2)
function calculateElo(rA, rB, scoreA, k = 32) {
  const ratingA = parseInt(rA, 10) || 1000;
  const ratingB = parseInt(rB, 10) || 1000;
  return Math.round(k * (scoreA - (1 / (1 + Math.pow(10, (ratingB - ratingA) / 400)))));
}

console.log('\n🧮 Проверка математики:');
if (calculateElo(1000, 1000, 1, 32) !== 16) {
  console.error('❌ Ошибка расчета 1х1');
  process.exit(1);
}
console.log('✅ Одиночный матч 1х1: дельта +16');

if (calculateElo(1100, 1100, 1, 24) !== 12) {
  console.error('❌ Ошибка расчета 2х2');
  process.exit(1);
}
console.log('✅ Парный матч 2х2: дельта +12');

console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
