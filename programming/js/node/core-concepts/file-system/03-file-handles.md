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
