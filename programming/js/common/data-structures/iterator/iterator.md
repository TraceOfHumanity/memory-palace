# Iterator / Iterable — протоколи ітерації в JavaScript (ES6)

## 1. Два окремі протоколи: Iterator та Iterable

Це не одне й те саме, хоча терміни часто плутають:

- **Iterator protocol** (протокол ітератора): об'єкт є ітератором, якщо в нього є метод `next()`, який повертає об'єкт виду `{ value, done }`:
  - `value` — поточне значення на цьому кроці ітерації;
  - `done` — `false`, поки є ще значення; `true`, коли ітерація скінчена.
- **Iterable protocol** (протокол ітерованого): об'єкт є iterable, якщо в нього є метод `[Symbol.iterator]()`, який повертає ітератор (об'єкт за протоколом вище).

Саме через ці два протоколи працюють `for...of`, spread `[...obj]`, деструктуризація масивів, `Array.from()`, `Promise.all()` тощо — вони всі шукають `[Symbol.iterator]` на об'єкті.

```js
const manualIterator = {
  current: 1,
  last: 3,
  next() {
    if (this.current <= this.last) {
      return { value: this.current++, done: false };
    }
    return { value: undefined, done: true };
  },
};
// це "чистий" ітератор — має next(), але не iterable
// (немає [Symbol.iterator]), тому for...of по ньому не спрацює:
console.log(manualIterator.next()); // { value: 1, done: false }
console.log(manualIterator.next()); // { value: 2, done: false }
console.log(manualIterator.next()); // { value: 3, done: false }
console.log(manualIterator.next()); // { value: undefined, done: true }
// for (const x of manualIterator) {} // TypeError: manualIterator is not iterable
```

## 2. Створення власного iterable-об'єкта

Щоб об'єкт став ітерованим (можна писати `for...of`, `[...obj]`), потрібно реалізувати `[Symbol.iterator]()` — метод без аргументів, що повертає новий об'єкт-ітератор із власним `next()`.

```js
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        if (current <= last) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  },
};

for (const n of range) {
  console.log(n); // 1, 2, 3, 4, 5
}
console.log([...range]); // [1, 2, 3, 4, 5] — spread теж працює завдяки Symbol.iterator

// деструктуризація теж використовує ітерацію "під капотом":
const [a, b] = range;
console.log(a, b); // 1 2 — беруться перші два значення з ітератора
```

Чому `[Symbol.iterator]()` повертає новий об'єкт кожного разу: кожен виклик `range[Symbol.iterator]()` створює новий, незалежний об'єкт-ітератор із власним замиканням над `current`. Це дозволяє перебирати `range` одночасно кілька разів, не заважаючи одне одному:

```js
const iteratorRun1 = range[Symbol.iterator]();
const iteratorRun2 = range[Symbol.iterator]();
console.log(iteratorRun1.next().value); // 1
console.log(iteratorRun1.next().value); // 2
console.log(iteratorRun2.next().value); // 1 — незалежний прогрес, не 3!
```

## 3. Вбудовані ітеровані типи — Array, String, Map, Set

Усі ці вбудовані структури даних вже реалізують `[Symbol.iterator]` самі — саме тому `for...of` одразу працює з ними без жодних додаткових зусиль з боку розробника.

