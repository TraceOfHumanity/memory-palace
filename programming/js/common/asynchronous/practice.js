// ==========================================================================
// ПРАКТИКА: АСИНХРОННИЙ КОД
// ==========================================================================
// Власні експерименти. Теорія — у asynchronous.md (поруч).
// Запуск: node practice.js
//
// Ідеї для експериментів:
//   - порядок виконання: синхронний код → microtasks (Promise, queueMicrotask,
//     process.nextTick) → macrotasks (setTimeout, setImmediate, I/O)
//   - Promise.all / allSettled / race / any — що повертають і коли падають
//   - послідовний vs паралельний await (for..of + await проти Promise.all)
//   - обробка помилок: try/catch, .catch, необроблений rejection
//   - AbortController, таймаути, скасування
//   - обмеження паралелізму (черга з N воркерів)
//   - retry з експоненційною затримкою
//   - async-ітератори та for await...of

// Допоміжна функція: Promise-версія setTimeout
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Допоміжна функція: лог із часом від старту (зручно бачити паралелізм)
const t0 = Date.now();
const log = (...args) => console.log(`[${String(Date.now() - t0).padStart(4)}мс]`, ...args);


// --------------------------------------------------------------------------
// Експеримент 1: порядок виконання
// --------------------------------------------------------------------------
// Передбач вивід ДО запуску, потім перевір.

console.log("1. синхронно: початок");

setTimeout(() => console.log("5. macrotask: setTimeout"), 0);

Promise.resolve().then(() => console.log("3. microtask: promise.then"));

queueMicrotask(() => console.log("4. microtask: queueMicrotask"));

console.log("2. синхронно: кінець");


// --------------------------------------------------------------------------
// Місце для власних експериментів
// --------------------------------------------------------------------------

async function main() {
  await sleep(50); // дочекатись виводу першого експерименту
  log("main почався");

  // Твій код тут:

}

main().catch((err) => console.error("Помилка:", err));
