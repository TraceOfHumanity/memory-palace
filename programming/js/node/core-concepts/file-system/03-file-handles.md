# Node.js: файлові дескриптори, `FileHandle` та частковий доступ

## 1. Що таке файловий дескриптор (file descriptor) і `FileHandle`

Коли операційна система відкриває файл, вона видає програмі числовий «ідентифікатор» цього відкритого файлу — файловий дескриптор (file descriptor, `fd`). Усі подальші операції (читання, запис, закриття) відбуваються через цей дескриптор, а не через ім'я файлу знову — ОС уже знає, про який саме файл ідеться, і де в ньому зараз «позиція курсора».

У Node.js (`fs/promises`) цей дескриптор «обгорнутий» в об'єкт `FileHandle` — зручний інтерфейс із методами `read()`/`write()`/`close()` тощо, що під капотом використовує цей самий `fd`.

```js
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "fs-filehandle-demo.txt");
```

## 2. `fs.open()` — отримати `FileHandle`

```js
const fileHandle = await fs.open(demoFilePath, "w"); // "w" — детально прапорці, розділ 4
console.log(typeof fileHandle.read);  // "function"
console.log(typeof fileHandle.write); // "function"
console.log(typeof fileHandle.close); // "function"

await fileHandle.write("Hello file content"); // ASCII — щоб кожен символ = рівно 1 байт
                                                  // (для кирилиці/емодзі байти й символи
                                                  // не збігаються 1:1 — детально нотатка
                                                  // про Buffer; «розрізати» такий текст
                                                  // посеред символу за фіксованою кількістю
                                                  // байтів дало б биту UTF-8-послідовність)
await fileHandle.close(); // обов'язково закривати — розділ 5
```

## 3. Частковий запис і читання за конкретною позицією (offset)

`readFile()`/`writeFile()` (детально — нотатка про читання й запис файлів) завжди працюють із файлом цілком. `FileHandle` дозволяє читати й писати рівно стільки байтів, скільки треба, починаючи з конкретної позиції, — без торкання решти файлу:

```js
const rwHandle = await fs.open(demoFilePath, "r+"); // "r+" — читання й запис, файл має вже існувати

// читаємо байти 0-4 (перших 5 байтів файлу):
const readBuffer = Buffer.alloc(5);
await rwHandle.read(readBuffer, 0, 5, 0); // (буфер, offset у буфері, скільки байтів, позиція у файлі)
console.log(readBuffer.toString("utf-8")); // "Hello" (перші 5 байтів = перші 5 символів ASCII)

// перезаписуємо лише байти, що починаються з позиції 0, не чіпаючи решту:
await rwHandle.write("REPLACED", 0, "utf-8"); // (дані, позиція у файлі, кодування)
await rwHandle.close();

console.log(await fs.readFile(demoFilePath, "utf-8"));
// "REPLACEDle content" — лише перші 8 байтів ("Hello fi" → "REPLACED")
// змінилися, решта ("le content") залишилась тією ж, що й була
```

## 4. File system flags — повний набір «режимів» відкриття файлу

- `"r"` — читання; помилка, якщо файл не існує
- `"r+"` — читання й запис; помилка, якщо файл не існує
- `"w"` — запис; створює файл, якщо не існує; обрізає до 0 (стирає!), якщо існує
- `"w+"` — читання й запис; те саме, що `"w"` (створює/обрізає)
- `"a"` — допис у кінець; створює файл, якщо не існує
- `"a+"` — читання й допис у кінець; створює, якщо не існує
- `"wx"` — як `"w"`, але помилка (`EEXIST`), якщо файл уже існує (детально показано в нотатці про читання й запис файлів)
- `"ax"` — як `"a"`, але теж помилка, якщо файл уже існує

```js
const flagsDemoPath = path.join(os.tmpdir(), "fs-flags-demo.txt");
await fs.rm(flagsDemoPath, { force: true });

const wHandle = await fs.open(flagsDemoPath, "w");
await wHandle.close();
console.log("File created via 'w' flag");

try {
  await fs.open(flagsDemoPath, "r"); // файл уже є — "r" відкриє без помилки
  console.log("'r' opened the existing file successfully");
} catch (err) {
  console.log("Unexpected error:", err.code);
}

await fs.rm(flagsDemoPath, { force: true });
try {
  await fs.open(flagsDemoPath, "r"); // а тепер файлу немає
} catch (err) {
  console.log("'r' on a missing file:", err.code); // "ENOENT"
}
```

