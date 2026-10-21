# console — налагодження й логування в JavaScript

> Усі приклади запущено в Node 24. У браузері вигляд виводу відрізняється (інтерактивні дерева, кольори), але набір методів і їх семантика однакові. Де є різниця — вказано.

## 1. Що таке console

`console` — глобальний об'єкт з методами для виводу діагностики. Він не частина мови (ECMAScript), а стандарт WHATWG Console, реалізований у браузерах і Node.js. Усі методи повертають `undefined`.

```js
console.log("x"); // x
console.log(String(console.log("x"))); // x, потім undefined
const { log } = console;
log("працює і відв'язаним"); // у Node методи прив'язані до console
```

## 2. Рівні: log, info, debug, warn, error

```js
console.log("log");
console.info("info");
console.debug("debug");
console.warn("warn");
console.error("error");
```

- У браузері рівні мають різні кольори, і DevTools дозволяє їх фільтрувати (Verbose = `debug`, Info, Warnings, Errors).
- У Node: `log`, `info`, `debug` пишуть у **stdout**, а `warn`, `error`, `trace` та `assert` — у **stderr**. Це перевірено: `node s.mjs 2>/dev/null` не показує `warn` і `error`. Тому в shell їх можна розділити: `node app.js > out.log 2> err.log`.

## 3. Кілька аргументів і формат-специфікатори

```js
console.log("a", 1, { x: 1 }, [1, 2], null, undefined, Symbol("s"));
// a 1 { x: 1 } [ 1, 2 ] null undefined Symbol(s)

console.log("%s is %d years, %i int, %f float", "Іра", 25.9, 25.9, "1.5");
// Іра is 25.9 years, 25 int, 1.5 float
console.log("%o | %O | %j", { a: 1 }, { a: 1 }, { a: 1 });
// { a: 1 } | { a: 1 } | {"a":1}      (%j — лише в Node)
console.log("100%% sure", "extra", 5); // 100% sure extra 5
console.log("%d", "42abc"); // NaN
console.log("%c styled", "color:red"); // браузер: червоний текст; Node: " styled"
```

Специфікатори: `%s` рядок, `%d` число, `%i` ціле, `%f` дробове, `%o` / `%O` об'єкт, `%j` JSON (Node), `%c` CSS-стилі (браузер), `%%` символ відсотка. Зайві аргументи просто додаються через пробіл. Специфікатори діють лише в **першому** аргументі, якщо він рядок.

```js
console.log("%s", { a: 1 }, "%s", [1, 2]); // { a: 1 } %s [ 1, 2 ]
```

## 4. Як console показує значення

Це не `toString`: `console.log` використовує «інспектор» (у Node — `util.inspect`).

```js
console.log("obj: " + { a: 1 }, "obj:", { a: 1 });
// obj: [object Object] obj: { a: 1 }
console.log("arr: " + [1, 2], "arr:", [1, 2]);
// arr: 1,2 arr: [ 1, 2 ]
console.log(new Map([[1, { a: 1 }]]), new Set([1]));
// Map(1) { 1 => { a: 1 } } Set(1) { 1 }
console.log(function foo() {}, class A {}, () => 1);
// [Function: foo] [class A] [Function (anonymous)]
console.log(-0, [-0], 0.1 + 0.2, [undefined, , 3]);
// -0 [ -0 ] 0.30000000000000004 [ undefined, <1 empty item>, 3 ]
const circ = { n: 1 }; circ.self = circ;
console.log(circ); // <ref *1> { n: 1, self: [Circular *1] }
console.log({ a: { b: { c: { d: 1 } } } }); // { a: { b: { c: [Object] } } } — глибина 2
```

- Рядок у масиві/об'єкті показується в лапках: `[ 'str' ]`, а окремий — без.
- Великі масиви скорочуються: після 100 елементів — `... 20 more items`.
- Об'єкт з методом `[Symbol.for('nodejs.util.inspect.custom')]` керує своїм виглядом у Node; `%s` використовує `toString`:

```js
const o = { toString() { return "TS"; }, [Symbol.for("nodejs.util.inspect.custom")]() { return "CUSTOM"; } };
console.log(o, `${o}`); // CUSTOM TS
console.log("%s", o); // TS
```

## 5. console.dir та глибина

```js
console.dir({ a: { b: { c: { d: 1 } } } }, { depth: 0 }); // { a: [Object] }
console.dir({ a: { b: { c: { d: 1 } } } }, { depth: null }); // повністю
```

`dir` у браузері показує об'єкт як інтерактивне дерево властивостей (навіть для DOM-елемента — `log` показує розмітку, `dir` — об'єкт). `console.dirxml` для DOM показує розмітку.

