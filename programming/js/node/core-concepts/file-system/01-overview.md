# Node.js: модуль `fs` — загальний огляд

## Загальна характеристика

`fs` («file system») — вбудований модуль Node.js для роботи з файловою системою операційної системи: читання й запис файлів, створення та видалення директорій, отримання метаданих (розмір, дата зміни), спостереження за змінами. Це один із найстаріших і найважливіших модулів Node.js: саме можливість працювати з файлами, якої немає в JavaScript у браузері з міркувань безпеки, — одна з головних причин, чому Node.js узагалі існує як окреме середовище виконання.

```js
const fs = require("fs");
console.log(typeof fs.readFile); // "function" — модуль доступний одразу, без встановлення через npm
```

## 1. Три стилі API: callback, sync, promises

Модуль `fs` історично пропонує **одну й ту саму** операцію в трьох різних стилях виклику. Розуміння цього критично важливе, бо змішування стилів — одна з найчастіших причин «дивних» багів (розділ 4).

Кожна демонстрація нижче — окремий, самодостатній скрипт зі своїми `require` і власним тимчасовим файлом. Це не випадково: якби кілька асинхронних демонстрацій ділили один файл і виконувались в одному процесі, порядок їхнього реального завершення на диску залежав би від планувальника ОС і не збігався б із порядком рядків у коді (саме ця властивість і демонструється в розділі 3).

### 1.1. Callback-стиль — найстаріший, ще до `async`/`await` у мові

Кожна функція приймає callback останнім аргументом за конвенцією Node.js «error-first» (детально — нотатка про асинхронний код): перший параметр callback'а — помилка, або `null`, якщо все гаразд.

```js
const fs = require("fs");
const os = require("os");
const path = require("path");
const callbackPath = path.join(os.tmpdir(), "fs-overview-callback.txt");

fs.writeFile(callbackPath, "Hello, file system!", (err) => {
  if (err) {
    console.error("Write error:", err);
    return;
  }
  fs.readFile(callbackPath, "utf-8", (err, data) => {
    if (err) {
      console.error("Read error:", err);
      return;
    }
    console.log("Callback style read:", data); // Callback style read: Hello, file system!
  });
});
```

### 1.2. Sync-стиль — блокує весь потік виконання до завершення

Функції з суфіксом `Sync` виконуються синхронно: код зупиняється на цьому рядку, поки операція введення-виведення не завершиться. Це прямо суперечить ідеї Node.js «не блокувати event loop»:

```js
const fs = require("fs");
const os = require("os");
const path = require("path");
const syncPath = path.join(os.tmpdir(), "fs-overview-sync.txt");

fs.writeFileSync(syncPath, "Initial content");
const syncContent = fs.readFileSync(syncPath, "utf-8"); // блокує тут усе інше
console.log("Sync style read:", syncContent); // Sync style read: Initial content
```

Sync-методи прийнятні лише в двох випадках:

- на самому старті застосунку, коли читають конфігурацію до того, як сервер почав приймати запити (блокування тут не шкодить, бо обслуговувати запити ще нікому);
- в одноразових CLI-скриптах, де немає інших одночасних задач.

У сервері, що обслуговує багато запитів одночасно, Sync-метод «заморозить» обробку всіх інших запитів на час операції введення-виведення: Node.js однопотоковий, і Sync-виклик блокує цей єдиний потік повністю.

### 1.3. Promise-стиль (`fs/promises`) — сучасний, рекомендований за замовчуванням

Той самий callback-API, але кожна функція повертає `Promise` — природно поєднується з `async`/`await`:

```js
const os = require("os");
const path = require("path");
const fsPromises = require("fs/promises"); // або: const fsPromises = require("fs").promises;
const promisePath = path.join(os.tmpdir(), "fs-overview-promise.txt");

async function readWithPromises() {
  await fsPromises.writeFile(promisePath, "Updated content via Promises");
  const content = await fsPromises.readFile(promisePath, "utf-8");
  console.log("Promise style read:", content); // Promise style read: Updated content via Promises
}
readWithPromises();
```

## 2. Чому існують усі три стилі

Callback-стиль з'явився першим: Node.js старший за `async`/`await` у самій мові на кілька років, тому й досі багато старого коду використовує callback'и. Sync-версії існували завжди як «простий шлях» для CLI-скриптів, де конкурентність не важлива. `fs/promises` з'явився значно пізніше (стабілізувався в Node.js 14) як місток між старим callback-API і сучасним стилем `async`/`await`.

