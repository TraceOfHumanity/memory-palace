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

## Задачі для закріплення

36 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що повертає `[Symbol.iterator]()` масиву і що має результат `next()`?

```js
(() => { const it = [1][Symbol.iterator](); return [it.next(), it.next()]; })()
```

**2.** Яку різницю між iterable та iterator показує перевірка `[]`?

```js
(() => { const a = []; return [typeof a[Symbol.iterator], typeof a.next, typeof a[Symbol.iterator]().next]; })()
```

**3.** Чи є ітератор масиву сам iterable?

```js
(() => { const it = [1, 2][Symbol.iterator](); return [it[Symbol.iterator]() === it, [...it]]; })()
```

**4.** Що збере `for...of` по рядку з емодзі?

```js
[...'a😀b']
```

**5.** Що поверне `[...new Map([['a', 1]])]` і `[...new Set('aab')]`?

```js
[[...new Map([['a', 1]])], [...new Set('aab')]]
```

**6.** Чи можна використовувати `for...of` для звичайного об'єкта?

```js
(() => { try { for (const x of { a: 1 }) ; } catch (e) { return e.name + ': ' + e.message; } })()
```

**7.** Що дасть генератор `function*` при послідовних `next()`?

```js
(() => { function* g() { yield 1; yield 2; return 3; } const it = g(); return [it.next(), it.next(), it.next(), it.next()]; })()
```

**8.** Що збере спред по генератору, який має `return 3`?

```js
(() => { function* g() { yield 1; yield 2; return 3; } return [...g()]; })()
```

**9.** Як працює двосторонній `next(value)` у генераторі?

```js
(() => { function* g() { const a = yield 1; const b = yield a + 1; return a + b; } const it = g(); return [it.next().value, it.next(10).value, it.next(5)]; })()
```

### Рівень 2. Методи й поведінка

**10.** Що поверне `yield*` при делегуванні?

```js
(() => { function* inner() { yield 'a'; yield 'b'; return 'r'; } function* outer() { const r = yield* inner(); yield r; } return [...outer()]; })()
```

**11.** Що дає `return()` на генераторі до завершення?

```js
(() => { function* g() { try { yield 1; yield 2; } finally { yield 'cleanup'; } } const it = g(); it.next(); return [it.return('done'), it.next(), it.next()]; })()
```

**12.** Що станеться після `throw()` у генераторі без `catch`?

```js
(() => { function* g() { yield 1; } const it = g(); it.next(); try { it.throw(new Error('boom')); } catch (e) { return [e.message, it.next()]; } })()
```

**13.** Чи викликається `return()` ітератора при `break` у `for...of`?

```js
(() => { const log = []; const it = { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: false }), return() { log.push('closed'); return { done: true }; } }; } }; for (const x of it) { if (x === 2) break; } return log; })()
```

**14.** Скільки елементів видасть ліниво `take`, якщо ітератор нескінченний?

```js
(() => { function* nat() { let i = 0; while (true) yield i++; } function* take(it, n) { let c = 0; for (const x of it) { if (c++ >= n) return; yield x; } } return [...take(nat(), 4)]; })()
```

**15.** Що дасть `Iterator.from(...).map(...).filter(...).toArray()`?

```js
[1, 2, 3, 4].values().map(x => x * 2).filter(x => x > 2).toArray()
```

**16.** Що поверне `take`, `drop` і `reduce` у iterator helpers?

```js
(() => { const nums = () => [1, 2, 3, 4, 5].values(); return [nums().take(2).toArray(), nums().drop(3).toArray(), nums().reduce((a, b) => a + b)]; })()
```

**17.** Що поверне `flatMap`, `some`, `every`, `find` на ітераторі?

```js
(() => { const n = () => [1, 2, 3].values(); return [n().flatMap(x => [x, x]).toArray(), n().some(x => x > 2), n().every(x => x > 0), n().find(x => x > 1)]; })()
```

**18.** Чи повторно використовується ітератор після `toArray()`?