```js
// а) Array — ітератор по значеннях (еквівалент arr.values())
const arr = [10, 20, 30];
const arrIterator = arr[Symbol.iterator]();
console.log(arrIterator.next()); // { value: 10, done: false }
console.log(arrIterator.next()); // { value: 20, done: false }
console.log(arrIterator.next()); // { value: 30, done: false }
console.log(arrIterator.next()); // { value: undefined, done: true }

// б) String — ітератор по символах (коректно враховує Unicode-пари!)
const str = "hi";
const strIterator = str[Symbol.iterator]();
console.log(strIterator.next()); // { value: "h", done: false }
console.log(strIterator.next()); // { value: "i", done: false }
console.log(strIterator.next()); // { value: undefined, done: true }

// рядкова ітерація коректно обробляє символи поза Basic Multilingual
// Plane (наприклад, емодзі), на відміну від звичайного індексування:
const emojiStr = "a😀b";
console.log(emojiStr.length); // 4 — емодзі займає 2 "code unit"
console.log([...emojiStr]); // ["a", "😀", "b"] — а ітерація бачить його як один символ
console.log(emojiStr[1], emojiStr[2]); // "половинки" surrogate pairs — зламане індексування

// в) Map — ітератор по парах [ключ, значення] (еквівалент map.entries())
const map = new Map([
  ["a", 1],
  ["b", 2],
]);
for (const [key, val] of map) {
  console.log(key, val); // a 1 / b 2
}

// г) Set — ітератор по значеннях (еквівалент set.values())
const set = new Set([1, 2, 3]);
for (const value of set) {
  console.log(value); // 1, 2, 3
}
```

## 4. Що саме розуміє [Symbol.iterator] «під капотом» — for...of, spread, і т. д.

`for...of` (і всі інші механізми, що працюють з iterable) — це, по суті, синтаксичний цукор над таким циклом:

```js
function manualForOf(iterable, callback) {
  const iterator = iterable[Symbol.iterator]();
  let result = iterator.next();
  while (!result.done) {
    callback(result.value);
    result = iterator.next();
  }
}
manualForOf([1, 2, 3], (value) => console.log("manually:", value));
// manually: 1 / manually: 2 / manually: 3
```

