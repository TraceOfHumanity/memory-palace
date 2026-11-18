# Streams: Writable streams і backpressure

Приклади цієї нотатки — одна `async`-функція `main()`, що працює з тимчасовими файлами.

```js
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "streams-writable-demo.txt");

async function main() {
```

## 1. write() і end() — основні методи

- `write(chunk)` — додати дані;
- `end([chunk])` — завершити запис, за бажанням дописавши останній шматок (скорочення для «`write()` + завершити»);
- подія `"finish"` — усі дані передано в нижній рівень (ОС); `"close"` — ресурс (файловий дескриптор) закрито.

Після `end()` писати вже не можна — `write()` дасть помилку `ERR_STREAM_WRITE_AFTER_END`.

```js
  await new Promise((resolve) => {
    const writeStream = fs.createWriteStream(demoFilePath);

    writeStream.write("First line\n");
    writeStream.write("Second line\n");
    writeStream.end("Last line\n"); // end() приймає останній шматок

    writeStream.on("finish", () => {
      console.log("Writing finished ('finish' event)"); // Writing finished ('finish' event)
      resolve();
    });
  });
  console.log(await fsPromises.readFile(demoFilePath, "utf-8"));
  // First line
  // Second line
  // Last line
```

## 2. Backpressure — чому write() повертає boolean

`write()` повертає сигнал, чи внутрішній буфер Writable ще нижче `highWaterMark`:

- `true` — місце в буфері є, можна писати далі;
- `false` — буфер досяг `highWaterMark`: приймач (диск, мережа) не встигає за темпом запису.

Це і є **backpressure** («зворотний тиск»): сигнал «зупинись, інакше пам'ять ростиме без обмежень, бо дані накопичуються швидше, ніж приймач їх обробляє». Важливо: `false` — лише **порада**. Дані з цього виклику все одно прийнято в буфер, нічого не губиться — але продовжувати писати не можна.

```js
  const backpressureDemoPath = path.join(os.tmpdir(), "streams-backpressure-demo.txt");

  await new Promise((resolve) => {
    const writeStream = fs.createWriteStream(backpressureDemoPath, { highWaterMark: 16 }); // штучно малий
    const chunk = "0123456789".repeat(5); // 50 байтів — більше за highWaterMark

    const canContinue = writeStream.write(chunk);
    console.log("write() returned:", canContinue); // write() returned: false — буфер переповнено
    console.log("buffered bytes:", writeStream.writableLength); // buffered bytes: 50 — але дані прийнято

    writeStream.end();
    writeStream.on("finish", resolve);
  });
```

## 3. Подія "drain" — коли можна продовжувати

Якщо `write()` повернув `false`, правильна поведінка — зупинитися і дочекатися події `"drain"` («буфер спорожнів»):

```js
  await new Promise((resolve) => {
    const bpFilePath = path.join(os.tmpdir(), "streams-backpressure-manual.txt");
    const writeStream = fs.createWriteStream(bpFilePath, { highWaterMark: 16 });

    let i = 0;
    const total = 20;
    let pauses = 0;

    function writeNext() {
      let canContinue = true;
      while (i < total && canContinue) {
        i++;
        canContinue = writeStream.write(`piece-${i};`);
      }
      if (i < total) {
        pauses++;
        writeStream.once("drain", writeNext); // продовжуємо лише після 'drain'
      } else {
        writeStream.end(() => {
          console.log(`wrote ${total} pieces, paused for 'drain' ${pauses} times`); // wrote 20 pieces, paused for 'drain' 9 times
          fs.rmSync(bpFilePath, { force: true });
          resolve();
        });
      }
    }
    writeNext();
  });
```

Кожен шматок (`piece-1;` — 8 байтів) разом із попереднім переповнює буфер у 16 байтів, тож пауза настає приблизно на кожному другому записі.

Якщо ігнорувати backpressure і писати далі незалежно від результату `write()`, внутрішній буфер росте без обмежень — неконтрольоване споживання пам'яті. Це той самий принцип «не створюй більше, ніж можеш обробити», що й у [05-gc-patterns.md](../../../performance/05-gc-patterns.md), лише для буферів потоків.

Замість ручного циклу з колбеками зручно дочекатися `"drain"` через `events.once`:

```js
  const { once } = require("events");
  const drainDemoPath = path.join(os.tmpdir(), "streams-drain-once.txt");
  const drainStream = fs.createWriteStream(drainDemoPath, { highWaterMark: 16 });
  for (let n = 1; n <= 20; n++) {
    if (!drainStream.write(`piece-${n};`)) {
      await once(drainStream, "drain"); // лінійний код замість рекурсії через колбеки
    }
  }
  drainStream.end();
  await once(drainStream, "finish");
  console.log("async/await + once('drain'):", (await fsPromises.readFile(drainDemoPath, "utf-8")).length, "bytes"); // async/await + once('drain'): 171 bytes
  await fsPromises.rm(drainDemoPath, { force: true });
```

## 4. Правильне рішення: pipe()/pipeline() обробляють backpressure самі

Ручне керування backpressure (розділ 3) громіздке й схильне до помилок. Тому існують `readable.pipe()` і `pipeline()`: вони самі стежать за `write()`/`"drain"` і призупиняють чи відновлюють Readable, коли треба ([04-piping-and-backpressure.md](04-piping-and-backpressure.md)).

## 5. cork() / uncork() — накопичити й відправити одним пакетом

`cork()` «затикає» потік: усі наступні `write()` накопичуються у внутрішній черзі, не йдучи в нижній рівень. `uncork()` відкриває — накопичене відправляється одним пакетом (для потоків, що реалізують `_writev`, — одним системним викликом). Корисно, коли багато дрібних `write()` поспіль, — той самий принцип «об'єднай кілька операцій в одну», що й `Buffer.concat()` ([buffer.md](../buffers/buffer.md), розділ 7).

```js
  await new Promise((resolve) => {
    const corkPath = path.join(os.tmpdir(), "streams-cork-demo.txt");
    const writeStream = fs.createWriteStream(corkPath);

    writeStream.cork();
    for (let i = 0; i < 5; i++) {
      writeStream.write(`part ${i}\n`); // накопичуються, ще не відправлені
    }
    console.log("corked, buffered:", writeStream.writableLength, "bytes"); // corked, buffered: 35 bytes
    process.nextTick(() => writeStream.uncork()); // рекомендований спосіб — у наступному тіку

    writeStream.end(() => {
      console.log("cork()/uncork() example finished"); // cork()/uncork() example finished
      fs.rmSync(corkPath, { force: true });
      resolve();
    });
  });

  await fsPromises.rm(demoFilePath, { force: true }); // прибирання
  await fsPromises.rm(backpressureDemoPath, { force: true });
}

main().catch((err) => console.error("Demo failed:", err));
```

`uncork()` треба викликати стільки разів, скільки було `cork()`. `end()` також знімає всі `cork()`.

## Підсумок

- `write(chunk)` додає дані; `end([chunk])` завершує запис; `"finish"` — усі дані передано ОС, `"close"` — ресурс закрито; запис після `end()` — помилка.
- `write()` повертає `true`, поки буфер нижче `highWaterMark`, і `false`, коли він переповнений; дані при цьому все одно прийнято.
- Backpressure: отримавши `false`, зупинись і дочекайся `"drain"`; з async/await зручно `await once(stream, "drain")`.
- Ігнорування backpressure — необмежене зростання буфера в пам'яті.
- `pipe()`/`pipeline()` роблять це автоматично — рекомендований спосіб з'єднувати потоки.
- `cork()`/`uncork()` накопичують кілька `write()` і відправляють їх одним пакетом.

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Що повертає `write()` для малого та великого чанка (highWaterMark 10)?

```node
(() => { const w = new Writable({ highWaterMark: 10, write(c, e, cb) { setTimeout(cb, 5); } }); return [w.write('abc'), w.write('x'.repeat(20)), w.writableLength, w.writableNeedDrain]; })()
```

**2.** Що означає `false` з `write()` і коли виникає `drain`?

```node
(async () => { const w = new Writable({ highWaterMark: 4, write(c, e, cb) { setTimeout(cb, 5); } }); const r = w.write('12345'); const t = Date.now(); await events.once(w, 'drain'); return [r, w.writableLength, Date.now() - t >= 4]; })()
```

**3.** Що виведе порядок: `write`, `end`, `finish`, `close`?

```node
(async () => { const L = []; const w = new Writable({ write(c, e, cb) { L.push('write ' + c); cb(); } }); w.on('finish', () => L.push('finish')); w.on('close', () => L.push('close')); w.write('a'); w.end('b'); await events.once(w, 'close'); return L; })()
```

**4.** Що станеться, якщо викликати `write` після `end`?

```node
(async () => { const w = new Writable({ write(c, e, cb) { cb(); } }); w.end(); const err = events.once(w, 'error'); w.write('x'); const [e] = await err; return e.code; })()
```

