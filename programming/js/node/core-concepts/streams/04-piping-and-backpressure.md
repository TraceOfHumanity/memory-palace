# Streams: pipe() і pipeline()

Приклади цієї нотатки — одна `async`-функція `main()`, що працює з тимчасовими файлами.

```js
const fs = require("fs");
const fsPromises = require("fs/promises");
const { PassThrough, Readable } = require("stream");
const { pipeline } = require("stream/promises"); // Promise-версія pipeline (розділ 3)
const os = require("os");
const path = require("path");

async function main() {
  const srcPath = path.join(os.tmpdir(), "streams-pipe-src.txt");
  const destPath = path.join(os.tmpdir(), "streams-pipe-dest.txt");
  await fsPromises.writeFile(srcPath, "data to copy\n".repeat(5000));
```

## 1. pipe() — з'єднати Readable → Writable одним рядком

`readable.pipe(writable)` автоматично робить усе, що довелося писати вручну в [03-writable-streams.md](03-writable-streams.md), розділ 3: стежить за `write()` і `"drain"` і призупиняє Readable, коли Writable не встигає. Повертає `writable`, тож виклики можна ланцюжити: `a.pipe(b).pipe(c)`.

```js
  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(srcPath);
    const writeStream = fs.createWriteStream(destPath);

    readStream.pipe(writeStream); // один рядок замість ручного backpressure-циклу

    writeStream.on("finish", () => {
      console.log("pipe() finished copying"); // pipe() finished copying
      resolve();
    });
    readStream.on("error", reject); // помилки — на КОЖНОМУ потоці окремо (розділ 2)
    writeStream.on("error", reject);
  });

  const copiedContent = await fsPromises.readFile(destPath, "utf-8");
  const originalContent = await fsPromises.readFile(srcPath, "utf-8");
  console.log("Content identical:", copiedContent === originalContent); // Content identical: true
```

## 2. Головний недолік pipe() — помилки

`pipe()` **не передає помилки** по ланцюжку і **не закриває** інші потоки, якщо один із них впав. Обробник `"error"` потрібен на кожному потоці окремо, а закривати решту треба вручну. Забути щось легко — і тоді потік-приймач лишається відкритим назавжди: витік файлових дескрипторів чи сокетів ([03-file-handles.md](../file-system/03-file-handles.md), розділ 5).

```js
  const failingSource = new Readable({
    read() {
      this.destroy(new Error("source failed")); // джерело падає на першому ж читанні
    },
  });
  const pipeTarget = new PassThrough();
  failingSource.on("error", (err) => console.log("pipe(): source error:", err.message)); // pipe(): source error: source failed
  failingSource.pipe(pipeTarget);
  await new Promise((r) => setTimeout(r, 20));
  console.log("pipe(): target destroyed?", pipeTarget.destroyed, "| ended?", pipeTarget.writableEnded); // pipe(): target destroyed? false | ended? false — приймач «висить»
  pipeTarget.destroy();
```

## 3. pipeline() — рекомендована заміна pipe()

`pipeline()` (з `"stream"` з колбеком або з `"stream/promises"` з Promise) робить те саме, що й `pipe()`, але:

- при помилці будь-де **знищує (destroy) усі** потоки ланцюжка — без витоків;
- приймає більше двох потоків: Readable → Transform → … → Writable ([05-duplex-and-transform.md](05-duplex-and-transform.md));
- дає **один** Promise (або колбек) на весь ланцюжок замість окремого `"error"` на кожному потоці.

```js
  const pipelineDestPath = path.join(os.tmpdir(), "streams-pipeline-dest.txt");

  await pipeline(fs.createReadStream(srcPath), fs.createWriteStream(pipelineDestPath));
  // await чекає завершення всього ланцюжка і кидає помилку, якщо щось пішло не так
  console.log("pipeline() copied successfully"); // pipeline() copied successfully
```

## 4. pipeline() обробляє помилку сам

```js
  const brokenDestPath = path.join(os.tmpdir(), "streams-pipeline-broken-dest.txt");
  const brokenDest = fs.createWriteStream(brokenDestPath);
  try {
    await pipeline(
      fs.createReadStream(path.join(os.tmpdir(), "no-such-source-file.txt")), // джерела НЕМАЄ
      brokenDest,
    );
  } catch (err) {
    console.log("pipeline() rejected with:", err.code); // pipeline() rejected with: ENOENT
    console.log("destination destroyed too:", brokenDest.destroyed); // destination destroyed too: true — на відміну від pipe()
  }
  await fsPromises.rm(brokenDestPath, { force: true }); // createWriteStream уже встиг створити порожній файл
```

Зверніть увагу на останній рядок: `createWriteStream` створює файл одразу, тож після невдалого копіювання лишається порожній або недописаний файл — його треба прибрати самому.

## 5. Як pipe()/pipeline() вирішують backpressure всередині