Сьогодні для нового коду рекомендується `fs/promises` разом з `async`/`await`: він не блокує event loop, на відміну від Sync, і читається лінійно, без «піраміди» вкладених callback'ів (callback hell).

## 3. Асинхронні методи не блокують JS-потік

Асинхронні (не-Sync) методи `fs` не блокують JS-потік, бо реальна робота з диском виконується Node.js через внутрішній пул потоків (libuv thread pool) — окремий від головного JS-потоку. Коли операція на диску завершується, результат повертається в event loop як звичайна асинхронна подія, і виконується callback чи резолвиться `Promise`.

```js
const fs = require("fs");
const os = require("os");
const path = require("path");
const orderPath = path.join(os.tmpdir(), "fs-overview-order.txt");
fs.writeFileSync(orderPath, "for the ordering demo");

console.log("1: this line runs first");
fs.readFile(orderPath, "utf-8", () => {
  console.log("3: this one runs after all synchronous code and microtasks");
});
console.log("2: this line runs second, before the file read has finished");
```

Вивід — рівно в такому порядку: `"1: ..."`, `"2: ..."`, `"3: ..."`.

Ця гарантія — «спочатку весь синхронний код, потім асинхронні callback'и» — стосується **одного й того самого** асинхронного виклику відносно решти коду. Вона не гарантує порядок між **різними незалежними** асинхронними операціями (розділ 1): дві операції з диском можуть завершитися в будь-якому відносному порядку.

## 4. Пастка: змішування стилів або забутий `await`

Забутий `await` — `Promise` просто «висить» необробленим, а код продовжує виконуватися, ніби файл уже записаний, хоча це не так:

```js
const os = require("os");
const path = require("path");
const fsPromises = require("fs/promises");
const pitfallPath = path.join(os.tmpdir(), "fs-overview-pitfall.txt");

async function brokenSequence() {
  fsPromises.writeFile(pitfallPath, "new content"); // забуто await
  const content = await fsPromises.readFile(pitfallPath, "utf-8");
  console.log("Might have read the old content:", content); // непередбачувано
}
```

Результат непередбачуваний і залежить від того, яка з двох операцій — запис чи читання — фізично завершиться швидше. Правильно — чекати завершення запису перед читанням:

```js
async function correctSequence() {
  await fsPromises.writeFile(pitfallPath, "guaranteed written content");
  const content = await fsPromises.readFile(pitfallPath, "utf-8");
  console.log("Guaranteed read:", content); // Guaranteed read: guaranteed written content
}
correctSequence();
```

## Підсумок

- `fs` — вбудований модуль Node.js для роботи з файловою системою; можливість читати й писати файли — одна з причин, чому Node.js узагалі існує окремо від браузерного JS.
- Кожна операція `fs` існує у трьох стилях: callback (найстаріший, error-first конвенція), Sync (блокує event loop повністю) і Promise-стиль через `require("fs/promises")` (сучасний, для `async`/`await`).
- Sync-методи прийнятні лише на старті застосунку чи в CLI-скриптах без конкурентних задач; у сервері вони «заморожують» обробку всіх інших запитів, бо Node.js однопотоковий.
- Асинхронні методи не блокують JS-потік, бо реальна робота з диском виконується через внутрішній пул потоків (libuv), а результат повертається в event loop як звичайна асинхронна подія.
- `fs/promises` — рекомендований стиль для нового коду: не блокує, природно поєднується з `async`/`await`, без callback hell.
- Класична пастка: забутий `await` для методу `fs/promises` — код продовжує виконуватися, не дочекавшись реального завершення операції з диском.
- Порядок «спочатку синхронний код, потім callback» гарантований лише для однієї асинхронної операції відносно решти коду; між кількома незалежними асинхронними операціями порядок завершення не гарантований.

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Які три стилі API має `fs`?

**2.** Що поверне `fsp.writeFile` та `fsp.readFile` (рядок і буфер)?

```node
(async () => { const f = path.join(dir, 'a.txt'); const r = await fsp.writeFile(f, 'hello'); const s = await fsp.readFile(f, 'utf8'); const b = await fsp.readFile(f); return [r, s, b.constructor.name, b.length]; })()
```

**3.** Що станеться при читанні неіснуючого файлу (асинхронно)?

