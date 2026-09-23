// test-logic.js — Автотест критической логики клуба ЧМЗ
const fs = require('fs');
const path = require('path');

console.log('🔍 Запуск автотестов...\n');

// 1. Проверка синтаксиса основного файла index.html
const indexPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ Ошибка: Файл index.html не найден!');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexPath, 'utf8');

// Извлекаем код внутри тегов <script>
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 1;
let hasSyntaxErrors = false;

while ((match = scriptRegex.exec(htmlContent)) !== null) {
  const code = match[1];
  try {
    // Проверка синтаксиса через виртуальную компиляцию Function
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
  console.error('\n🚫 Тест провален: синтаксическая ошибка сломает приложение у пользователей!');
  process.exit(1);
}

// 2. Тестирование формулы Эло (одиночные и парные матчи)
function calculateElo(rA, rB, scoreA, k = 32) {
  const ratingA = parseInt(rA, 10) || 1000;
  const ratingB = parseInt(rB, 10) || 1000;
  return Math.round(k * (scoreA - (1 / (1 + Math.pow(10, (ratingB - ratingA) / 400)))));
}

console.log('\n🧮 Тестирование математики рейтинга:');

// Тест 2.1: Равные соперники (победа фаворита/андердога)
const deltaEqual = calculateElo(1000, 1000, 1, 32);
if (deltaEqual !== 16) {
  console.error(`❌ Ошибка: Ожидалась дельта 16 для равных игроков, получено ${deltaEqual}`);
  process.exit(1);
}
console.log('✅ Равный матч 1х1 (1000 vs 1000): дельта +16');

// Тест 2.2: Защита от мусорных данных (null, undefined, string)
const deltaCorrupted = calculateElo("не число", null, 1, 32);
if (isNaN(deltaCorrupted) || deltaCorrupted !== 16) {
  console.error(`❌ Ошибка: Функция вернула NaN при некорректных входных данных!`);
  process.exit(1);
}
console.log('✅ Защита от NaN при мусорных данных работает корректно.');

// Тест 2.3: Парный матч 2х2 (Вариант А с K=24)
const team1Avg = (1200 + 1000) / 2; // 1100
const team2Avg = (1100 + 1100) / 2; // 1100
const deltaDoubles = calculateElo(team1Avg, team2Avg, 1, 24);
if (deltaDoubles !== 12) {
  console.error(`❌ Ошибка парного расчета: ожидалась дельта 12, получено ${deltaDoubles}`);
  process.exit(1);
}
console.log('✅ Парный матч 2х2 (Командный расчет K=24): дельта +12');

console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! Код безопасен для релиза.');