Щоразу, коли `writable.write(chunk)` повертає `false` ([03-writable-streams.md](03-writable-streams.md), розділ 2), `pipe()` призупиняє джерело (`readable.pause()`), а на подію `"drain"` — відновлює (`readable.resume()`). Цей автоматичний цикл `pause()`/`resume()` замінює ручний код із розділу 3 попередньої нотатки.

Історична примітка: у репозиторії колись був практичний приклад читання великого файлу (`node/streams/readBig`, лишився лише в git-історії), де `readStream.pause()` викликався вручну, коли `writeStream.write()` повертав `false` — саме тому, що там не використовувався `pipe()`/`pipeline()`.

## 6. Інлайн-трансформації: async-генератор у pipeline()

`pipeline()` з `"stream/promises"` приймає між Readable і Writable звичайні async-генератори. Генератор отримує `source` (async iterable попереднього кроку) і `yield`'ить перетворені дані — фактично «Transform без класу» (класи — [05-duplex-and-transform.md](05-duplex-and-transform.md)):

```js
  const uppercaseDestPath = path.join(os.tmpdir(), "streams-uppercase-dest.txt");

  await pipeline(
    fs.createReadStream(srcPath, { encoding: "utf-8" }),
    async function* upperCaseTransform(source) {
      for await (const chunk of source) {
        yield chunk.toUpperCase(); // перетворюємо кожен chunk «на льоту»
      }
    },
    fs.createWriteStream(uppercaseDestPath),
  );

  const uppercaseResult = await fsPromises.readFile(uppercaseDestPath, "utf-8");
  console.log("First line upper-cased:", uppercaseResult.slice(0, 12)); // First line upper-cased: DATA TO COPY

  for (const p of [srcPath, destPath, pipelineDestPath, uppercaseDestPath]) {
    await fsPromises.rm(p, { force: true }); // прибирання
  }
}

main().catch((err) => console.error("Demo failed:", err));
```

## Шпаргалка: pipe() vs pipeline()

| | `a.pipe(b)` | `pipeline(a, ..., b)` |
|---|---|---|
| Backpressure | так | так |
| Помилка в одному потоці | інші **не** закриваються | усі знищуються |
| Обробка помилок | `"error"` на кожному потоці | один `try/catch` / колбек |
| Кінець ланцюжка | слухати `"finish"` останнього | `await` / колбек |
| Async-генератори як кроки | ні | так |

## Підсумок

- `readable.pipe(writable)` автоматично вирішує backpressure (`pause()`/`resume()` джерела залежно від `write()` і `"drain"`).
- Головний недолік `pipe()`: помилка не поширюється по ланцюжку й не закриває інші потоки — приймач лишається «висіти», звідси витоки дескрипторів.
- `pipeline()` (краще — з `"stream/promises"`) — рекомендована альтернатива: один `await` на весь ланцюжок, автоматичне знищення всіх потоків при помилці, будь-яка кількість кроків.
- Між кроками `pipeline()` можна ставити async-генератори — інлайн-трансформації без окремого класу.
- Після невдалого `pipeline()` у файл частково записаний або порожній файл-приймач лишається на диску — прибирай його сам.

## Задачі для закріплення

17 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Що робить `readable.pipe(writable)` і чи закриває приймач?

```node
(async () => { const out = []; const w = new Writable({ write(c, e, cb) { out.push(c.toString()); cb(); } }); Readable.from(['a', 'b']).pipe(w); await events.once(w, 'finish'); return [out, w.writableEnded]; })()
```

**2.** Що повертає `pipe`?

```node
(() => { const w = new PassThrough(); const r = Readable.from(['x']); const ret = r.pipe(w); return ret === w; })()
```

**3.** Ланцюжок pipe: Readable → Transform → Writable.

```node
(async () => { const out = []; const up = new Transform({ transform(c, e, cb) { cb(null, c.toString().toUpperCase()); } }); const w = new Writable({ write(c, e, cb) { out.push(c.toString()); cb(); } }); Readable.from(['a', 'b']).pipe(up).pipe(w); await events.once(w, 'finish'); return out; })()
```

**4.** Головний недолік `pipe`: чи закривається приймач, якщо джерело впало?

```node
(async () => { const r = new Readable({ read() { this.destroy(new Error('src fail')); } }); const w = new Writable({ write(c, e, cb) { cb(); } }); r.on('error', () => {}); r.pipe(w); await new Promise(res => setTimeout(res, 20)); return [w.destroyed, w.writableEnded]; })()
```

**5.** А `pipeline` при тій самій помилці?

```node
(async () => { const r = new Readable({ read() { this.destroy(new Error('src fail')); } }); const w = new Writable({ write(c, e, cb) { cb(); } }); try { await sp.pipeline(r, w); } catch (e) { return [e.message, w.destroyed]; } })()
```