```js
(() => { const it = [1, 2].values(); return [it.toArray(), it.toArray()]; })()
```

### Рівень 3. Нюанси та пастки

**19.** Чи лінивий `map` на ітераторі? Скільки разів виконається колбек до першого `next()`?

```js
(() => { let n = 0; const it = [1, 2, 3].values().map(x => (n++, x)); const before = n; it.next(); return [before, n]; })()
```

**20.** Який порядок `yield` у двох генераторів, переплетених через `for`?

```js
(() => { function* a() { yield 1; yield 3; } function* b() { yield 2; yield 4; } const x = a(), y = b(), o = []; for (let i = 0; i < 2; i++) o.push(x.next().value, y.next().value); return o; })()
```

**21.** Що дасть `Array.from` для iterable із mapper?

```js
Array.from(new Set([1, 2, 3]), x => x * 2)
```

**22.** Що розгорне деструктуризація з ітератора?

```js
(() => { function* g() { yield 1; yield 2; yield 3; } const [a, , c] = g(); return [a, c]; })()
```

**23.** Зробіть клас `Range` ітерованим (генератор). Що дасть `[...new Range(1, 5, 2)]`?

```js
class Range { constructor(a, b, step = 1) { this.a = a; this.b = b; this.step = step } *[Symbol.iterator]() { for (let i = this.a; i < this.b; i += this.step) yield i } }
```

**24.** Напишіть ітератор вручну (без генератора) для зворотного обходу масиву.

```js
const reversed = arr => ({ [Symbol.iterator]() { let i = arr.length; return { next: () => (i > 0 ? { value: arr[--i], done: false } : { value: undefined, done: true }) } } })
```

**25.** Напишіть генератор `fib()` і `take(n, it)`. Перші 8 чисел Фібоначчі?

```js
function* fib() { let [a, b] = [0, 1]; while (true) { yield a; [a, b] = [b, a + b] } }
function* take(n, it) { let i = 0; for (const x of it) { if (i++ >= n) return; yield x } }
```

**26.** Напишіть `zip(...iters)` на генераторі.

```js
function* zip(...its) { const iters = its.map(i => i[Symbol.iterator]()); while (true) { const rs = iters.map(i => i.next()); if (rs.some(r => r.done)) return; yield rs.map(r => r.value) } }
```

**27.** Напишіть `chunked(iter, n)` — шматки по `n`.

```js
function* chunked(it, n) { let buf = []; for (const x of it) { buf.push(x); if (buf.length === n) { yield buf; buf = [] } } if (buf.length) yield buf }
```

### Рівень 4. Практика й реалізація

**28.** Напишіть `flatten(iter)` генератором для вкладених масивів.

```js
function* flatten(it) { for (const x of it) Array.isArray(x) ? yield* flatten(x) : yield x }
```

**29.** Напишіть `enumerate(iter)` — пари `[індекс, значення]`.

```js
function* enumerate(it, start = 0) { let i = start; for (const x of it) yield [i++, x] }
```

**30.** Напишіть `cycle(iter)` і візьміть перші 7 елементів.

```js
function* cycle(it) { const saved = [...it]; while (saved.length) yield* saved }
```

**31.** Напишіть `range(n)` як `Symbol.iterator`-об'єкт і порівняйте з масивом `Array.from`.

```js
const range = n => ({ *[Symbol.iterator]() { for (let i = 0; i < n; i++) yield i } })
```

**32.** Напишіть `pairs(arr)` — усі пари `[a, b]` (a < b за індексом) генератором.

```js
function* pairs(a) { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) yield [a[i], a[j]] }
```

**33.** Напишіть `treeWalk(node)` — inorder-обхід дерева генератором (`yield*`).

```js
function* treeWalk(n) { if (!n) return; yield* treeWalk(n.l); yield n.v; yield* treeWalk(n.r) }
```