### Рівень 2. Деталі й поведінка

**5.** Чи є `end(chunk)` скороченням `write(chunk); end()`?

```node
(async () => { const out = []; const w = new Writable({ write(c, e, cb) { out.push(c.toString()); cb(); } }); w.end('last'); await events.once(w, 'finish'); return out; })()
```

**6.** Що станеться при помилці в `write` (колбек з `err`)?

```node
(async () => { const w = new Writable({ write(c, e, cb) { cb(new Error('disk full')); } }); const p = events.once(w, 'error'); w.write('x'); const [e] = await p; return [e.message, w.destroyed]; })()
```

**7.** Що поверне `writable.writableHighWaterMark` за замовчуванням?

```node
[new Writable().writableHighWaterMark, new Writable({ objectMode: true }).writableHighWaterMark]
```

**8.** Запис у файл через `createWriteStream` та перевірка вмісту.

```node
(async () => { const f = path.join(dir, 'o.txt'); const w = fs.createWriteStream(f); w.write('hello '); w.end('world'); await events.once(w, 'finish'); return fs.readFileSync(f, 'utf8'); })()
```

### Рівень 3. Нюанси та пастки

**9.** Що станеться з бекпрешером при ігноруванні `false` (кількість у пам'яті)?

```node
(async () => { const w = new Writable({ highWaterMark: 16, write(c, e, cb) { setTimeout(cb, 1); } }); let falses = 0; for (let i = 0; i < 100; i++) if (!w.write('x'.repeat(8))) falses++; const len = w.writableLength; w.destroy(); return [falses > 0, len]; })()
```

**10.** Правильний цикл запису з очікуванням `drain`.

```node
(async () => { let slow = 0; const out = []; const w = new Writable({ highWaterMark: 16, write(c, e, cb) { out.push(c.length); setTimeout(cb, 1); } }); for (let i = 0; i < 20; i++) { if (!w.write('x'.repeat(8))) { slow++; await events.once(w, 'drain'); } } w.end(); await events.once(w, 'finish'); return [out.length, slow > 0, w.writableLength]; })()
```

**11.** Що дає `cork()` та `uncork()`: скільки викликів `_writev`?

```node
(async () => { let writev = 0, writes = 0; const w = new Writable({ write(c, e, cb) { writes++; cb(); }, writev(chunks, cb) { writev++; cb(); } }); w.cork(); w.write('a'); w.write('b'); w.write('c'); w.uncork(); w.end(); await events.once(w, 'finish'); return [writev, writes]; })()
```

**12.** Чи може `final` виконатися перед `finish`?

```node
(async () => { const L = []; const w = new Writable({ write(c, e, cb) { cb(); }, final(cb) { L.push('final'); cb(); } }); w.on('finish', () => L.push('finish')); w.end('x'); await events.once(w, 'close'); return L; })()
```

### Рівень 4. Практика

**13.** Що повертає `writable.writableFinished` та `writableEnded`?

```node
(async () => { const w = new Writable({ write(c, e, cb) { cb(); } }); const a = [w.writableEnded, w.writableFinished]; w.end(); const b = [w.writableEnded, w.writableFinished]; await events.once(w, 'finish'); return [a, b, [w.writableEnded, w.writableFinished]]; })()
```

**14.** Що відбудеться з `decodeStrings: false`?

```node
(async () => { const t = []; const w = new Writable({ decodeStrings: false, write(c, e, cb) { t.push(typeof c); cb(); } }); w.write('str'); w.write(Buffer.from('b')); w.end(); await events.once(w, 'finish'); return t; })()
```

**15.** Запис об'єктів у `objectMode` потік.

```node
(async () => { const out = []; const w = new Writable({ objectMode: true, write(o, e, cb) { out.push(o.n * 2); cb(); } }); w.write({ n: 1 }); w.end({ n: 2 }); await events.once(w, 'finish'); return out; })()
```

### Відповіді

1. `[true, false, 23, true]`
2. `[false, 0, true]`
3. `['write a', 'write b', 'finish', 'close']`
4. `'ERR_STREAM_WRITE_AFTER_END'`
5. `['last']`
6. `['disk full', true]`
7. `[65536, 16]`
8. `'hello world'`
9. `[true, 800]`
10. `[20, true, 0]`
11. `[1, 0]`
12. `['final', 'finish']`
13. `[[false, false], [true, false], [true, true]]`
14. `['string', 'object']`
15. `[2, 4]`
