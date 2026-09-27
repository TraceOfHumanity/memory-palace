# Node.js: директорії та метадані (`stat`)

```js
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const demoRoot = path.join(os.tmpdir(), "fs-directories-demo");
```

## 1. `mkdir()` — створення директорії

```js
await fs.rm(demoRoot, { recursive: true, force: true }); // прибираємо «хвости» з попередніх запусків

await fs.mkdir(demoRoot);
console.log("Created:", demoRoot);
```

Без `{ recursive: true }` створити вкладену директорію, якщо батьківської ще немає, — помилка:

```js
const nestedPath = path.join(demoRoot, "a", "b", "c");
try {
  await fs.mkdir(nestedPath); // без recursive
} catch (err) {
  console.log("Without recursive:", err.code); // "ENOENT" — немає проміжних "a" і "a/b"
}
```

`{ recursive: true }` створює всі проміжні директорії автоматично (аналог `mkdir -p` у Unix-shell, детально — нотатки в теці `unix`):

```js
await fs.mkdir(nestedPath, { recursive: true });
console.log("Created recursively:", nestedPath);
```

## 2. `readdir()` — список вмісту директорії

```js
await fs.writeFile(path.join(demoRoot, "file1.txt"), "content 1");
await fs.writeFile(path.join(demoRoot, "file2.txt"), "content 2");

const entries = await fs.readdir(demoRoot);
console.log(entries); // ["a", "file1.txt", "file2.txt"] — лише імена, без
                        // інформації, що саме є файлом, а що директорією
```

`{ withFileTypes: true }` повертає `Dirent`-об'єкти з методами `isFile()`/`isDirectory()` — без потреби робити окремий `stat()` на кожен елемент (детально сам `stat()` — розділ 4):

```js
const entriesWithTypes = await fs.readdir(demoRoot, { withFileTypes: true });
for (const entry of entriesWithTypes) {
  console.log(entry.name, "→", entry.isDirectory() ? "directory" : "file");
}
// a → directory
// file1.txt → file
// file2.txt → file
```

`{ recursive: true }` (Node.js 20+) — рекурсивний обхід усіх вкладених директорій одним викликом, без ручної рекурсії:

```js
const allEntriesRecursive = await fs.readdir(demoRoot, { recursive: true });
console.log(allEntriesRecursive.sort());
// ["a", "a/b", "a/b/c", "file1.txt", "file2.txt"] (шляхи відносні до demoRoot)
```

## 3. `rm()` / `rmdir()` — видалення файлів і директорій

`fs.rm()` — універсальний метод (ES2021+), працює і для файлів, і для директорій (старіший `fs.rmdir()` існує окремо, але `fs.rm()` — рекомендований єдиний інструмент сьогодні):

```js
await fs.rm(path.join(demoRoot, "file1.txt")); // видалити один файл
```

Звичайна (не recursive) директорія з вмістом — помилка:

```js
try {
  await fs.rm(path.join(demoRoot, "a"));
} catch (err) {
  console.log("Without recursive:", err.code); // "ERR_FS_EISDIR" (варіюється залежно
                                                   // від версії Node.js/ОС) — директорія
                                                   // не порожня чи взагалі директорія
}
```

`{ recursive: true }` видаляє директорію разом із усім її вмістом (аналог `rm -rf`), `{ force: true }` не кидає помилку, якщо шляху вже немає (типово для «прибирання за собою», як на початку цього файлу):

```js
await fs.rm(path.join(demoRoot, "a"), { recursive: true, force: true });
console.log("Directory 'a' removed together with its contents");
```

## 4. `stat()` / `lstat()` — метадані файлу або директорії

```js
const filePath = path.join(demoRoot, "file2.txt");
const stats = await fs.stat(filePath);

console.log("size:", stats.size);                 // розмір у байтах
console.log("isFile():", stats.isFile());           // true
console.log("isDirectory():", stats.isDirectory()); // false
console.log("mtime:", stats.mtime instanceof Date); // true — дата останньої зміни вмісту
console.log("birthtime:", stats.birthtime instanceof Date); // true — дата створення
                                                                // (не на всіх файлових
                                                                // системах підтримується
                                                                // однаково надійно)
```

`lstat()` — те саме, що `stat()`, але для symbolic link (символьного посилання) повертає інформацію про саме посилання, а не про файл, на який воно вказує (`stat()` «іде за» посиланням автоматично, `lstat()` — ні):

```js
const symlinkPath = path.join(demoRoot, "link-to-file2.txt");
await fs.symlink(filePath, symlinkPath);

const statFollowsLink = await fs.stat(symlinkPath);
console.log("stat() on symlink → isFile():", statFollowsLink.isFile()); // true —
                                                                            // «пішов» за посиланням
                                                                            // і побачив файл

const lstatOnLinkItself = await fs.lstat(symlinkPath);
console.log("lstat() on symlink → isSymbolicLink():", lstatOnLinkItself.isSymbolicLink()); // true —
                                                                                               // бачить саме посилання
```

## 5. `access()` — перевірка існування чи прав без реального відкриття

TOCTOU-пастка (Time-Of-Check to Time-Of-Use): між моментом перевірки `access()` і моментом реального `readFile()`/`open()` інший процес може видалити чи змінити файл — перевірка не є гарантією на момент реальної операції. Надійніше — просто спробувати операцію й обробити помилку (`try`/`catch`), а не «спочатку перевірити, потім зробити»:

```js
try {
  await fs.access(filePath); // без другого аргументу — просто «чи існує»
  console.log("File exists (access)");
} catch {
  console.log("File does not exist");
}
```

Рекомендований підхід — «спробуй і обробити помилку» замість «спочатку перевір»:

```js
async function readIfExists(path) {
  try {
    return await fs.readFile(path, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return null; // файлу немає — це очікуваний, не виключний випадок
    throw err; // будь-яка інша помилка (права доступу тощо) — прокидаємо далі
  }
}
console.log(await readIfExists(filePath));       // "content 2"
console.log(await readIfExists(demoRoot + "-x")); // null — файлу немає, і це нормально
```

## Прибирання

```js
await fs.rm(demoRoot, { recursive: true, force: true });
```

## Підсумок

- `mkdir()` без `{ recursive: true }` кидає `ENOENT`, якщо хоча б одна з проміжних директорій ще не існує; з `recursive` — створює увесь ланцюжок одразу (аналог `mkdir -p`).
- `readdir()` повертає лише імена; `{ withFileTypes: true }` дає `Dirent`-об'єкти з `isFile()`/`isDirectory()` без окремого `stat()` на кожен елемент; `{ recursive: true }` (Node 20+) обходить вкладені директорії одним викликом.
- `fs.rm()` — універсальний метод для файлів і директорій; `{ recursive: true }` потрібен для непорожніх директорій, `{ force: true }` не кидає помилку, якщо шляху й так уже немає.
- `stat()` дає метадані: `size` (байти), `isFile()`/`isDirectory()`, `mtime` (остання зміна), `birthtime` (створення).
- `lstat()` відрізняється від `stat()` лише для symbolic link: `stat()` «іде за» посиланням і показує цільовий файл, `lstat()` показує інформацію про саме посилання.
- `access()` перевіряє існування чи права, але має TOCTOU-пастку (стан може змінитись між перевіркою й реальною дією) — надійніше просто спробувати операцію й обробити помилку (`ENOENT` тощо) у `try`/`catch`, а не перевіряти заздалегідь.