## 6. Пастка: вивід «живий» у браузері

У DevTools об'єкт, виведений через `console.log`, розкривається **пізніше**, і ви бачите його стан на момент розкриття, а не на момент виклику. Щоб зафіксувати знімок, виводьте копію:

```js
const arr = [1];
console.log(arr); // у браузері після розкриття може показати [1, 2]
arr.push(2);
console.log(JSON.stringify(arr)); // [1,2] — знімок рядком
console.log(structuredClone(arr)); // знімок-копія
```

У Node вивід форматується одразу, тому там `[ 1 ]` залишається.

## 7. console.table

```js
console.table([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
// ┌─────────┬───┬─────┐
// │ (index) │ a │ b   │
// │ 0       │ 1 │ 'x' │
// │ 1       │ 2 │ 'y' │
console.table([[1, 2], [3, 4]]); // колонки 0 і 1
console.table([{ a: 1, b: 2 }], ["a"]); // лише колонка a
console.table({ r1: { c: 1 }, r2: { c: 2 } }); // рядки r1, r2
```

## 8. Групи

```js
console.group("Група");
console.log("в групі");
console.groupCollapsed("вкладена"); // у браузері згорнута
console.log("глибше");
console.groupEnd();
console.groupEnd();
console.log("поза");
// Група
//   в групі
//   вкладена
//     глибше
// поза
```

Не забувайте `groupEnd` на кожну `group`, інакше відступ залишиться до кінця.

## 9. Лічильник: count

```js
console.count(); // default: 1
console.count(); // default: 2
console.count("x"); // x: 1
console.countReset();
console.count(); // default: 1
```

## 10. Таймер: time, timeLog, timeEnd

```js
console.time("t");
console.timeLog("t", "проміжок"); // t: 0.004ms проміжок
console.timeEnd("t"); // t: 0.033ms — і таймер видаляється
console.timeEnd("t"); // Node: Warning: No such label 't' for console.timeEnd()
```

Мітка — рядок, за замовчуванням `default`. Для точних замірів у коді використовуйте `performance.now()` ([date.md](date.md) розділ 10).

## 11. assert та trace

```js
console.assert(1 === 1, "не покаже"); // нічого
console.assert(1 === 2, "покаже %s", "формат"); // Assertion failed: покаже формат
console.assert(false); // Assertion failed
function f() { console.trace("де я"); } f();
// Trace: де я
//     at f (file:///.../t.mjs:36:22)
//     at ...
```

`assert` **не кидає** виняток і не зупиняє програму (на відміну від `assert` з Node або `throw`). `trace` друкує стек викликів без помилки.

## 12. Решта методів

- `console.clear()` — очистити консоль (у Node працює лише для TTY).
- `console.profile()` / `profileEnd()` / `timeStamp()` — існують, але нестандартні; корисні лише в DevTools.
- `new (require("node:console").Console)({ stdout, stderr })` — власний екземпляр, що пише у вказані потоки (Node):

```js
import { Console } from "node:console";
const c = new Console({ stdout: process.stdout, stderr: process.stdout });
c.log("custom"); // custom
```

Повний набір ключів `console` у Node: `log, info, debug, warn, error, dir, time, timeEnd, timeLog, trace, assert, clear, count, countReset, group, groupEnd, table, dirxml, groupCollapsed, Console, profile, profileEnd, timeStamp, context, createTask`.

## 13. Типові помилки

- Складати об'єкт із рядком: `"obj: " + obj` дає `[object Object]`. Передавайте окремим аргументом: `console.log("obj:", obj)`.
- Залишати `console.log` у продакшені: він засмічує вивід, а у Node запис у термінал або файл може блокувати потік. Для сервера — структурований логер (pino, winston).
- Логувати секрети (токени, паролі, персональні дані).
- Вважати `console.assert` перевіркою, що зупиняє код.
- Покладатися на живий вивід об'єкта в DevTools (розділ 6).
- Використовувати `console.log` для помилок: `console.error` піде в stderr і підсвітиться.
- Очікувати стилі `%c` у Node.

## Підсумок

- `console` — не частина мови, а стандарт середовища; методи повертають `undefined`.
- `log/info/debug` → stdout, `warn/error/trace/assert` → stderr (Node).
- Перший аргумент-рядок підтримує `%s %d %i %f %o %O %j %c %%`.
- Значення показує інспектор, а не `toString`; глибина за замовчуванням 2 (`dir` з `depth`).
- `table`, `group`, `count`, `time/timeLog/timeEnd`, `assert`, `trace` — інструменти структурованої діагностики.
- У браузері вивід об'єкта «живий»: фіксуйте знімок `structuredClone` або `JSON.stringify`.
- У продакшені — логер, а не `console.log`.
