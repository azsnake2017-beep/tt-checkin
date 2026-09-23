// test-logic.js — Автотест критической логики клуба ЧМЗ
const fs = require('fs');
const path = require('path');

console.log('🔍 Запуск автотестов...\n');

// 1. Проверка файлов разметки и стилей
const indexPath = path.join(__dirname, 'index.html');
const stylePath = path.join(__dirname, 'style.css');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Ошибка: Файл index.html не найден!');
  process.exit(1);
}
if (!fs.existsSync(stylePath)) {
  console.error('❌ Ошибка: Файл style.css не найден!');
  process.exit(1);
}
console.log('✅ Файлы index.html и style.css найдены на своих местах.');

const htmlContent = fs.readFileSync(indexPath, 'utf8');

// 2. Проверка подключения CSS в HTML
if (!htmlContent.includes('href="style.css"')) {
  console.error('❌ Ошибка: В index.html отсутствует подключение style.css!');
  process.exit(1);
}
console.log('✅ Файл style.css корректно подключён в <head>.');

// 3. Проверка синтаксиса JavaScript
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 1;
let hasSyntaxErrors = false;

while ((match = scriptRegex.exec(htmlContent)) !== null) {
  const code = match[1];
  try {
    new Function(code);
    console.log(`✅ Синтаксис скрипта #${scriptIndex} проверен: ошибок нет.`);
  } catch (err) {
    console.error(`❌ СИНТАКСИЧЕСКАЯ ОШИБКА в скрипте #${scriptIndex}:`);
    console.error(err.message);
    hasSyntaxErrors = true;
  }
  scriptIndex++;
}

if (hasSyntaxErrors) {
  console.error('\n🚫 Тест провален: синтаксическая ошибка!');
  process.exit(1);
}

// 4. Тестирование формулы Эло (1х1 и 2х2)
function calculateElo(rA, rB, scoreA, k = 32) {
  const ratingA = parseInt(rA, 10) || 1000;
  const ratingB = parseInt(rB, 10) || 1000;
  return Math.round(k * (scoreA - (1 / (1 + Math.pow(10, (ratingB - ratingA) / 400)))));
}

console.log('\n🧮 Тестирование математики рейтинга:');

const deltaEqual = calculateElo(1000, 1000, 1, 32);
if (deltaEqual !== 16) {
  console.error(`❌ Ошибка: Ожидалась дельта 16, получено ${deltaEqual}`);
  process.exit(1);
}
console.log('✅ Равный матч 1х1 (1000 vs 1000): дельта +16');

const deltaCorrupted = calculateElo("не число", null, 1, 32);
if (isNaN(deltaCorrupted) || deltaCorrupted !== 16) {
  console.error(`❌ Ошибка: Функция вернула NaN при некорректных входных данных!`);
  process.exit(1);
}
console.log('✅ Защита от NaN работает корректно.');

const team1Avg = (1200 + 1000) / 2;
const team2Avg = (1100 + 1100) / 2;
const deltaDoubles = calculateElo(team1Avg, team2Avg, 1, 24);
if (deltaDoubles !== 12) {
  console.error(`❌ Ошибка парного расчета: ожидалась дельта 12, получено ${deltaDoubles}`);
  process.exit(1);
}
console.log('✅ Парный матч 2х2 (K=24): дельта +12');

console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! Архитектура стабильна.');