Список механізмів, які спираються саме на ітерованість: `for...of`, spread `[...x]` (для `{...x}` над Map/Set-подібними об'єктами так не спрацює), деструктуризація масивів, `Array.from(iterable)`, `Promise.all(iterable)`, `new Map(iterable)` / `new Set(iterable)`, `yield*` усередині генераторів.

## 5. Делегування готовому ітератору — найпростіший спосіб зробити об'єкт iterable

Якщо всередині об'єкта вже є масив (чи інша iterable-структура), найпростіше — просто делегувати виклик його готовому ітератору, а не писати `next()` вручну.

```js
const customCollection = {
  items: ["x", "y", "z"],
  [Symbol.iterator]() {
    return this.items[Symbol.iterator](); // делегування ітератору масиву
  },
};

for (const item of customCollection) {
  console.log(item); // x, y, z
}
console.log(Array.from(customCollection)); // ["x", "y", "z"]
```

## 6. Генератори (function*) — набагато простіший спосіб створити ітератор

Функція-генератор (`function*` / `yield`) автоматично повертає об'єкт, що одночасно є і ітератором (має `next()`), і iterable (має власний `[Symbol.iterator]()`, що повертає сам себе) — не потрібно вручну писати `{ value, done }` на кожному кроці, рушій робить це сам.

```js
function* genRange(from, to) {
  for (let i = from; i <= to; i++) {
    yield i; // "призупиняє" функцію й повертає { value: i, done: false }
  }
  // неявний return після циклу дає останній { value: undefined, done: true }
}

const gen = genRange(1, 3);
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }

// генератор сам є iterable — тому for...of працює напряму:
for (const n of genRange(5, 7)) {
  console.log(n); // 5, 6, 7
}
```

Переписуючи `range` із розділу 2 через генератор — набагато коротше:

```js
const rangeWithGenerator = {
  from: 1,
  to: 5,
  *[Symbol.iterator]() {
    // генераторний метод одразу як [Symbol.iterator]
    for (let i = this.from; i <= this.to; i++) {
      yield i;
    }
  },
};
console.log([...rangeWithGenerator]); // [1, 2, 3, 4, 5] — той самий результат, менше коду
```

## 7. Нескінченні ітератори (lazy evaluation)

Ітератор не зобов'язаний колись завершитись (`done: true`) — можна створити нескінченну послідовність, яка обчислює наступне значення лише за запитом («ліниво» / lazily), а не одразу всю наперед. Це головна перевага ітераторів над «готовими» масивами: пам'ять не витрачається на всі значення одразу.

```js
const infiniteSequence = {
  start: 0,
  [Symbol.iterator]() {
    let current = this.start;
    return {
      next() {
        return { value: current++, done: false }; // done завжди false — нескінченно!
      },
    };
  },
};
// [...infiniteSequence]; // ніколи не завершиться — так робити не можна!

// щоб безпечно користуватись нескінченним ітератором, потрібен
// спосіб обмежити кількість значень, які реально забираються:

function take(iterable, count) {
  return {
    [Symbol.iterator]() {
      const it = iterable[Symbol.iterator]();
      let remaining = count;
      return {
        next() {
          if (remaining <= 0) {
            return { value: undefined, done: true };
          }
          const result = it.next();
          if (result.done) {
            return result;
          }
          remaining--;
          return result;
        },
      };
    },
  };
}

const limited = [...take(infiniteSequence, 5)];
console.log(limited); // [0, 1, 2, 3, 4] — нескінченний ітератор, обмежений через take()

// той самий take() через генератор — набагато читабельніше:
function* takeGenerator(iterable, count) {
  let i = 0;
  for (const value of iterable) {
    if (i++ >= count) return;
    yield value;
  }
}
console.log([...takeGenerator(infiniteSequence, 3)]); // [0, 1, 2]
```

## 8. return() та throw() — додаткові (необов'язкові) методи ітератора

Окрім обов'язкового `next()`, ітератор може мати необов'язкові методи `return()` і `throw()`. `return()` рушій викликає автоматично, коли ітерація завершується достроково (`break`, `return`, `throw` усередині `for...of`) — це шанс «прибрати за собою» (закрити файл, звільнити ресурс тощо).

```js
function iterableWithCleanup() {
  return {
    [Symbol.iterator]() {
      let i = 0;
      return {
        next() {
          return i < 5 ? { value: i++, done: false } : { value: undefined, done: true };
        },
        return(value) {
          console.log("cleaning up resources (return called early)");
          return { value, done: true };
        },
      };
    },
  };
}

for (const n of iterableWithCleanup()) {
  console.log(n);
  if (n === 2) break; // достроковий вихід → рушій викликає return() автоматично
}
// 0 / 1 / 2 / "cleaning up resources (return called early)"
```

## 9. Iterator Helpers — методи прямо на ітераторі (ES2025)

Сучасні рушії додали методи, схожі на масивні (`map`/`filter`/`take`/`drop`/`reduce`), які працюють напряму на ітераторі — ліниво (обчислюють значення по одному, а не будують проміжні масиви).

```js
function* naturalNumbers() {
  let n = 1;
  while (true) yield n++;
}

const firstFiveEvenSquares = naturalNumbers()
  .filter((n) => n % 2 === 0) // лінивий фільтр
  .map((n) => n * n) // лінивий мапінг
  .take(5) // лише перші 5 — саме тут "лінивість" рятує від нескінченного циклу
  .toArray(); // матеріалізація в звичайний масив

console.log(firstFiveEvenSquares); // [4, 16, 36, 64, 100]
// без Iterator Helpers довелось би писати take()/filter()/map() вручну,
// як показано в розділах 6-7 вище
```

## 10. Iterator vs Generator vs Iterable — як не плутати терміни

| Термін | Що це |
|---|---|
| Iterator | будь-який об'єкт з `next()`, що повертає `{ value, done }` |
| Iterable | будь-який об'єкт з `[Symbol.iterator]()`, що повертає iterator |
| Generator | спеціальна функція (`function*`), яка автоматично створює об'єкт, що є одразу і iterator, і iterable |

Генератор — це просто найзручніший спосіб отримати правильно побудований iterator/iterable, а не окрема, третя сутність.

## 11. Ітератор — одноразовий, iterable — багаторазовий

- **Iterable** (масив, `Set`, `Map`, ваш `range`) — це **фабрика ітераторів**: кожен виклик `[Symbol.iterator]()` створює **новий** ітератор зі своїм станом, тому можна обходити багато разів і паралельно.
- **Ітератор** зберігає **стан** («де я зараз»), тому після вичерпання **порожній** назавжди.
- **Генератор** — і ітератор, і iterable, але `gen[Symbol.iterator]()` повертає **сам `gen`** (перевірено), тому генератор обходиться **один раз**.

```js
const g = (function* () { yield 1; })();
[...g];   // [1]
[...g];   // []  — уже вичерпаний

const arr = [1, 2];
arr[Symbol.iterator]() !== arr[Symbol.iterator]();   // true — щоразу новий ітератор
```

Типова помилка: зберегти генератор у змінну й обходити двічі. Рішення — **функція, що повертає новий генератор** (`const nums = () => gen(); [...nums()]; [...nums()]`), або збереження результату в масив.

## 12. Генератори докладно

### `yield` — це «вихід» та «вхід»

`yield` не лише віддає значення, а й **приймає** значення з наступного `next(x)` (перевірено):

```js
function* chat() {
  const a = yield "Q1";        // призупинились; наступний next("A1") передасть "A1" у a
  const b = yield `got ${a}`;
  return `done ${b}`;
}
const g = chat();
g.next("ігнорується");  // { value: "Q1", done: false } — перший next() лише запускає генератор
g.next("A1");           // { value: "got A1", done: false }
g.next("A2");           // { value: "done A2", done: true }
g.next();               // { value: undefined, done: true }
```

Тобто генератор — **співпрограма (coroutine)**: функція, яку можна призупиняти й відновлювати з обміном даними. Перший `next()` значення не передає (нікому приймати).

### `return` у генераторі

Значення, повернуте через `return`, потрапляє в `{ value, done: true }`, але **`for…of` і spread його ігнорують** (перевірено: `[...r()]` для `yield 1; return 99` дає `[1]`). Воно корисне лише при ручних `next()` або при `yield*`.

### `yield*` — делегування іншому iterable/генератору

```js
function* inner() { yield "a"; yield "b"; return "ret"; }
function* outer() {
  const x = yield* inner();   // віддає "a", "b", а x отримає значення return → "ret"
  yield x;
  yield* [1, 2];              // делегування будь-якому iterable
}
[...outer()];   // ["a", "b", "ret", 1, 2]
```

`yield*` — основа рекурсивних генераторів (обхід дерева: `yield* walk(node.left); yield node.value; yield* walk(node.right)`).

### `gen.return(v)` та `gen.throw(e)`

- `gen.return(7)` — **достроково завершує** генератор; виконуються блоки **`finally`** (перевірено: «cleanup» спрацював).
- `gen.throw(err)` — кидає помилку **всередині** генератора в точці `yield`; її можна перехопити `try/catch` і продовжити.

```js
function* withCleanup() {
  try { yield 1; yield 2; }
  finally { console.log("cleanup"); }   // викличеться при return()/break/помилці
}
```

### Генератор як машина станів і лінивий потік

```js
function* traffic() { while (true) { yield "green"; yield "yellow"; yield "red"; } }
const t = traffic();
t.next().value;  // "green", потім "yellow", "red", "green"…
```

Нескінченні послідовності, ідентифікатори, чергування станів, парсери (кожне `yield` — «ось наступний токен») — типові задачі генераторів.

## 13. Протокол «закриття»: коли викликається `return()` ітератора

Рушій викликає `iterator.return()` (якщо він є), щоб дати ітератору **прибрати ресурси**, коли споживач **не дочитав** послідовність до кінця. Перевірено запуском для трьох випадків:

| Ситуація | `return()` викликається? |
|---|---|
| `break` у `for…of` | так |
| Помилка (`throw`) в тілі циклу | так |
| Деструктуризація, що взяла лише частину: `const [a, b] = iterable` | так |
| Ітератор дійшов до кінця сам (`done: true`) | **ні** |

Тому ітератори, що тримають ресурс (файл, з'єднання, курсор БД), реалізують `return()`, а генератори — користуються `try/finally`.

## 14. Лінивість: порядок обчислення

Ітератори **ліниві**: значення обчислюються **на вимогу**, по одному, через увесь ланцюжок. Перевірено на ланцюжку генератор → `filter` → `map` → `take`:

```
gen 1 → filter 1 (відсіяно)
gen 2 → filter 2 → map 2 (результат 4)
gen 3 → filter 3 (відсіяно)
gen 4 → filter 4 → map 4 (результат 16)  → take(2) виконано, генератор більше не запитується
```

Кожен елемент проходить **весь ланцюжок до кінця**, перш ніж береться наступний (на відміну від масивів, де `filter` обробляє **весь** масив, потім `map` обробляє **весь** результат). Наслідки: **O(1) пам'яті**, можливість нескінченних джерел, дострокова зупинка без зайвої роботи.

## 15. Iterator Helpers докладно (ES2025)

Методи доступні на **будь-якому** ітераторі, що успадковує `Iterator.prototype` (генератори, `arr.values()`, `set.values()`, `map.entries()`…) — перевірено в Node 24:

| Метод | Що робить | Повертає |
|---|---|---|
| `map(fn)`, `filter(fn)` | ліниво перетворює/відсіює | ітератор |
| `take(n)`, `drop(n)` | перші n / пропустити n | ітератор |
| `flatMap(fn)` | map + розгортання вкладених iterable | ітератор |
| `reduce(fn, init)` | згортка | значення |
| `toArray()` | зібрати все | масив |
| `forEach(fn)` | побічні ефекти | `undefined` |
| `some(fn)`, `every(fn)`, `find(fn)` | короткозамкнені перевірки/пошук | boolean / значення |

```js
Iterator.from([1, 2, 3, 4]).drop(1).take(2).toArray();           // [2, 3]
[1, 2, 3].values().map((x) => x * 2).toArray();                  // [2, 4, 6]
new Set([1, 2, 3]).values().filter((x) => x > 1).toArray();      // [2, 3]
Iterator.from([[1, 2], [3]]).flatMap((x) => x).toArray();        // [1, 2, 3]
```

**`Iterator.from(x)`** перетворює iterable **або «голий» об'єкт із `next()`** на повноцінний ітератор з методами-помічниками (перевірено для об'єкта з `next()`).

Для старих середовищ — вручну генераторами (розділи 6–7) або бібліотеки.

## 16. Асинхронні ітератори та генератори

Для **асинхронних** джерел (мережа, потоки, пагінація) є дзеркальні протоколи:

- `[Symbol.asyncIterator]()`, `next()` повертає **`Promise<{ value, done }>`**;
- `async function*` — асинхронний генератор (одночасно `await` і `yield`);
- споживання — **`for await (const x of source)`**.

```js
async function* pages(fetchPage) {
  for (let p = 1; ; p++) {
    const items = await fetchPage(p);   // чекаємо відповідь
    if (items.length === 0) return;
    yield items;                        // віддаємо сторінку
  }
}
for await (const items of pages(api)) process(items);
```

Перевірено: `async function*` з трьома сторінками обходиться через `for await` у правильному порядку. Переваги: **зворотний тиск** (споживач сам «тягне» наступну порцію — наступний запит не робиться, поки не оброблено поточну), природне **скасування** (`break` закриває потік через `return()`), лінивий читач великих файлів/стрімів (`ReadableStream`, `fs.createReadStream` у Node — async iterable).

## 17. Хто споживає iterable

Усе, що приймає iterable, працює з масивом, `Set`, `Map`, рядком, генератором, вашим класом — однаково:

`for…of`, spread `[...x]` та виклик `f(...x)`, деструктуризація масиву, `Array.from(x)`, `new Set(x)`, `new Map(x)`, `Object.fromEntries(x)`, `Promise.all(x)` / `race` / `allSettled` / `any` (перевірено: `Promise.all(new Set([...]))`), `yield*`, `Math.max(...x)`.

Тому **реалізація `[Symbol.iterator]` — це «універсальний вхід»** у всю мову: один раз зробив — підключився до всього.

## 18. Типові помилки

1. Ітерувати вичерпаний генератор/ітератор вдруге.
2. Забути `{ value, done }` або повернути просто значення з `next()`.
3. Повернути з `[Symbol.iterator]()` **той самий** ітератор зі спільним станом, коли очікується багаторазова ітерація.
4. `for…of` по звичайному об'єкту (він не iterable).
5. Нескінченний генератор + `[...gen]` / `Array.from(gen)` / `for…of` без `break`/`take` — зависання.
6. Покладатися на `return` значення генератора у `for…of` (воно ігнорується).
7. Не звільняти ресурси: немає `finally`/`return()` в ітераторі з ресурсом.
8. `yield` усередині звичайного callback (`forEach(x => { yield x })`) — `yield` дозволений лише безпосередньо в тілі генератора.
9. Плутати `yield*` (делегування) і `yield` (значення).
10. Забути, що **перший** `next(x)` значення не передає.
11. Використовувати Iterator Helpers без перевірки підтримки в середовищі.

## 19. Алгоритм: як думати про ітерацію

1. Є послідовність, яку можна віддавати **по одному**? → зроби її iterable.
2. Простіше за все — **генератор** (`*[Symbol.iterator]() { yield … }`).
3. Потрібен **багаторазовий** обхід → iterable (фабрика), не один ітератор.
4. Джерело **нескінченне/велике** → лініві ітератори + `take`/`filter`/`map` (Iterator Helpers).
5. Є **ресурс** → `try/finally` у генераторі або `return()` в ітераторі.
6. Джерело **асинхронне** → `async function*` + `for await`.
7. Потрібен масив → `[...x]` / `Array.from(x)` / `.toArray()`.

## Підсумок

- Iterator protocol: об'єкт з `next()`, що повертає `{ value, done }`.
- Iterable protocol: об'єкт з `[Symbol.iterator]()`, що повертає iterator.
- Саме на цих двох протоколах тримаються `for...of`, spread, деструктуризація масивів, `Array.from()`, `Promise.all()`, `new Map()`/`Set()`.
- `Array`/`String`/`Map`/`Set` вже iterable «з коробки» — не потребують ручної реалізації.
- String-ітерація коректно враховує Unicode-пари (емодзі), на відміну від прямого індексування рядка.
- Найпростіший спосіб зробити об'єкт iterable — делегувати готовому ітератору внутрішньої структури (`this.items[Symbol.iterator]()`).
- Генератори (`function*`) — набагато простіший спосіб написати ітератор: рушій сам формує `{ value, done }` на кожному `yield`.
- Ітератор може бути нескінченним (лінива послідовність) — головна перевага над готовими масивами; для безпечного споживання потрібен `take()`-подібний обмежувач.
- Необов'язкові `return()`/`throw()` дають шанс «прибрати ресурси» при достроковому виході з `for...of` (`break`/`return`/`throw`).
- Iterator Helpers (ES2025) — `map`/`filter`/`take`/`drop`/`reduce`/`toArray` напряму на ітераторі, ліниво, без побудови проміжних масивів.
- Ітератор одноразовий, iterable — багаторазовий; `gen[Symbol.iterator]()` повертає сам генератор.
- `yield` приймає значення з `next(x)`; значення `return` генератора `for…of`/spread ігнорують; `yield*` делегує.
- `return()` ітератора викликається при `break`, помилці й неповній деструктуризації (не при природному завершенні).
- Ітерація ліниво проходить увесь ланцюжок по одному елементу; Iterator Helpers: `map/filter/take/drop/flatMap/reduce/toArray/forEach/some/every/find`, `Iterator.from`.
- Асинхронні: `Symbol.asyncIterator`, `async function*`, `for await…of`.