**34.** Напишіть `lazyMap(it, fn)` і `lazyFilter(it, pred)`. Скільки разів викличеться `fn`, якщо взяти перший елемент?

```js
function* lazyMap(it, fn) { for (const x of it) yield fn(x) }
function* lazyFilter(it, p) { for (const x of it) if (p(x)) yield x }
```

**35.** Напишіть `groupConsecutive(iter)` — групи однакових сусідніх елементів.

```js
function* groupConsecutive(it) { let cur, group = []; for (const x of it) { if (group.length && x !== cur) { yield group; group = [] } cur = x; group.push(x) } if (group.length) yield group }
```

**36.** Напишіть `windowed(arr, k)` — ковзні вікна розміром `k`.

```js
function* windowed(a, k) { for (let i = 0; i + k <= a.length; i++) yield a.slice(i, i + k) }
```

### Відповіді

1. `[{ value: 1, done: false }, { value: undefined, done: true }]`
2. `['function', 'undefined', 'function']`
3. `[true, [1, 2]]`
4. `['a', '😀', 'b']`
5. `[[['a', 1]], ['a', 'b']]`
6. `'TypeError: {(intermediate value)} is not iterable'`
7. `[{ value: 1, done: false }, { value: 2, done: false }, { value: 3, done: true }, { value: undefined, done: true }]`
8. `[1, 2]`
9. `[1, 11, { value: 15, done: true }]`
10. `['a', 'b', 'r']`
11. `[{ value: 'cleanup', done: false }, { value: 'done', done: true }, { value: undefined, done: true }]`
12. `['boom', { value: undefined, done: true }]`
13. `['closed']`
14. `[0, 1, 2, 3]`
15. `[4, 6, 8]`
16. `[[1, 2], [4, 5], 15]`
17. `[[1, 1, 2, 2, 3, 3], true, true, 2]`
18. `[[1, 2], []]`
19. `[0, 1]`
20. `[1, 2, 3, 4]`
21. `[2, 4, 6]`
22. `[1, 3]`
23. Виклик `[...new Range(1, 8, 3)]` → `[1, 4, 7]`
24. Виклик `[...reversed([1, 2, 3])]` → `[3, 2, 1]`
25. Виклик `[...take(8, fib())]` → `[0, 1, 1, 2, 3, 5, 8, 13]`
26. Виклик `[...zip([1, 2, 3], 'ab', new Set([true, false, null]))]` → `[[1, 'a', true], [2, 'b', false]]`
27. Виклик `[...chunked([1, 2, 3, 4, 5], 2)]` → `[[1, 2], [3, 4], [5]]`
28. Виклик `[...flatten([1, [2, [3, [4]]], 5])]` → `[1, 2, 3, 4, 5]`
29. Виклик `[...enumerate(['a', 'b', 'c'], 1)]` → `[[1, 'a'], [2, 'b'], [3, 'c']]`
30. Виклик `(() => { const o = []; for (const x of cycle([1, 2, 3])) { if (o.length === 7) break; o.push(x); } return o; })()` → `[1, 2, 3, 1, 2, 3, 1]`
31. Виклик `[[...range(4)], Array.from(range(3))]` → `[[0, 1, 2, 3], [0, 1, 2]]`
32. Виклик `[...pairs([1, 2, 3])]` → `[[1, 2], [1, 3], [2, 3]]`
33. Виклик `[...treeWalk({ v: 2, l: { v: 1 }, r: { v: 3 } })]` → `[1, 2, 3]`
34. Виклик `(() => { let calls = 0; const it = lazyFilter(lazyMap([1, 2, 3, 4], x => (calls++, x * 2)), x => x > 2); const first = it.next().value; return [first, calls]; })()` → `[4, 2]`
35. Виклик `[...groupConsecutive([1, 1, 2, 2, 2, 3, 1])]` → `[[1, 1], [2, 2, 2], [3], [1]]`
36. Виклик `[...windowed([1, 2, 3, 4], 2)]` → `[[1, 2], [2, 3], [3, 4]]`
