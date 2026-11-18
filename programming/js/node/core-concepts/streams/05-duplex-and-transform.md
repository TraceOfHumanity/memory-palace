# Streams: Duplex і Transform

Приклади цієї нотатки — одна `async`-функція `main()`.

```js
const { Duplex, Transform } = require("stream");
const { pipeline } = require("stream/promises");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");

async function main() {
```

## 1. Duplex — Readable і Writable одночасно, але незалежно

Duplex має обидва інтерфейси, але це **два незалежні канали**: записане на вхід саме по собі не з'являється на виході (на відміну від Transform, розділ 2). Класичний приклад — TCP-сокет: ти пишеш запит серверу і читаєш відповідь, але це два різні потоки байтів.

Щоб створити власний Duplex, реалізують обидві половини:

- `_write(chunk, encoding, callback)` — що робити з записаними даними;
- `_read(size)` — як віддавати дані читачеві (через `this.push(chunk)`, а `this.push(null)` — «даних більше не буде»).

Нижче — «модель сервера»: вхідний канал збирає отримані команди, а вихідний незалежно віддає власну послідовність повідомлень:

```js
  class FakeServerConnection extends Duplex {
    constructor(options) {
      super({ ...options, readableObjectMode: true }); // кожне повідомлення — окремий chunk (пояснення нижче)
      this.received = []; // вхідний канал — сюди йде те, що записали
      this.outgoing = ["welcome", "status: ok", "bye"]; // вихідний канал — власні дані «сервера»
    }
    _write(chunk, encoding, callback) {
      this.received.push(chunk.toString());
      callback(); // підтверджуємо: готові приймати наступний chunk
    }
    _read() {
      const next = this.outgoing.shift();
      this.push(next === undefined ? null : next); // null — кінець вихідного каналу
    }
  }

  const connection = new FakeServerConnection();
  connection.write("GET /status");
  connection.write("QUIT");
  connection.end();

  const readFromConnection = [];
  for await (const chunk of connection) {
    readFromConnection.push(chunk.toString());
  }
  console.log("read:", readFromConnection); // read: [ 'welcome', 'status: ok', 'bye' ]
  console.log("written:", connection.received); // written: [ 'GET /status', 'QUIT' ]
```

Записане (`GET /status`, `QUIT`) і прочитане (`welcome`, …) не пов'язані — це і є суть Duplex.

Навіщо `readableObjectMode: true`: у звичайному (байтовому) режимі Readable — це потік байтів без меж між повідомленнями, і сусідні `push()` можуть склеїтися в один chunk. Без цієї опції приклад виводить `[ 'welcome', 'status: okbye' ]`. В `objectMode` кожен `push()` — окремий chunk. У реальних протоколах (TCP) межі повідомлень задають самі — роздільником чи довжиною в заголовку.

> [!warning] Пастка з попередньої версії прикладу
> Раніше тут був Duplex, який у `_read` віддавав записані chunk'и, а коли їх не було — одразу викликав `push(null)`. Він працював лише тому, що всі `write()` відбулися **до** початку читання. Якщо ж читач підключиться раніше, `_read` побачить порожній буфер, завершить потік, і записане пізніше загубиться (перевірено: результат — порожній масив). Правило: `push(null)` означає «кінець назавжди», а не «зараз немає даних». Якщо даних поки немає — просто нічого не пуш, а коли з'являться — виклич `push()` пізніше. Якщо ж вихід має залежати від входу — це вже Transform.

## 2. Transform — Duplex, де вхід стає виходом

Transform — Duplex з ключовою відмінністю: те, що записано на вхід, після обробки з'являється на виході. Реалізують один метод `_transform(chunk, encoding, callback)`, у якому викликають `this.push(result)` (або передають результат другим аргументом: `callback(null, result)`). Так працюють `zlib.createGzip()` і `crypto.createCipheriv()` — дані проходять наскрізь, змінюючись по дорозі. (Практичний приклад шифрування колись був у `node/streams/encrypt-decrypt/`; він лишився лише в git-історії.)

