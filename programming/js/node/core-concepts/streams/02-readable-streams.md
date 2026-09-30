# Streams: Readable streams

Приклади цієї нотатки — одна `async`-функція `main()`, що працює з тимчасовими файлами.

```js
const { Readable } = require("stream");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "streams-readable-demo.txt");

async function main() {
  await fsPromises.writeFile(demoFilePath, "0123456789".repeat(2000)); // 20000 байтів
```

## 1. Режими читання: flowing і paused

Readable stream споживають двома способами:

- **flowing** — дані течуть автоматично, щойно з'являються, і подаються через подію `"data"` так швидко, як можливо;
- **paused** — дані самі не течуть; їх забирають явним викликом `.read()`, зазвичай у відповідь на подію `"readable"` («є що читати»).

Формально стан зберігає властивість `readable.readableFlowing`, і станів у неї **три**:

| `readableFlowing` | Що означає | Як потрапити |
|---|---|---|
| `null` | споживача ще немає, дані не течуть | початковий стан |
| `true` | flowing | `.on("data")`, `.resume()`, `.pipe()` |
| `false` | явно призупинено | `.pause()` (або підписка на `"readable"`) |

```js
  const stateDemo = new Readable({ read() {} });
  console.log(stateDemo.readableFlowing); // null
  stateDemo.on("data", () => {});
  console.log(stateDemo.readableFlowing); // true — підписка на "data" вмикає flowing
  stateDemo.pause();
  console.log(stateDemo.readableFlowing); // false
  stateDemo.destroy();
```

Flowing-режим — найпростіший спосіб спожити дані:

```js
  await new Promise((resolve) => {
    const flowingStream = fs.createReadStream(demoFilePath);
    let flowingBytes = 0;
    flowingStream.on("data", (chunk) => {
      flowingBytes += chunk.length; // дані «ллються» самі
    });
    flowingStream.on("end", () => {
      console.log("Flowing mode read", flowingBytes, "bytes"); // Flowing mode read 20000 bytes
      resolve();
    });
  });
```

Paused-режим — явне читання через `.read()` у відповідь на `"readable"`:

```js
  await new Promise((resolve) => {
    const pausedStream = fs.createReadStream(demoFilePath);
    let pausedBytes = 0;
    pausedStream.on("readable", () => {
      let chunk;
      while ((chunk = pausedStream.read()) !== null) {
        pausedBytes += chunk.length; // ти сам вирішуєш, коли й скільки читати
      }
    });
    pausedStream.on("end", () => {
      console.log("Paused mode read", pausedBytes, "bytes"); // Paused mode read 20000 bytes
      resolve();
    });
  });
```

`read()` треба викликати в циклі до `null` — інакше частина даних лишиться в буфері, і нова подія `"readable"` може не прийти. Змішувати обидва способи (`"data"` і `"readable"` одночасно) не варто: `"readable"` має пріоритет, і поведінка стає неочевидною.

## 2. highWaterMark — розмір внутрішнього буфера

`highWaterMark` задає розмір внутрішнього буфера потоку в байтах — це й приблизний розмір одного chunk'а в `"data"`. За замовчуванням у Node 24 — **64 КБ** і для файлових, і для звичайних потоків (до Node 22 для звичайних було 16 КБ); для потоків в `objectMode` — 16 **об'єктів**.

```js
  await new Promise((resolve) => {
    const smallChunkStream = fs.createReadStream(demoFilePath, { highWaterMark: 1024 }); // 1 КБ
    let chunks = 0;
    smallChunkStream.on("data", () => chunks++);
    smallChunkStream.on("end", () => {
      console.log(`highWaterMark 1024 → ${chunks} chunks (file is 20000 bytes)`); // highWaterMark 1024 → 20 chunks (file is 20000 bytes)
      resolve();
    });
  });

  await new Promise((resolve) => {
    const bigChunkStream = fs.createReadStream(demoFilePath, { highWaterMark: 8192 }); // 8 КБ
    let chunks = 0;
    bigChunkStream.on("data", () => chunks++);
    bigChunkStream.on("end", () => {
      console.log(`highWaterMark 8192 → ${chunks} chunks (same file)`); // highWaterMark 8192 → 3 chunks (same file)
      resolve();
    });
  });
```

Менший `highWaterMark` — більше дрібних chunk'ів (більше викликів і системних операцій); більший — менше chunk'ів, але більше пам'яті на буфер.

## 3. Класична пастка: chunk'и не збігаються з логічними одиницями даних

Обробляти chunk як «один рядок» чи «одне число» — помилка: рядок або число може бути **розрізане** на межі двох chunk'ів. Рішення — зберігати неповний залишок (`leftover`) між подіями `"data"`:

```js
  const csvLikePath = path.join(os.tmpdir(), "streams-csv-demo.txt");
  const numbers = Array.from({ length: 500 }, (_, i) => i).join(",");
  await fsPromises.writeFile(csvLikePath, numbers);

  await new Promise((resolve) => {
    const csvStream = fs.createReadStream(csvLikePath, {
      encoding: "utf-8",
      highWaterMark: 50, // штучно малий, щоб гарантовано розрізати числа
    });

    let leftover = ""; // те, що не вдалося розібрати в попередньому chunk'у
    let naiveCount = 0;
    let parsedCount = 0;

    csvStream.on("data", (chunk) => {
      naiveCount += chunk.split(",").filter(Boolean).length; // ❌ наївно: кожен chunk окремо

      const parts = (leftover + chunk).split(",");
      leftover = parts.pop(); // остання частина може бути неповною — лишаємо «на потім»
      parsedCount += parts.length;
    });

    csvStream.on("end", () => {
      if (leftover) parsedCount++; // останнє число, уже повне
      console.log(`naive: ${naiveCount}, correct: ${parsedCount} (expected 500)`); // naive: 517, correct: 500 (expected 500)
      resolve();
    });
  });
```

Наївний підхід рахує числа на межах chunk'ів двічі: `"123"` перетворюється на два неповні значення `"1"` і `"23"`. Звідси 517 замість 500: 17 чисел потрапили на межу chunk'ів. Та сама техніка з `leftover` потрібна в Transform-потоках ([05-duplex-and-transform.md](05-duplex-and-transform.md), розділ 3). Для рядків тексту є готове рішення — `readline.createInterface({ input: stream })`, що віддає вхід по рядку.

Ще одна пастка того самого типу — багатобайтові символи UTF-8: без `encoding` chunk — це `Buffer`, і кириличний символ (2 байти) може розірватися навпіл. Опція `encoding: "utf-8"` (чи `setEncoding()`) використовує `StringDecoder`, який такі символи склеює правильно. Наприклад, файл `"жжжжж"`, прочитаний з `highWaterMark: 3` і склеєний через `chunk.toString()`, дає `"ж��жж��"`, а з `encoding: "utf-8"` — коректне `"жжжжж"`.

## 4. Readable.from() — stream з iterable

`Readable.from()` перетворює будь-який iterable — масив, генератор, асинхронний генератор ([iterator.md](../../../common/data-structures/iterator/iterator.md)) — на Readable stream. Зручно для тестів і генерації даних «на льоту». Такий потік за замовчуванням працює в `objectMode`: кожен елемент — окремий chunk, без склеювання.

```js
  function* numberGenerator() {
    for (let i = 0; i < 3; i++) yield `number ${i}`;
  }
  for await (const chunk of Readable.from(numberGenerator())) {
    console.log("from generator:", chunk);
  }
  // from generator: number 0
  // from generator: number 1
  // from generator: number 2
```

## 5. for await...of — сучасний спосіб споживання

Readable реалізує `Symbol.asyncIterator` ([asynchronous.md](../../../common/asynchronous/asynchronous.md), розділ 19), тож потік можна обійти через `for await...of`, без колбеків `"data"`/`"end"`. Бонуси: backpressure працює автоматично (наступний chunk читається лише після обробки попереднього), помилка потоку кидається як звичайний виняток у `try/catch`, а `break` коректно знищує потік.

```js
  const iterableStream = fs.createReadStream(demoFilePath, { encoding: "utf-8", highWaterMark: 4096 });
  let totalViaIterator = 0;
  for await (const chunk of iterableStream) {
    totalViaIterator += chunk.length;
  }
  console.log("for await...of read", totalViaIterator, "chars"); // for await...of read 20000 chars

  await fsPromises.rm(demoFilePath, { force: true }); // прибирання
  await fsPromises.rm(csvLikePath, { force: true });
}

main().catch((err) => console.error("Demo failed:", err));
```

## Підсумок

- Readable споживають у режимі flowing (дані течуть через `"data"`) або paused (явний `.read()` у відповідь на `"readable"`); формально `readableFlowing` має три стани: `null`, `true`, `false`.
- `highWaterMark` задає розмір внутрішнього буфера й приблизний розмір chunk'а: 64 КБ за замовчуванням у Node 24, 16 об'єктів в `objectMode`.
- Chunk'и не відповідають логічним одиницям даних: числа, рядки й навіть багатобайтові символи можуть бути розрізані на межі — зберігай `leftover` між подіями, використовуй `encoding` і `readline`.
- `Readable.from(iterable)` робить потік з масиву чи (асинхронного) генератора, кожен елемент — окремий chunk.
- `for await...of` — найпростіший спосіб споживання: без колбеків, з автоматичним backpressure й обробкою помилок через `try/catch`.