## 5. Чому обов'язково закривати `FileHandle` (`close()`)

Кожен відкритий файловий дескриптор — це обмежений ресурс операційної системи (у більшості ОС — ліміт у кілька тисяч одночасно відкритих дескрипторів на процес). Якщо не закривати `FileHandle` після використання — це класичний «resource leak» (витік ресурсу, аналогічний витоку пам'яті, але для дескрипторів, а не пам'яті) — рано чи пізно процес отримає помилку `EMFILE: too many open files` і не зможе відкрити жодного нового файлу чи сокета.

Надійний патерн — `try`/`finally`, щоб `close()` викликався навіть при помилці всередині `try`:

```js
async function safeFileOperation(filePath) {
  const handle = await fs.open(filePath, "r+");
  try {
    const buffer = Buffer.alloc(5);
    await handle.read(buffer, 0, 5, 0);
    return buffer.toString("utf-8");
  } finally {
    await handle.close(); // гарантовано виконається, навіть якщо read() кине помилку
  }
}
await fs.writeFile(demoFilePath, "12345");
console.log(await safeFileOperation(demoFilePath));
```

Альтернатива — `using`-декларація (ES2023+/Node.js з підтримкою) чи `fileHandle[Symbol.asyncDispose]` — сучасніший, але поки що рідше використовуваний підхід; `try`/`finally` — надійний вибір, який працює в будь-якій версії Node.js.

## 6. `stat()` через `FileHandle` — метадані відкритого файлу

```js
const statHandle = await fs.open(demoFilePath, "r");
const stats = await statHandle.stat();
console.log("File size (bytes):", stats.size);
console.log("Is file?", stats.isFile());
console.log("Is directory?", stats.isDirectory());
await statHandle.close();
```

Детально повний набір `stat`-полів — у нотатці про директорії та метадані.

## Прибирання

```js
await fs.rm(demoFilePath, { force: true });
await fs.rm(flagsDemoPath, { force: true });
```

## Підсумок

- Файловий дескриптор (`fd`) — числовий «ідентифікатор» відкритого файлу від ОС; `FileHandle` у Node.js — зручна обгортка над ним.
- `fs.open(path, flag)` повертає `FileHandle` із методами `read()`/`write()`/`close()`/`stat()` тощо.
- На відміну від `readFile()`/`writeFile()`, `FileHandle` дозволяє читати й писати рівно потрібну кількість байтів, починаючи з конкретної позиції (offset), не чіпаючи решту файлу.
- Прапорці визначають режим доступу: `r`/`r+` (читання, файл має існувати), `w`/`w+` (запис, створює або обрізає до нуля), `a`/`a+` (дописування, створює за потреби), `wx`/`ax` (як `w`/`a`, але помилка, якщо файл уже є).
- Незакритий `FileHandle` — витік файлового дескриптора (обмежений ресурс ОС) — завжди закривайте через `close()`, найнадійніше — у блоці `finally`, щоб це відбувалось навіть при помилці.
- `FileHandle` теж має `stat()` для метаданих (розмір, тип) без потреби відкривати файл заново через шлях.

## Задачі для закріплення

18 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Що таке файловий дескриптор?

**2.** Що поверне `fsp.open` і чим є `fd`?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w'); const r = [h.constructor.name, typeof h.fd, h.fd > 2]; await h.close(); return r; })()
```

**3.** Що поверне `h.write` і чи змінює він позицію?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w'); const r1 = await h.write('abc'); const r2 = await h.write('def'); await h.close(); return [r1.bytesWritten, r2.bytesWritten, fs.readFileSync(path.join(dir, 'a'), 'utf8')]; })()
```

**4.** Що поверне `h.read` при читанні за кінцем файлу?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'abc'); const h = await fsp.open(f, 'r'); const a = await h.read(Buffer.alloc(10), 0, 10, 0); const b = await h.read(Buffer.alloc(10), 0, 10, 3); await h.close(); return [a.bytesRead, b.bytesRead]; })()
```

**5.** Що станеться при запису у файл, відкритий лише для читання?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'abc'); const h = await fsp.open(f, 'r'); try { await h.write('x'); } catch (e) { return e.code; } finally { await h.close(); } })()
```