### Рівень 2. Деталі й поведінка

**6.** Версія з колбеком: що отримає `pipeline(..., cb)`?

```node
(async () => new Promise(res => { const w = new Writable({ write(c, e, cb) { cb(); } }); pipeline(Readable.from(['a']), w, (err) => res([err ?? null])); }))()
```

**7.** Що поверне `stream/promises.pipeline` при успіху?

```node
(async () => { const w = new Writable({ write(c, e, cb) { cb(); } }); return await sp.pipeline(Readable.from(['a']), w); })()
```

**8.** Копіювання файлу через `pipeline`.

```node
(async () => { const a = path.join(dir, 'a.txt'), b = path.join(dir, 'b.txt'); fs.writeFileSync(a, 'content'.repeat(100)); await sp.pipeline(fs.createReadStream(a), fs.createWriteStream(b)); return [fs.readFileSync(b, 'utf8').length, fs.statSync(b).size]; })()
```

**9.** Стиснення gzip через `pipeline` та розмір результату.

```node
(async () => { const zlib = process.getBuiltinModule('node:zlib'); const a = path.join(dir, 'a.txt'), b = path.join(dir, 'a.gz'); fs.writeFileSync(a, 'abc'.repeat(1000)); await sp.pipeline(fs.createReadStream(a), zlib.createGzip(), fs.createWriteStream(b)); const back = zlib.gunzipSync(fs.readFileSync(b)).length; return [fs.statSync(b).size < 100, back]; })()
```

**10.** Інлайн-трансформація асинхронним генератором у `pipeline`.

```node
(async () => { const out = []; await sp.pipeline(Readable.from(['a', 'b', 'c']), async function* (src) { for await (const c of src) yield c.toUpperCase() + '!'; }, new Writable({ objectMode: true, write(c, e, cb) { out.push(c); cb(); } })); return out; })()
```

### Рівень 3. Нюанси та пастки

**11.** Що відбувається з усіма потоками при помилці посередині `pipeline`?

```node
(async () => { const states = []; const a = Readable.from(['1', '2', '3']); const t = new Transform({ transform(c, e, cb) { cb(new Error('bad chunk')); } }); const w = new Writable({ write(c, e, cb) { cb(); } }); try { await sp.pipeline(a, t, w); } catch (e) { return [e.message, a.destroyed, t.destroyed, w.destroyed]; } })()
```

**12.** Backpressure у `pipe`: скільки чанків лежить у проміжному буфері при повільному приймачі?

```node
(async () => { let produced = 0; const r = new Readable({ highWaterMark: 4, read() { produced++; this.push(produced <= 1000 ? 'x'.repeat(4) : null); } }); const w = new Writable({ highWaterMark: 4, write(c, e, cb) { setTimeout(cb, 2); } }); r.pipe(w); await new Promise(res => setTimeout(res, 40)); const p = produced; r.destroy(); w.destroy(); return p < 100; })()
```

**13.** `unpipe`: що відбувається з потоком після від'єднання?

```node
(async () => { const r = Readable.from(['a', 'b']); const w = new PassThrough(); r.pipe(w); r.unpipe(w); return [r.readableFlowing, r.listenerCount('data')]; })()
```

**14.** Що повертає `pipeline` без приймача (`Readable.from(...).pipe`) і як зібрати результат у масив?

```node
(async () => { const out = await Readable.from([1, 2, 3]).map(x => x * 2).toArray(); return out; })()
```

**15.** Методи ітераторів потоків: `filter`, `map`, `take`.

```node
(async () => (await Readable.from([1, 2, 3, 4, 5, 6]).filter(x => x % 2 === 0).map(x => x * 10).take(2).toArray()))()
```

### Рівень 4. Практика

**16.** `stream.compose` — що повертає?

```node
(async () => { const c = stream.compose(new Transform({ transform(ch, e, cb) { cb(null, ch.toString() + '1'); } }), new Transform({ transform(ch, e, cb) { cb(null, ch.toString() + '2'); } })); const out = []; for await (const x of Readable.from(['a']).pipe(c)) out.push(x.toString()); return out; })()
```

**17.** Чому `pipeline` рекомендовано замість `pipe`?

### Відповіді

1. `[['a', 'b'], true]`
2. `true`
3. `['A', 'B']`
4. `[false, false]`
5. `['src fail', true]`
6. `[null]`
7. `undefined`
8. `[700, 700]`
9. `[true, 3000]`
10. `['A!', 'B!', 'C!']`
11. `['bad chunk', true, true, true]`
12. `true`
13. `[false, 0]`
14. `[2, 4, 6]`
15. `[20, 40]`
16. `['a12']`
17. `pipeline` автоматично знищує всі потоки при помилці, не залишаючи витоків дескрипторів, і повертає єдиний колбек/promise із помилкою; `pipe` потребує окремих обробників `error` для кожного потоку