```js
  class UppercaseTransform extends Transform {
    _transform(chunk, encoding, callback) {
      this.push(chunk.toString().toUpperCase()); // те, що push() тут, з'явиться на виході
      callback(); // обов'язково — сигнал «готовий до наступного chunk'а» (розділ 4)
    }
  }

  const upperTransform = new UppercaseTransform();
  upperTransform.write("hello, ");
  upperTransform.write("this is a transform stream");
  upperTransform.end();

  let upperResult = "";
  for await (const chunk of upperTransform) {
    upperResult += chunk;
  }
  console.log("Transform result:", upperResult); // Transform result: HELLO, THIS IS A TRANSFORM STREAM
```

Для простих випадків клас не потрібен — достатньо опцій конструктора:

```js
  const trimTransform = new Transform({
    transform(chunk, encoding, callback) {
      callback(null, chunk.toString().trim()); // другий аргумент callback — те саме, що push()
    },
  });
  trimTransform.end("   padded text   ");
  for await (const chunk of trimTransform) {
    console.log(`trimmed: "${chunk}"`); // trimmed: "padded text"
  }
```

## 3. Transform у pipeline() — реальне застосування

Transform природно вбудовується в `pipeline()` між Readable і Writable ([04-piping-and-backpressure.md](04-piping-and-backpressure.md)) — це головна причина, чому він існує як окремий тип.

Приклад — розвернути кожен рядок файлу. Chunk'и не збігаються з рядками, тож потрібен той самий `leftover`, що й у [02-readable-streams.md](02-readable-streams.md), розділ 3, плюс `_flush` — метод, який викликається **один раз**, коли вхідні дані закінчилися, щоб доопрацювати залишок:

```js
  const srcPath = path.join(os.tmpdir(), "streams-transform-src.txt");
  const destPath = path.join(os.tmpdir(), "streams-transform-dest.txt");
  await fsPromises.writeFile(srcPath, "line one\nline two\nline three"); // останній рядок без \n

  class ReverseLineTransform extends Transform {
    constructor(options) {
      super(options);
      this.leftover = ""; // неповний рядок з попереднього chunk'а
    }
    _transform(chunk, encoding, callback) {
      const lines = (this.leftover + chunk.toString()).split("\n");
      this.leftover = lines.pop(); // остання, можливо неповна частина — «на потім»
      for (const line of lines) {
        this.push([...line].reverse().join("") + "\n"); // розворот рядка (прийом — String.md)
      }
      callback();
    }
    _flush(callback) {
      if (this.leftover) {
        this.push([...this.leftover].reverse().join("")); // без _flush останній рядок загубився б
      }
      callback();
    }
  }

  await pipeline(
    fs.createReadStream(srcPath, { encoding: "utf-8", highWaterMark: 5 }), // малий буфер — рядки гарантовано розрізані
    new ReverseLineTransform(),
    fs.createWriteStream(destPath),
  );

  console.log(await fsPromises.readFile(destPath, "utf-8"));
  // eno enil
  // owt enil
  // eerht enil
```

(Розворот рядка через `[...line]` — [String.md](../../../common/data-structures/String/String.md).)

## 4. Чому callback() у _transform обов'язковий

Transform подає наступний chunk у `_transform` лише **після** того, як попередній виклик викликав `callback()` — це вбудований backpressure ([03-writable-streams.md](03-writable-streams.md), розділ 2). Якщо забути `callback()`, потік не впаде з помилкою — він просто **зависне** назавжди, чекаючи сигналу, що ніколи не прийде:

```js
  const forgetfulTransform = new Transform({
    transform(chunk, encoding, callback) {
      this.push(chunk); // callback() забули
    },
  });
  forgetfulTransform.write("first");
  forgetfulTransform.write("second");
  forgetfulTransform.end();
  const stalled = await Promise.race([
    new Promise((resolve) => forgetfulTransform.on("finish", () => resolve("finished"))),
    new Promise((resolve) => setTimeout(() => resolve("still waiting after 100ms"), 100)),
  ]);
  console.log(stalled); // still waiting after 100ms — "finish" не настане ніколи
  forgetfulTransform.destroy();

  await fsPromises.rm(srcPath, { force: true }); // прибирання
  await fsPromises.rm(destPath, { force: true });
}

main().catch((err) => console.error("Demo failed:", err));
```

