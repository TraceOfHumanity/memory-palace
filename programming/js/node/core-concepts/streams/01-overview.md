# Streams: загальний огляд

## 1. Проблема, яку вирішують streams

`fs.readFile()` ([02-reading-and-writing-files.md](../file-system/02-reading-and-writing-files.md), розділ 5) завантажує **весь** файл у пам'ять, перш ніж повернути результат. Для файлу на 10 МБ — нормально. Для файлу на кілька гігабайтів — ні: пам'ять процесу може закінчитися раніше, ніж файл вдасться обробити. До того ж `fs.readFile` має жорстку межу: для файлу, більшого за 2 ГіБ, він одразу кидає `ERR_FS_FILE_TOO_LARGE` («File size (3221225472) is greater than 2 GiB» — перевірено в Node 24 на файлі 3 ГіБ).

**Stream** (потік) — абстракція, що дає змогу обробляти дані **частинами** (chunks) у міру надходження, не тримаючи весь обсяг у пам'яті одночасно. Принцип той самий, що в «лінивих» ітераторів ([asynchronous.md](../../../common/asynchronous/asynchronous.md), розділ 19; [iterator.md](../../../common/data-structures/iterator/iterator.md), розділ 8), але застосований до вводу/виводу: файлів, мережі, стиснення.

## 2. Кожен stream — це EventEmitter

Кожен stream у Node.js — екземпляр (нащадок) `EventEmitter`. Це той самий патерн «підписка на події», що й в HTTP-запитах чи `fs.watch()` ([05-watching-files.md](../file-system/05-watching-files.md)). Тому з потоком працюють через `.on("подія", callback)`, а не через повернене значення:

```js
const { Readable } = require("stream");

const simpleStream = Readable.from(["first chunk ", "second chunk ", "third chunk"]);
simpleStream.on("data", (chunk) => {
  console.log("received chunk:", chunk);
});
// received chunk: first chunk
// received chunk: second chunk
// received chunk: third chunk
simpleStream.on("end", () => {
  console.log("stream ended — no more data"); // stream ended — no more data
});
```

## 3. Чотири типи streams

Node.js розрізняє чотири базові типи за напрямком руху даних:

| Тип | Роль | Приклади | Детально |
|---|---|---|---|
| **Readable** | джерело, з якого читають | `fs.createReadStream()`, HTTP-запит на сервері, `process.stdin` | [02-readable-streams.md](02-readable-streams.md) |
| **Writable** | приймач, у який пишуть | `fs.createWriteStream()`, HTTP-відповідь, `process.stdout` | [03-writable-streams.md](03-writable-streams.md) |
| **Duplex** | і Readable, і Writable, але **незалежно** — два окремі канали | TCP-сокет | [05-duplex-and-transform.md](05-duplex-and-transform.md) |
| **Transform** | Duplex, у якому записане на вхід, перетворившись, з'являється на виході | `zlib.createGzip()`, шифрування | [05-duplex-and-transform.md](05-duplex-and-transform.md) |

## 4. Читання файлу як stream замість readFile()

Приклади нижче працюють із тимчасовим файлом і виконуються всередині однієї `async`-функції (розділи 4–6).

```js
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "streams-overview-demo.txt");

async function main() {
  await fsPromises.writeFile(demoFilePath, "line 1\nline 2\nline 3\n".repeat(10000)); // 210 000 байтів

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(demoFilePath, { encoding: "utf-8" });

    let totalChars = 0;
    let chunkCount = 0;

    readStream.on("data", (chunk) => {
      // дані надходять частинами: розмір chunk'а визначає highWaterMark,
      // а не логічні «рядки» файлу
      totalChars += chunk.length;
      chunkCount++;
    });

    readStream.on("end", () => {
      console.log(`Read ${totalChars} chars in ${chunkCount} chunks`); // Read 210000 chars in 4 chunks
      resolve();
    });

    readStream.on("error", reject); // ⚠️ error обробляти завжди — розділ 6
  });
```

Головна відмінність від `fs.readFile()`: дані не збираються в одну змінну, а обробляються «на льоту», частинами, і потім забуваються (якщо самому їх не зберегти). 210 000 байтів прийшли чотирма шматками по 64 КБ (останній — менший).

## 5. Stream vs «завантажити все й обробити» — пам'ять

| | Файл 100 МБ | Файл 10 ГБ |
|---|---|---|
| `readFile()` | ~100 МБ у пам'яті одночасно | помилка `ERR_FS_FILE_TOO_LARGE` або вичерпана пам'ять |
| stream | кілька chunk'ів по 64 КБ | стільки ж — кілька chunk'ів по 64 КБ |

У stream'і пам'ять обмежена внутрішнім буфером (`highWaterMark`) і **не залежить** від розміру файлу. Умова — споживач встигає обробляти дані; якщо ні, рятує backpressure ([03-writable-streams.md](03-writable-streams.md)).

## 6. Помилки у streams — чому "error" не можна ігнорувати

В async/await необроблена помилка стає «unhandled rejection» ([asynchronous.md](../../../common/asynchronous/asynchronous.md), розділ 12). У streams **необроблена подія `"error"`** — особливий випадок `EventEmitter`: якщо на `"error"` немає жодного слухача, emitter кидає помилку як звичайний виняток, і процес за замовчуванням **завершується**.

```js
  await new Promise((resolve) => {
    const brokenStream = fs.createReadStream(path.join(os.tmpdir(), "no-such-file.txt"));
    brokenStream.on("error", (err) => {
      console.log("Expected, HANDLED error:", err.code); // Expected, HANDLED error: ENOENT
      resolve();
    });
    // без .on("error", ...) процес завершився б з необробленим винятком
  });

  await fsPromises.rm(demoFilePath, { force: true }); // прибирання
}

main().catch((err) => console.error("Demo failed:", err));
```

