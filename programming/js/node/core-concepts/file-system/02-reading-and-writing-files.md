# Node.js: читання та запис файлів

Приклади нижче використовують `fs/promises` — рекомендований стиль для нового коду (детальне порівняння стилів API — у нотатці «Модуль `fs`: загальний огляд»). Усередині один спільний `async` потік виконання, де кожен крок дочекується (`await`) попереднього, тому порядок операцій повністю детермінований.

```js
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "fs-read-write-demo.txt");
```

## 1. `writeFile()` — створити або повністю перезаписати файл

Якщо файлу немає, `writeFile()` створює його. Якщо файл уже є, його вміст повністю **замінюється** (не дописується) новим:

```js
await fs.writeFile(demoFilePath, "First line");
console.log(await fs.readFile(demoFilePath, "utf-8")); // First line

await fs.writeFile(demoFilePath, "Some other content");
console.log(await fs.readFile(demoFilePath, "utf-8")); // Some other content — "First line" зник повністю!
```

Другий виклик `writeFile()` не додав текст, а замінив увесь вміст файлу.

## 2. `readFile()` з кодуванням і без: рядок чи `Buffer`

Без аргументу `encoding` `readFile()` повертає `Buffer` (сирі байти, детально — нотатка про Buffer), а не рядок:

```js
const rawBuffer = await fs.readFile(demoFilePath);
console.log(Buffer.isBuffer(rawBuffer)); // true
console.log(rawBuffer);
// <Buffer 53 6f 6d 65 20 6f 74 68 65 72 20 63 6f 6e 74 65 6e 74>
```

Кожна пара шістнадцяткових цифр — один байт UTF-8-представлення рядка «Some other content». Для символів поза ASCII (наприклад, `é` у слові «café») один символ може займати кілька байтів:

```js
console.log(Buffer.byteLength("café"), "café".length); // 5 4 — символів 4, байтів 5
```

З аргументом `"utf-8"` (чи іншим кодуванням) `readFile()` повертає рядок:

```js
const textContent = await fs.readFile(demoFilePath, "utf-8");
console.log(typeof textContent); // "string"
console.log(textContent);         // Some other content
```

Це важливо для бінарних файлів (картинки, PDF тощо): якщо вказати `"utf-8"` для файлу, що не є текстом, результатом стане пошкоджений, нечитабельний «рядок». Для бінарних даних завжди читайте без `encoding`, як `Buffer`, і обробляйте як байти.

## 3. `appendFile()` — додати в кінець, не замінюючи наявний вміст

```js
await fs.writeFile(demoFilePath, "Line 1\n"); // спочатку «з нуля»
await fs.appendFile(demoFilePath, "Line 2\n"); // додає, не стираючи «Line 1»
await fs.appendFile(demoFilePath, "Line 3\n");
console.log(await fs.readFile(demoFilePath, "utf-8"));
// Line 1
// Line 2
// Line 3
```

## 4. Різниця між `writeFile()` та `appendFile()` — класична плутанина

`writeFile()` за замовчуванням відкриває файл із прапорцем `"w"` (write): він обрізає наявний вміст до нуля перед записом. `appendFile()` використовує прапорець `"a"` (append): він завжди пише в кінець, не чіпаючи наявне. Повний перелік прапорців (`r`/`w`/`a`/`r+`/`w+`/`a+`/`wx`/`ax` тощо) — у нотатці про файлові дескриптори.

Часта помилка — очікувати, що повторний `writeFile()` «допише» дані. Насправді він знищує все, що було раніше:

```js
await fs.writeFile(demoFilePath, "only this line");
console.log(await fs.readFile(demoFilePath, "utf-8")); // only this line — "Line 1/2/3" зникли безслідно
```

## 5. Великі файли: чому `readFile()`/`writeFile()` не завжди підходять

`readFile()` завантажує весь файл цілком у пам'ять — для файлу на кілька гігабайт це може вичерпати доступну пам'ять процесу Node.js ще до того, як файл узагалі вдасться обробити. Для великих файлів (чи файлів невідомого розміру) потрібні **потоки** (streams): читання частинами (chunks), без утримання всього файлу в пам'яті одночасно (детально — нотатки в теці `streams`).

## 6. Опції `writeFile()`: `flag`, `mode`

`{ flag: "wx" }` створює файл лише якщо його ще не існує; інакше — помилка `EEXIST`, а не мовчазний перезапис:

```js
try {
  await fs.writeFile(demoFilePath, "attempt to overwrite", { flag: "wx" });
} catch (err) {
  console.log("Expected error:", err.code); // "EEXIST" — файл уже існує
}

const freshPath = path.join(os.tmpdir(), "fs-read-write-fresh.txt");
await fs.rm(freshPath, { force: true }); // прибираємо «хвости» з попередніх запусків
await fs.writeFile(freshPath, "new file", { flag: "wx" }); // файлу ще не було — ok
console.log(await fs.readFile(freshPath, "utf-8")); // new file
```

## 7. Часткове читання й запис через файловий дескриптор

`readFile()`/`writeFile()` завжди працюють з усім файлом цілком. Якщо потрібно прочитати чи записати лише конкретний шматок (наприклад, відновити перерване завантаження чи змінити байти посеред великого файлу), потрібен `fs.open()` і робота з об'єктом `FileHandle` напряму — це тема окремої нотатки про файлові дескриптори.

## Прибирання

Демонстраційні файли — тимчасові, у `os.tmpdir()`, тому наприкінці їх варто видалити:

```js
await fs.rm(demoFilePath, { force: true });
await fs.rm(freshPath, { force: true });
```

## Підсумок

- `writeFile()` створює файл або повністю замінює його вміст — повторний виклик стирає все, що було раніше.
- `appendFile()` завжди дописує в кінець, не чіпаючи наявний вміст — це головна, найчастіше плутана різниця з `writeFile()`.
- `readFile()` без `encoding` повертає `Buffer` (сирі байти); з `encoding` (`"utf-8"` тощо) — рядок; для бінарних файлів завжди читайте без `encoding`.
- `readFile()`/`writeFile()` завантажують увесь файл у пам'ять цілком — для великих файлів потрібні потоки.
- Опція `{ flag: "wx" }` дає безпечне «створити, лише якщо ще не існує» замість тихого перезапису.
- Для часткового читання чи запису (не всього файлу цілком) потрібен `fs.open()` і `FileHandle`.