Помилку з `_transform` повідомляють через `callback(err)` — тоді `pipeline()` знищить увесь ланцюжок і відхилить свій Promise.

## Шпаргалка: чотири типи й що реалізувати

| Тип | Реалізувати | Зв'язок входу й виходу |
|---|---|---|
| Readable | `_read(size)` | — (лише вихід) |
| Writable | `_write(chunk, enc, cb)` (+ `_final(cb)`) | — (лише вхід) |
| Duplex | `_read` + `_write` | незалежні канали |
| Transform | `_transform(chunk, enc, cb)` (+ `_flush(cb)`) | вихід = перетворений вхід |

## Підсумок

- Duplex — одночасно Readable і Writable, але як два незалежні канали (TCP-сокет): записане не з'являється на виході автоматично.
- `push(null)` у `_read` означає «кінець назавжди»; порожній буфер — не привід завершувати потік.
- Transform — Duplex, де вхід через `_transform` + `push()` (або `callback(null, data)`) стає виходом; так побудовані `zlib` і `crypto`-потоки.
- Для простих трансформацій клас не потрібен — `new Transform({ transform() {...} })` або async-генератор у `pipeline()`.
- `_flush(callback)` викликається один раз наприкінці — місце доопрацювати залишок (та сама проблема розрізаних chunk'ів, що й у Readable).
- `callback()` у `_transform` обов'язковий: без нього потік не падає, а тихо зависає; помилку передають як `callback(err)`.
- Transform природно вставляється в середину `pipeline()` — тому це найпоширеніший на практиці тип власного потоку.

## Задачі для закріплення

17 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Простий `Transform`: верхній регістр.

```node
(async () => { const up = new Transform({ transform(c, e, cb) { cb(null, c.toString().toUpperCase()); } }); const out = []; for await (const c of Readable.from(['ab', 'cd']).pipe(up)) out.push(c.toString()); return out; })()
```

**2.** Що станеться, якщо не викликати `callback()` у `_transform`?

```node
(async () => { let calls = 0; const t = new Transform({ transform(c, e, cb) { calls++; } }); t.write('a'); t.write('b'); t.end(); await new Promise(r => setTimeout(r, 30)); return [calls, t.writableFinished]; })()
```

**3.** Що дає `this.push` у `transform` для розбиття одного чанка на кілька?

```node
(async () => { const split = new Transform({ transform(c, e, cb) { for (const ch of c.toString()) this.push(ch); cb(); } }); const out = []; for await (const c of Readable.from(['abc']).pipe(split)) out.push(c.toString()); return out; })()
```

**4.** Що робить `flush` (завершальний чанк)?

```node
(async () => { const t = new Transform({ transform(c, e, cb) { cb(null, c); }, flush(cb) { this.push('!END'); cb(); } }); const out = []; for await (const c of Readable.from(['a']).pipe(t)) out.push(c.toString()); return out; })()
```

**5.** Лічильник рядків через Transform із flush.

```node
(async () => { let rest = '', n = 0; const t = new Transform({ transform(c, e, cb) { rest += c; const p = rest.split('\n'); rest = p.pop(); n += p.length; cb(); }, flush(cb) { if (rest) n++; cb(null, String(n)); } }); const out = []; for await (const c of Readable.from(['a\nb', '\nc\nd']).pipe(t)) out.push(c.toString()); return out; })()
```

### Рівень 2. Деталі й поведінка

**6.** Transform в `objectMode`: парсинг JSON-рядків.

```node
(async () => { const t = new Transform({ readableObjectMode: true, transform(c, e, cb) { try { cb(null, JSON.parse(c)); } catch (err) { cb(err); } } }); const out = []; for await (const o of Readable.from(['{"a":1}', '{"a":2}']).pipe(t)) out.push(o.a); return out; })()
```

**7.** Що станеться, якщо `callback(err)` у `transform`?

```node
(async () => { const t = new Transform({ transform(c, e, cb) { cb(new Error('bad')); } }); const p = events.once(t, 'error'); t.write('x'); const [e] = await p; return [e.message, t.destroyed]; })()
```

**8.** `PassThrough`: передає дані без змін.

```node
(async () => { const p = new PassThrough(); p.end('same'); let s = ''; for await (const c of p) s += c; return s; })()
```

**9.** Duplex: незалежні вхід і вихід.

```node
(async () => { const log = []; const d = new Duplex({ read() { this.push('from-read'); this.push(null); }, write(c, e, cb) { log.push(c.toString()); cb(); } }); d.write('to-write'); d.end(); let out = ''; for await (const c of d) out += c; await new Promise(r => setTimeout(r, 10)); return [out, log]; })()
```

**10.** Чи залежить вихід Duplex від входу?

```node
(async () => { const d = new Duplex({ read() { this.push('A'); this.push(null); }, write(c, e, cb) { cb(); } }); d.end('ignored'); let o = ''; for await (const c of d) o += c; return o; })()
```

### Рівень 3. Нюанси та пастки

**11.** Сокет TCP — приклад Duplex: ехо-сервер через `pipe`.

```node
(async () => { const net = process.getBuiltinModule('node:net'); const srv = net.createServer((s) => s.pipe(s)); await new Promise(r => srv.listen(0, r)); const c = net.connect(srv.address().port); c.end('ping'); let out = ''; for await (const d of c) out += d; srv.close(); return out; })()
```

**12.** Transform, що фільтрує рядки за підрядком.

```node
(async () => { const f = new Transform({ objectMode: true, transform(c, e, cb) { const s = c.toString(); cb(null, s.includes('err') ? s : null); } }); const out = []; for await (const c of Readable.from(['info a', 'err b', 'ok', 'err c']).pipe(f)) out.push(c.toString()); return out; })()
```

**13.** Transform: накопичення суми чисел потоку та видача у `flush`.

```node
(async () => { let sum = 0; const t = new Transform({ readableObjectMode: true, writableObjectMode: true, transform(n, e, cb) { sum += n; cb(); }, flush(cb) { cb(null, sum); } }); const out = []; for await (const s of Readable.from([1, 2, 3, 4]).pipe(t)) out.push(s); return out; })()
```

**14.** Ланцюжок двох Transform у `pipeline` із гз-стисненням та розпакуванням — чи збігаються дані?

```node
(async () => { const zlib = process.getBuiltinModule('node:zlib'); const chunks = []; await sp.pipeline(Readable.from(['hello ', 'world']), zlib.createGzip(), zlib.createGunzip(), new Writable({ write(c, e, cb) { chunks.push(c.toString()); cb(); } })); return chunks.join(''); })()
```

**15.** Transform із затримкою та backpressure: чи зберігається порядок?

```node
(async () => { const t = new Transform({ transform(c, e, cb) { setTimeout(() => cb(null, c), Math.random() * 5); } }); const out = []; for await (const c of Readable.from(['1', '2', '3', '4']).pipe(t)) out.push(c.toString()); return out; })()
```

### Рівень 4. Практика

**16.** Які методи реалізують для кожного типу потоку?

**17.** Чому `callback()` у `_transform` обов'язковий?

### Відповіді

1. `['ABCD']`
2. `[1, false]`
3. `['abc']`
4. `['a!END']`
5. `['4']`
6. `[1, 2]`
7. `['bad', true]`
8. `'same'`
9. `['from-read', ['to-write']]`
10. `'A'`
11. `'ping'`
12. `['err b', 'err c']`
13. `[10]`
14. `'hello world'`
15. `['1', '2', '3', '4']`
16. Readable — `_read` (або `read` в опціях); Writable — `_write` (`_writev`, `_final`); Duplex — обидва; Transform — `_transform` (і `_flush`)
17. Він сигналізує, що поточний чанк оброблено; без нього потік не візьме наступний чанк і зависне