На практиці потоки рідко з'єднують вручну: `pipeline()` сам обробляє помилки всього ланцюжка ([04-piping-and-backpressure.md](04-piping-and-backpressure.md)).

## Підсумок

- Streams вирішують проблему пам'яті: дані обробляються частинами (chunks) «на льоту», без потреби тримати весь обсяг у пам'яті, — незалежно від розміру файлу.
- `readFile()` для дуже великих файлів не просто повільний, а неможливий: понад 2 ГіБ він кидає `ERR_FS_FILE_TOO_LARGE`.
- Кожен stream — `EventEmitter`: робота йде через події `data` / `end` / `error`, а не через повернене значення.
- Чотири типи: Readable (джерело), Writable (приймач), Duplex (обидва напрямки незалежно), Transform (вхід перетворюється на вихід).
- Chunk не відповідає логічним одиницям даних (рядкам тощо) — це просто шматок байтів розміром до `highWaterMark` (пастка з «розрізаними» рядками — [02-readable-streams.md](02-readable-streams.md), розділ 3).
- Подію `"error"` ніколи не можна лишати без обробника: необроблена `"error"` завершує весь процес.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Які чотири типи потоків є в Node.js?

**2.** Яку проблему вирішують потоки порівняно з `readFile`?

**3.** Чи є потік `EventEmitter`?

```node
(() => { const r = new Readable({ read() {} }); return [r instanceof events.EventEmitter, typeof r.on, typeof r.pipe]; })()
```

**4.** Які події має Readable: порядок `data`, `end`, `close`?

```node
(async () => { const L = []; const r = Readable.from(['a', 'b']); r.on('data', (c) => L.push('data ' + c)); r.on('end', () => L.push('end')); r.on('close', () => L.push('close')); await events.once(r, 'close'); return L; })()
```

### Рівень 2. Деталі й поведінка

**5.** Що станеться з помилкою без обробника `error`?

```node
(async () => { const r = new Readable({ read() { this.destroy(new Error('boom')); } }); try { await events.once(r.resume(), 'end'); } catch (e) { return ['rejected', e.message]; } })()
```

**6.** Читання файлу як потоку: скільки чанків і розмір кожного для 150 КБ?

```node
(async () => { const f = path.join(dir, 'f.bin'); fs.writeFileSync(f, Buffer.alloc(150 * 1024)); const sizes = []; for await (const c of fs.createReadStream(f)) sizes.push(c.length); return sizes; })()
```

**7.** Як змінити розмір чанка через `highWaterMark`?

```node
(async () => { const f = path.join(dir, 'f.bin'); fs.writeFileSync(f, Buffer.alloc(10)); const sizes = []; for await (const c of fs.createReadStream(f, { highWaterMark: 4 })) sizes.push(c.length); return sizes; })()
```

**8.** Що поверне `readable.read()` на порожньому потоці?

```node
(() => { const r = new Readable({ read() {} }); return r.read(); })()
```

### Рівень 3. Нюанси та пастки

**9.** Скільки пам'яті економить потік? Порахуйте кількість рядків файлу 1000 рядків через потік.

```node
(async () => { const f = path.join(dir, 'l.txt'); fs.writeFileSync(f, Array.from({ length: 1000 }, (_, i) => 'line ' + i).join('\n')); const rl = process.getBuiltinModule('node:readline').createInterface({ input: fs.createReadStream(f) }); let n = 0; for await (const l of rl) n++; return n; })()
```

**10.** Чи можна підписатися на `end` після завершення потоку?

```node
(async () => { const r = Readable.from(['x']); r.resume(); await events.once(r, 'end'); let called = false; r.on('end', () => (called = true)); await new Promise(res => setTimeout(res, 20)); return called; })()
```

**11.** Що поверне `stream.readableEnded`, `readableFlowing`, `destroyed`?

```node
(async () => { const r = Readable.from(['a']); const before = [r.readableFlowing, r.readableEnded, r.destroyed]; r.resume(); await events.once(r, 'close'); return [before, [r.readableEnded, r.destroyed]]; })()
```

**12.** Що відбувається при `destroy()` потоку?

```node
(async () => { const r = new Readable({ read() {} }); const L = []; r.on('close', () => L.push('close')); r.destroy(); await new Promise(res => setTimeout(res, 10)); return [r.destroyed, L]; })()
```

### Рівень 4. Практика

**13.** Що станеться при записі у завершений Writable?

```node
(async () => { const w = new Writable({ write(c, e, cb) { cb(); } }); w.end(); try { await new Promise((res, rej) => { w.on('error', rej); w.write('x'); }); } catch (e) { return e.code; } })()
```

**14.** Чим потік відрізняється від масиву: ліниве споживання (скільки чанків прочитано до `break`)?

```node
(async () => { let produced = 0; const r = new Readable({ highWaterMark: 1, objectMode: true, read() { this.push(++produced); } }); let seen = 0; for await (const x of r) { seen++; if (seen === 3) break; } return [seen, produced <= 6]; })()
```

### Відповіді

1. Readable (джерело), Writable (приймач), Duplex (обидва напрямки незалежно), Transform (Duplex, де вихід залежить від входу)
2. Дані обробляються частинами, тож пам'ять не залежить від розміру файлу, а обробка починається до завершення читання
3. `[true, 'function', 'function']`
4. `['data a', 'data b', 'end', 'close']`
5. `['rejected', 'boom']`
6. `[65536, 65536, 22528]`
7. `[4, 4, 2]`
8. `null`
9. `1000`
10. `false`
11. `[[null, false, false], [true, true]]`
12. `[true, ['close']]`
13. `'ERR_STREAM_WRITE_AFTER_END'`
14. `[3, true]`