```node
(async () => { try { await fsp.readFile(path.join(dir, 'no.txt')); } catch (e) { return [e.code, e.syscall, e.errno]; } })()
```

**4.** А в синхронному стилі?

```node
(() => { try { fs.readFileSync(path.join(dir, 'no.txt')); } catch (e) { return [e.name, e.code]; } })()
```

### Рівень 2. Деталі й поведінка

**5.** Callback-стиль: що отримає колбек і в якому порядку відпрацює код?

```node
(async () => { const L = []; await new Promise(res => { fs.readFile(path.join(dir, 'no.txt'), (err, data) => { L.push('cb ' + err.code); res(); }); L.push('after call'); }); return L; })()
```

**6.** Порядок виконання: sync-читання проти async у одному тіку?

```node
(async () => { const f = path.join(dir, 'a.txt'); fs.writeFileSync(f, 'x'); const L = []; const p = fsp.readFile(f, 'utf8').then(() => L.push('async done')); L.push('sync before'); fs.readFileSync(f); L.push('sync after'); await p; return L; })()
```

**7.** Чи блокує `readFileSync` таймер, поставлений раніше?

```node
(async () => { const L = []; setTimeout(() => L.push('timer'), 0); fs.writeFileSync(path.join(dir, 'b'), 'x'); L.push('sync done'); await new Promise(r => setTimeout(r, 10)); return L; })()
```

**8.** Що станеться, якщо забути `await` перед `fsp.readFile`?

```node
(async () => { const f = path.join(dir, 'a.txt'); await fsp.writeFile(f, 'data'); const r = fsp.readFile(f, 'utf8'); return [r instanceof Promise, typeof r.then, await r]; })()
```

### Рівень 3. Нюанси та пастки

**9.** Що станеться, якщо змішати стилі: `fs.readFile` без колбека?

```node
(async () => { try { fs.readFile(path.join(dir, 'a')); } catch (e) { return [e.name, e.code]; } })()
```

**10.** Чи повертає `fs.writeFile` у callback-стилі значення?

```node
(async () => new Promise(res => fs.writeFile(path.join(dir, 'c'), 'x', (...a) => res(a))))()
```

**11.** Що поверне `fs.existsSync` та чому не варто використовувати його перед читанням?

```node
(() => { const f = path.join(dir, 'd'); const before = fs.existsSync(f); fs.writeFileSync(f, ''); return [before, fs.existsSync(f)]; })()
```

**12.** Як зчитати JSON-файл?

```node
(async () => { const f = path.join(dir, 'x.json'); await fsp.writeFile(f, JSON.stringify({ a: [1, 2], b: 'ок' })); return JSON.parse(await fsp.readFile(f, 'utf8')); })()
```

### Рівень 4. Практика

**13.** Що дасть `util.promisify(fs.readFile)`?

```node
(async () => { const { promisify } = process.getBuiltinModule('node:util'); const f = path.join(dir, 'e'); fs.writeFileSync(f, 'p'); return await promisify(fs.readFile)(f, 'utf8'); })()
```

**14.** Як паралельно прочитати кілька файлів?

```node
(async () => { const names = ['1', '2', '3']; await Promise.all(names.map(n => fsp.writeFile(path.join(dir, n), 'file' + n))); return await Promise.all(names.map(n => fsp.readFile(path.join(dir, n), 'utf8'))); })()
```

**15.** Що поверне `fs.constants` та `fsp.constants`?

```node
(() => [typeof fs.constants.R_OK, fs.constants.F_OK, fs.constants.R_OK, fs.constants.W_OK, fsp.constants === fs.constants])()
```

### Відповіді

1. Callback (`fs.readFile(path, cb)`), синхронний (`fs.readFileSync`), promise (`fs.promises.readFile` / `node:fs/promises`)
2. `[undefined, 'hello', 'Buffer', 5]`
3. `['ENOENT', 'open', -2]`
4. `['Error', 'ENOENT']`
5. `['after call', 'cb ENOENT']`
6. `['sync before', 'sync after', 'async done']`
7. `['sync done', 'timer']`
8. `[true, 'function', 'data']`
9. `['TypeError', 'ERR_INVALID_ARG_TYPE']`
10. `[null]`
11. `[false, true]`
12. `{ a: [1, 2], b: 'ок' }`
13. `'p'`
14. `['file1', 'file2', 'file3']`
15. `['number', 0, 4, 2, true]`
