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

## Задачі для закріплення

22 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Що поверне `mkdir` для нової директорії та для вкладеної з `recursive`?

```node
(async () => { const a = await fsp.mkdir(path.join(dir, 'a')); const b = await fsp.mkdir(path.join(dir, 'x', 'y', 'z'), { recursive: true }); return [a, path.relative(dir, b)]; })()
```

**2.** Що станеться при `mkdir` існуючої директорії без `recursive`?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a')); try { await fsp.mkdir(path.join(dir, 'a')); } catch (e) { return e.code; } })()
```

**3.** А з `recursive: true` для існуючої?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a')); return await fsp.mkdir(path.join(dir, 'a'), { recursive: true }); })()
```

**4.** Що поверне `readdir`, і у якому порядку?

```node
(async () => { for (const n of ['b.txt', 'a.txt', 'c']) await fsp.writeFile(path.join(dir, n), ''); return (await fsp.readdir(dir)).sort(); })()
```

**5.** Що дає `withFileTypes: true`?

```node
(async () => { await fsp.writeFile(path.join(dir, 'f.txt'), ''); await fsp.mkdir(path.join(dir, 'sub')); const e = await fsp.readdir(dir, { withFileTypes: true }); return e.map(x => [x.name, x.isFile(), x.isDirectory()]).sort(); })()
```

**6.** Що дає `readdir` з `recursive: true`?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a', 'b'), { recursive: true }); await fsp.writeFile(path.join(dir, 'a', 'b', 'f.txt'), ''); await fsp.writeFile(path.join(dir, 'r.txt'), ''); return (await fsp.readdir(dir, { recursive: true })).sort(); })()
```

### Рівень 2. Деталі й поведінка

**7.** Що станеться при `readdir` файлу?

```node
(async () => { const f = path.join(dir, 'f'); await fsp.writeFile(f, ''); try { await fsp.readdir(f); } catch (e) { return e.code; } })()
```

**8.** Що станеться при `rmdir` непорожньої директорії?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a')); await fsp.writeFile(path.join(dir, 'a', 'f'), ''); try { await fsp.rmdir(path.join(dir, 'a')); } catch (e) { return e.code; } })()
```

**9.** Що дає `rm` з `recursive` та `force`?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a', 'b'), { recursive: true }); await fsp.rm(path.join(dir, 'a'), { recursive: true }); await fsp.rm(path.join(dir, 'ghost'), { force: true }); return [fs.existsSync(path.join(dir, 'a'))]; })()
```

**10.** Що станеться з `rm` неіснуючого файлу без `force`?

```node
(async () => { try { await fsp.rm(path.join(dir, 'ghost')); } catch (e) { return e.code; } })()
```

**11.** Що поверне `stat` для файлу?

```node
(async () => { const f = path.join(dir, 'f'); await fsp.writeFile(f, 'hello'); const s = await fsp.stat(f); return [s.size, s.isFile(), s.isDirectory(), s.isSymbolicLink(), s.mtime instanceof Date, typeof s.mode]; })()
```

**12.** Що поверне `stat` для директорії?

```node
(async () => { const s = await fsp.stat(dir); return [s.isDirectory(), s.isFile()]; })()
```

### Рівень 3. Нюанси та пастки

**13.** Чим `lstat` відрізняється від `stat` для символічного посилання?

```node
(async () => { const f = path.join(dir, 'f'), l = path.join(dir, 'l'); await fsp.writeFile(f, 'x'); await fsp.symlink(f, l); return [(await fsp.stat(l)).isSymbolicLink(), (await fsp.lstat(l)).isSymbolicLink(), (await fsp.stat(l)).isFile()]; })()
```

**14.** Що станеться зі `stat` неіснуючого шляху?

```node
(async () => { try { await fsp.stat(path.join(dir, 'no')); } catch (e) { return e.code; } })()
```

**15.** Як перевірити існування через `access` і чому це краще, ніж `existsSync` у деяких випадках?

```node
(async () => { const f = path.join(dir, 'f'); await fsp.writeFile(f, ''); const ok = await fsp.access(f).then(() => true, () => false); const no = await fsp.access(path.join(dir, 'no')).then(() => true, () => false); return [ok, no]; })()
```

**16.** Що дає `access` із `fs.constants.W_OK` для файлу лише для читання?

```node
(async () => { const f = path.join(dir, 'ro'); await fsp.writeFile(f, '', { mode: 0o444 }); return await fsp.access(f, fs.constants.W_OK).then(() => 'writable', e => e.code); })()
```

**17.** Як змінити права через `chmod` та прочитати їх?

```node
(async () => { const f = path.join(dir, 'f'); await fsp.writeFile(f, ''); await fsp.chmod(f, 0o640); return ((await fsp.stat(f)).mode & 0o777).toString(8); })()
```

**18.** Як порахувати сумарний розмір файлів у директорії?

```node
(async () => { await fsp.writeFile(path.join(dir, 'a'), '12345'); await fsp.writeFile(path.join(dir, 'b'), '123'); let t = 0; for (const n of await fsp.readdir(dir)) t += (await fsp.stat(path.join(dir, n))).size; return t; })()
```

### Рівень 4. Практика

**19.** Як обійти дерево директорій у глибину та вивести відносні шляхи?

```node
(async () => { await fsp.mkdir(path.join(dir, 'a', 'b'), { recursive: true }); await fsp.writeFile(path.join(dir, 'a', 'f1'), ''); await fsp.writeFile(path.join(dir, 'a', 'b', 'f2'), ''); const walk = async (d) => (await Promise.all((await fsp.readdir(d, { withFileTypes: true })).map(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(dir, path.join(d, e.name))]))).flat(); return (await walk(dir)).sort(); })()
```

**20.** Як знайти файли за розширенням?

```node
(async () => { for (const n of ['a.js', 'b.ts', 'c.js', 'd.md']) await fsp.writeFile(path.join(dir, n), ''); return (await fsp.readdir(dir)).filter(n => path.extname(n) === '.js').sort(); })()
```

**21.** Що поверне `fsp.mkdtemp` та `fsp.realpath`?

```node
(async () => { const t = await fsp.mkdtemp(path.join(dir, 'x-')); return [path.basename(t).startsWith('x-'), path.basename(t).length, (await fsp.realpath(t)).endsWith(path.basename(t))]; })()
```

**22.** Що поверне `fsp.cp` для директорії?

```node
(async () => { await fsp.mkdir(path.join(dir, 's')); await fsp.writeFile(path.join(dir, 's', 'f'), 'z'); await fsp.cp(path.join(dir, 's'), path.join(dir, 't'), { recursive: true }); return (await fsp.readdir(path.join(dir, 't'))); })()
```

### Відповіді

1. `[undefined, 'x']`
2. `'EEXIST'`
3. `undefined`
4. `['a.txt', 'b.txt', 'c']`
5. `[['f.txt', true, false], ['sub', false, true]]`
6. `['a', 'a/b', 'a/b/f.txt', 'r.txt']`
7. `'ENOTDIR'`
8. `'ENOTEMPTY'`
9. `[false]`
10. `'ENOENT'`
11. `[5, true, false, false, true, 'number']`
12. `[true, false]`
13. `[false, true, true]`
14. `'ENOENT'`
15. `[true, false]`
16. `'EACCES'`
17. `'640'`
18. `8`
19. `['a/b/f2', 'a/f1']`
20. `['a.js', 'c.js']`
21. `[true, 8, true]`
22. `['f']`
