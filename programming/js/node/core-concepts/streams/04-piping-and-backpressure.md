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
