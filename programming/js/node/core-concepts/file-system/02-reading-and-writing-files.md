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

## Задачі для закріплення

21 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в Node.js 24; `fs` — `node:fs`, `fsp` — `node:fs/promises`, `dir` — порожня тимчасова директорія, `path`, `os`, `stream`, `events` — відповідні `node:`-модулі.

### Рівень 1. Основи

**1.** Що поверне `writeFile` для нового файлу та чи перезаписує існуючий?

```node
(async () => { const f = path.join(dir, 'a.txt'); await fsp.writeFile(f, 'first'); await fsp.writeFile(f, 'second'); return await fsp.readFile(f, 'utf8'); })()
```

**2.** Що дасть `appendFile`?

```node
(async () => { const f = path.join(dir, 'a.txt'); await fsp.writeFile(f, 'a'); await fsp.appendFile(f, 'b'); await fsp.appendFile(f, 'c'); return await fsp.readFile(f, 'utf8'); })()
```

**3.** Чи створить `appendFile` файл, якого немає?

```node
(async () => { const f = path.join(dir, 'new.txt'); await fsp.appendFile(f, 'x'); return [fs.existsSync(f), await fsp.readFile(f, 'utf8')]; })()
```

**4.** Що поверне `readFile` без кодування для UTF-8 кирилиці та з кодуванням?

```node
(async () => { const f = path.join(dir, 'u.txt'); await fsp.writeFile(f, 'Привіт'); const b = await fsp.readFile(f); const s = await fsp.readFile(f, 'utf8'); return [b.length, s.length, s]; })()
```

**5.** Що запишеться, якщо передати об'єкт у `writeFile`?

```node
(async () => { try { await fsp.writeFile(path.join(dir, 'o.txt'), { a: 1 }); } catch (e) { return [e.name, e.code]; } })()
```

**6.** Що запишеться, якщо передати число?

```node
(async () => { try { await fsp.writeFile(path.join(dir, 'n.txt'), 123); } catch (e) { return e.code; } })()
```

### Рівень 2. Деталі й поведінка

**7.** Як записати `Buffer` та `Uint8Array`?

```node
(async () => { const f = path.join(dir, 'b.bin'); await fsp.writeFile(f, new Uint8Array([104, 105])); return (await fsp.readFile(f)).toString(); })()
```

**8.** Що дає опція `flag: 'wx'` для існуючого файлу?

```node
(async () => { const f = path.join(dir, 'x.txt'); await fsp.writeFile(f, '1'); try { await fsp.writeFile(f, '2', { flag: 'wx' }); } catch (e) { return [e.code, await fsp.readFile(f, 'utf8')]; } })()
```

**9.** Що дає `flag: 'a'`?

```node
(async () => { const f = path.join(dir, 'x.txt'); await fsp.writeFile(f, '1'); await fsp.writeFile(f, '2', { flag: 'a' }); return await fsp.readFile(f, 'utf8'); })()
```

**10.** Що поверне `mode` для нового файлу (права)?

```node
(async () => { const f = path.join(dir, 'm.txt'); await fsp.writeFile(f, 'x', { mode: 0o600 }); return ((await fsp.stat(f)).mode & 0o777).toString(8); })()
```

**11.** Що станеться при запису у неіснуючу директорію?

```node
(async () => { try { await fsp.writeFile(path.join(dir, 'no', 'x.txt'), 'a'); } catch (e) { return e.code; } })()
```

**12.** Як записати вміст у вкладену директорію, що ще не існує?

```node
(async () => { const p = path.join(dir, 'a', 'b'); await fsp.mkdir(p, { recursive: true }); await fsp.writeFile(path.join(p, 'f.txt'), 'deep'); return await fsp.readFile(path.join(p, 'f.txt'), 'utf8'); })()
```

### Рівень 3. Нюанси та пастки

**13.** Що поверне запис багаторядкового тексту та поділ на рядки?

```node
(async () => { const f = path.join(dir, 'l.txt'); await fsp.writeFile(f, ['a', 'b', 'c'].join('\n') + '\n'); return (await fsp.readFile(f, 'utf8')).split('\n'); })()
```

**14.** Що відбудеться з `readFile`, якщо файл — це директорія?

```node
(async () => { try { await fsp.readFile(dir); } catch (e) { return e.code; } })()
```

**15.** Чи атомарний `writeFile`? Що побачить читач під час перезапису порожнього файлу? (просто довжина після)

```node
(async () => { const f = path.join(dir, 'z.txt'); await fsp.writeFile(f, 'x'.repeat(1000)); await fsp.writeFile(f, ''); return (await fsp.readFile(f)).length; })()
```

**16.** Як прочитати лише перші 5 байтів через відкритий файл?

```node
(async () => { const f = path.join(dir, 'p.txt'); await fsp.writeFile(f, '0123456789'); const h = await fsp.open(f); const { bytesRead, buffer } = await h.read(Buffer.alloc(5), 0, 5, 0); await h.close(); return [bytesRead, buffer.toString()]; })()
```

**17.** Як записати з заданої позиції без обрізання файлу?

```node
(async () => { const f = path.join(dir, 'p.txt'); await fsp.writeFile(f, '0123456789'); const h = await fsp.open(f, 'r+'); await h.write('AB', 3); await h.close(); return await fsp.readFile(f, 'utf8'); })()
```

**18.** Як зчитати великий файл по частинах (скільки чанків дасть файл 100 КБ зі стандартним highWaterMark)?

```node
(async () => { const f = path.join(dir, 'big.bin'); await fsp.writeFile(f, Buffer.alloc(100 * 1024)); let n = 0; for await (const c of fs.createReadStream(f)) n++; return n; })()
```

### Рівень 4. Практика

**19.** Що поверне `fsp.copyFile` та `rename`?

```node
(async () => { const a = path.join(dir, 'a'), b = path.join(dir, 'b'), c = path.join(dir, 'c'); await fsp.writeFile(a, 'data'); await fsp.copyFile(a, b); await fsp.rename(b, c); return [fs.existsSync(a), fs.existsSync(b), await fsp.readFile(c, 'utf8')]; })()
```

**20.** Що поверне `fsp.truncate`?

```node
(async () => { const f = path.join(dir, 't'); await fsp.writeFile(f, 'abcdef'); await fsp.truncate(f, 3); return await fsp.readFile(f, 'utf8'); })()
```

**21.** Як безпечно оновити файл через тимчасовий файл і `rename`?

```node
(async () => { const f = path.join(dir, 'conf.json'); await fsp.writeFile(f, '{"v":1}'); const tmp = f + '.tmp'; await fsp.writeFile(tmp, '{"v":2}'); await fsp.rename(tmp, f); return [JSON.parse(await fsp.readFile(f, 'utf8')), fs.existsSync(tmp)]; })()
```

### Відповіді

1. `'second'`
2. `'abc'`
3. `[true, 'x']`
4. `[12, 6, 'Привіт']`
5. `['TypeError', 'ERR_INVALID_ARG_TYPE']`
6. `'ERR_INVALID_ARG_TYPE'`
7. `'hi'`
8. `['EEXIST', '1']`
9. `'12'`
10. `'600'`
11. `'ENOENT'`
12. `'deep'`
13. `['a', 'b', 'c', '']`
14. `'EISDIR'`
15. `0`
16. `[5, '01234']`
17. `'012AB56789'`
18. `2`
19. `[true, false, 'data']`
20. `'abc'`
21. `[{ v: 2 }, false]`
