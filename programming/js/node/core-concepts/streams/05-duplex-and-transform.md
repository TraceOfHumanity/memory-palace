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