### Рівень 2. Деталі й поведінка

**6.** Що дає прапорець `'r+'` для неіснуючого файлу?

```node
(async () => { try { await fsp.open(path.join(dir, 'nope'), 'r+'); } catch (e) { return e.code; } })()
```

**7.** Що дає `'w+'` для існуючого файлу?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'old content'); const h = await fsp.open(f, 'w+'); const s = await h.stat(); await h.close(); return s.size; })()
```

**8.** Що дає `'a+'`: позиція запису та читання?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'abc'); const h = await fsp.open(f, 'a+'); await h.write('Z', 0); const r = await h.read(Buffer.alloc(10), 0, 10, 0); await h.close(); return [r.bytesRead, r.buffer.subarray(0, r.bytesRead).toString()]; })()
```

**9.** Що дає `'wx'` для існуючого та неіснуючого файлу?

```node
(async () => { const f = path.join(dir, 'a'); const h = await fsp.open(f, 'wx'); await h.close(); try { await fsp.open(f, 'wx'); } catch (e) { return e.code; } })()
```

**10.** Що поверне `h.stat()`: розмір та тип?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'hello'); const h = await fsp.open(f); const s = await h.stat(); await h.close(); return [s.size, s.isFile(), s.isDirectory()]; })()
```

### Рівень 3. Нюанси та пастки

**11.** Що станеться при використанні закритого `FileHandle`?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w'); await h.close(); try { await h.write('x'); } catch (e) { return e.code; } })()
```

**12.** Що відбудеться при подвійному `close()`?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w'); await h.close(); await h.close(); return 'ok'; })()
```

**13.** Як `await using` або `try/finally` гарантує закриття?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w'); try { await h.write('x'); } finally { await h.close(); } return h.fd; })()
```

**14.** Що поверне `h.readFile` та `h.writeFile`?

```node
(async () => { const h = await fsp.open(path.join(dir, 'a'), 'w+'); await h.writeFile('hello'); const h2 = await fsp.open(path.join(dir, 'a')); const s = await h2.readFile('utf8'); await h.close(); await h2.close(); return s; })()
```

**15.** Що поверне `h.truncate` і `h.sync`?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, '0123456789'); const h = await fsp.open(f, 'r+'); await h.truncate(4); await h.sync(); await h.close(); return fs.readFileSync(f, 'utf8'); })()
```

### Рівень 4. Практика

**16.** Що поверне `h.readLines()`?

```node
(async () => { const f = path.join(dir, 'a'); await fsp.writeFile(f, 'l1\nl2\nl3'); const h = await fsp.open(f); const r = []; for await (const l of h.readLines()) r.push(l); return r; })()
```

**17.** Що поверне `fs.openSync`, `readSync`, `closeSync` у синхронному стилі?

```node
(() => { const f = path.join(dir, 'a'); fs.writeFileSync(f, 'xyz'); const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(3); const n = fs.readSync(fd, b, 0, 3, 0); fs.closeSync(fd); return [n, b.toString()]; })()
```

**18.** Скільки одночасно відкритих дескрипторів можна тримати? (відкрийте 50 і закрийте)

```node
(async () => { const hs = []; for (let i = 0; i < 50; i++) hs.push(await fsp.open(path.join(dir, 'f' + i), 'w')); const n = new Set(hs.map(h => h.fd)).size; await Promise.all(hs.map(h => h.close())); return n; })()
```

### Відповіді

1. Невелике ціле число (у `FileHandle` — об'єкт), яким ОС позначає відкритий файл у процесі; через нього виконуються читання, запис і метадані
2. `['FileHandle', 'number', true]`
3. `[3, 3, 'abcdef']`
4. `[3, 0]`
5. `'EBADF'`
6. `'ENOENT'`
7. `0`
8. `[3, 'Zbc']`
9. `'EEXIST'`
10. `[5, true, false]`
11. `'EBADF'`
12. `'ok'`
13. `-1`
14. `'hello'`
15. `'0123'`
16. `['l1', 'l2', 'l3']`
17. `[3, 'xyz']`
18. `50`
