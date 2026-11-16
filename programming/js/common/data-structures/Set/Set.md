# Set — колекція унікальних значень (ES6)

## 1. Що таке Set

`Set` — це вбудована структура даних для зберігання колекції унікальних значень (без ключів, на відміну від `Map`). Значенням може бути будь-який тип — примітиви, об'єкти, функції, масиви. Дублікати автоматично ігноруються — кожне значення в `Set` існує максимум один раз. Порядок елементів — insertion order.

```js
const simpleSet = new Set();
simpleSet.add(1);
simpleSet.add(2);
simpleSet.add(2); // дублікат — ігнорується, у колекції все одно одна "2"
simpleSet.add("text");

console.log(simpleSet); // Set(3) { 1, 2, 'text' }
console.log(simpleSet.size); // 3 — а не 4
```

## 2. Створення Set

```js
// а) порожній Set
const emptySet = new Set();

// б) Set одразу з даними — конструктор приймає будь-який iterable
const filledSet = new Set([1, 2, 3, 2, 1]);
console.log(filledSet); // Set(3) { 1, 2, 3 } — дублікати відкинуто одразу

// в) з рядка (рядок — iterable по символах)
const charsSet = new Set("aabbcc");
console.log(charsSet); // Set(3) { 'a', 'b', 'c' }

// г) з іншого Set (копіювання — shallow copy)
const copiedSet = new Set(filledSet);
console.log(copiedSet === filledSet); // false — новий, незалежний Set

// д) найпоширеніше застосування: видалення дублікатів з масиву
const numbersWithDuplicates = [1, 2, 2, 3, 3, 3, 4];
const uniqueNumbers = [...new Set(numbersWithDuplicates)];
console.log(uniqueNumbers); // [1, 2, 3, 4]
// масив → Set (дублікати зникають) → назад у масив через spread
```

## 3. set.add(value) — додавання елемента

```js
const userTagsSet = new Set();
userTagsSet.add("js");
userTagsSet.add("frontend");
userTagsSet.add("js"); // дублікат — ігнорується
console.log(userTagsSet); // Set(2) { 'js', 'frontend' }

// add() повертає сам Set — тому виклики можна ланцюжком (chaining):
const chainedSet = new Set().add(1).add(2).add(3);
console.log(chainedSet); // Set(3) { 1, 2, 3 }
```

## 4. set.has(value) — перевірка наявності значення

```js
console.log(userTagsSet.has("js")); // true
console.log(userTagsSet.has("backend")); // false

// set.has() за швидкістю — O(1), на відміну від array.includes(),
// який має складність O(n) (лінійний перебір масиву):
const bigArray = Array.from({ length: 100000 }, (_, i) => i);
const bigSet = new Set(bigArray);
console.log(bigArray.includes(99999)); // теж true, але повільніше на великих масивах
console.log(bigSet.has(99999)); // швидше — O(1) пошук
```

## 5. set.delete(value) — видалення елемента

```js
const deletableSet = new Set([1, 2, 3]);
console.log(deletableSet.delete(2)); // true — видалення відбулось
console.log(deletableSet.delete(99)); // false — такого значення не було
console.log(deletableSet); // Set(2) { 1, 3 }
// delete() повертає boolean (успіх/неуспіх), так само, як і в Map
```

## 6. set.clear() — очищення всієї колекції

```js
const clearableSet = new Set([1, 2, 3]);
clearableSet.clear();
console.log(clearableSet); // Set(0) {}
console.log(clearableSet.size); // 0
```

## 7. set.size — кількість елементів

`size` — це геттер (властивість), а не метод — викликається без дужок (так само, як і в `Map`). У масиву аналогічну роль виконує `.length`.

```js
console.log(userTagsSet.size); // 2
```

## 8. Рівність значень у Set: SameValueZero

`Set` визначає «унікальність» за тим самим алгоритмом SameValueZero, що й `Map` для ключів: він схожий на `===`, але з двома винятками.

```js
// Виняток №1: NaN вважається рівним NaN (на відміну від ===)
const setWithNaN = new Set([NaN, NaN, NaN]);
console.log(setWithNaN.size); // 1 — усі три NaN злилися в один елемент
console.log(NaN === NaN); // false — а от === так не вважає

// Виняток №2: +0 і -0 вважаються однаковими (як і === до речі)
const setWithZero = new Set([0, -0]);
console.log(setWithZero.size); // 1 — +0 і -0 це "одне й те саме" значення в Set

// але: об'єкти порівнюються за посиланням, а не за вмістом —
// два "однакових на вигляд" об'єкти вважаються різними значеннями:
const objSet = new Set();
objSet.add({ id: 1 });
objSet.add({ id: 1 }); // це інший об'єкт у пам'яті — не дублікат!
console.log(objSet.size); // 2 — обидва об'єкти залишились
```

## 9. Ітерація: set.keys() / set.values() / set.entries()

```js
const iterableSet = new Set(["apple", "banana", "cherry"]);

// set.values() — ітератор по значеннях (основний, "природний" спосіб)
for (const value of iterableSet.values()) {
  console.log("value:", value);
}

// set.keys() — існує для сумісності з Map, але поводиться ідентично values()
// (у Set немає окремих "ключів" — значення саме й виступає своїм ключем)
console.log([...iterableSet.keys()]); // ["apple", "banana", "cherry"]
console.log([...iterableSet.values()]); // той самий результат

// set.entries() — теж для сумісності з Map: повертає пари [value, value]
// (значення продубльоване як "ключ" і як "значення")
console.log([...iterableSet.entries()]);
// [["apple","apple"], ["banana","banana"], ["cherry","cherry"]]
```

## 10. Set є iterable напряму — for...of без .values()

`Set` реалізує `Symbol.iterator` так, що ітерація за замовчуванням — це те саме, що й `set.values()`. Тому `for...of` і spread працюють прямо по самому `Set`:

```js
for (const value of iterableSet) {
  console.log("direct iteration:", value);
}
console.log([...iterableSet]); // ["apple", "banana", "cherry"] — масив значень
```

## 11. set.forEach(callback) — перебір із колбеком

Сигнатура колбека — `(value, valueAgain, set)`, заради узгодженості з `Array.prototype.forEach()` і `Map.prototype.forEach()` (де другий аргумент — «ключ»). У `Set` другий аргумент дублює перший, оскільки власного ключа в `Set` немає.

```js
iterableSet.forEach((value, valueAgain, setRef) => {
  console.log(value === valueAgain, value); // true, "apple" / "banana" / "cherry"
});

// forEach() не переривається через break/return — для дострокового
// виходу використовуй звичайний for...of:
for (const value of iterableSet) {
  if (value === "banana") break; // так можна, forEach так не можна
}
```

## 12. Set не має індексів і доступу за позицією

На відміну від масиву, у `Set` немає `set[0]` чи `set.at(0)` — щоб отримати елемент за позицією, доводиться перетворювати на масив (або йти через ітератор вручну).

```js
const positionalSet = new Set(["a", "b", "c"]);
// console.log(positionalSet[0]); // undefined — так не працює
console.log([...positionalSet][0]); // "a" — через масив
console.log(Array.from(positionalSet)[1]); // "b"
console.log(positionalSet.values().next().value); // "a" — через сирий ітератор
```

## 13. Найчастіші застосування Set

```js
// а) видалення дублікатів з масиву (найпопулярніше застосування):
console.log([...new Set([1, 1, 2, 2, 3])]); // [1, 2, 3]

// б) швидка перевірка належності (O(1) замість O(n) в масиві):
const allowedRoles = new Set(["admin", "editor", "viewer"]);
function canEdit(role) {
  return allowedRoles.has(role);
}
console.log(canEdit("editor")); // true
console.log(canEdit("guest")); // false

// в) підрахунок кількості унікальних елементів:
function countUnique(array) {
  return new Set(array).size;
}
console.log(countUnique(["a", "b", "a", "c", "b"])); // 3

// г) відстеження вже "оброблених" значень (наприклад, видалених ID):
const processedIds = new Set();
function processItem(id) {
  if (processedIds.has(id)) {
    console.log(`ID ${id} already processed, skipping`);
    return;
  }
  processedIds.add(id);
  console.log(`processing ID ${id}`);
}
processItem(1);
processItem(2);
processItem(1); // "ID 1 already processed, skipping"
```

## 14. Теоретико-множинні операції (union, intersection, difference)

У сучасних рушіях (ES2025) у `Set.prototype` з'явились вбудовані методи для класичних операцій над множинами:

```js
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);

console.log(setA.union(setB)); // Set { 1,2,3,4,5,6 } — об'єднання
console.log(setA.intersection(setB)); // Set { 3,4 } — перетин
console.log(setA.difference(setB)); // Set { 1,2 } — елементи лише в setA
console.log(setA.symmetricDifference(setB)); // Set { 1,2,5,6 } — елементи, що не спільні
console.log(setA.isSubsetOf(new Set([1, 2, 3, 4, 5]))); // true — setA повністю в цій множині
console.log(setA.isSupersetOf(new Set([1, 2]))); // true — setA містить [1,2] повністю
console.log(setA.isDisjointFrom(new Set([9, 10]))); // true — немає спільних елементів

// якщо цих методів ще немає (старіший рушій) — реалізують вручну:
function unionManual(setX, setY) {
  return new Set([...setX, ...setY]);
}
function intersectionManual(setX, setY) {
  return new Set([...setX].filter((item) => setY.has(item)));
}
function differenceManual(setX, setY) {
  return new Set([...setX].filter((item) => !setY.has(item)));
}
console.log(unionManual(setA, setB)); // Set { 1,2,3,4,5,6 }
console.log(intersectionManual(setA, setB)); // Set { 3,4 }
console.log(differenceManual(setA, setB)); // Set { 1,2 }
```

## 15. Set vs Array — коли що обирати

| Критерій | Set | Array |
|---|---|---|
| Унікальність значень | гарантована автоматично | треба стежити вручну |
| Пошук елемента (`has`/`includes`) | O(1) | O(n) |
| Доступ за індексом | немає | так, `arr[i]` |
| Порядок елементів | insertion order | порядок індексів |
| Дублікати | неможливі | можливі |
| `map()`/`filter()`/`reduce()` | немає власних — треба `[...set]` | так, з коробки |
| Розмір колекції | `set.size` (властивість) | `arr.length` (властивість) |

Якщо потрібні дублікати, індекси або масивні методи (`map`/`filter`/`reduce`) — обирай `Array`. Якщо потрібна гарантована унікальність і швидкий пошук — обирай `Set`.

## 16. Конвертація Set ↔ масив

```js
const setToConvert = new Set([1, 2, 3]);

// Set → масив (два еквівалентні способи):
const asArraySpread = [...setToConvert];
const asArrayFrom = Array.from(setToConvert);

// масив → Set:
const backToSet = new Set(asArraySpread);

// оскільки Set сам по собі не має map/filter/reduce, для трансформації
// його спершу перетворюють у масив, а потім — за потреби — назад у Set:
const doubledUnique = new Set([...setToConvert].map((n) => n * 2));
console.log(doubledUnique); // Set { 2, 4, 6 }
```

## 17. WeakSet — коротко, для контрасту з Set

`WeakSet` — «родич» `Set` з тими самими обмеженнями, що й у `WeakMap` відносно `Map`:

1. зберігати можна лише об'єкти (не примітиви — не можна додати число, рядок чи boolean);
2. посилання на об'єкти «слабкі» (weak reference) — якщо на об'єкт більше ніде немає посилань, збирач сміття може видалити і сам об'єкт, і відповідний запис у `WeakSet`;
3. `WeakSet` не ітерований — немає `values()`/`keys()`/`entries()`/`forEach()`/`size`, з тих самих причин, що й у `WeakMap`.

```js
const weakSetDemo = new WeakSet();
let trackedObject = { name: "temporary object" };
weakSetDemo.add(trackedObject);
console.log(weakSetDemo.has(trackedObject)); // true

// weakSetDemo.add("string"); // TypeError: Invalid value used in weak set
```

Типове застосування `WeakSet` — позначення об'єктів як «уже оброблених» чи «видимих користувачу» без ризику витоку пам'яті — коли `trackedObject` стане недосяжним, збирач сміття звільнить пам'ять і від нього, і від запису в `WeakSet` автоматично. Детально — [WeakSet.md](../WeakSet/WeakSet.md).

## 18. Як Set працює під капотом

`Set` — це **хеш-таблиця**, яка зберігає лише ключі, і при цьому **запам'ятовує порядок вставки**. У V8 це «впорядкована хеш-таблиця» (ordered hash table): масив записів у порядку додавання плюс хеш-індекс для швидкого пошуку.

```
add(x):  хеш(x) → знайти слот → є? ігноруємо (дублікат)
                              → немає? дописати в кінець масиву записів
has(x):  хеш(x) → перевірити запис                      → O(1) у середньому
delete(x): позначити запис видаленим (порядок інших не змінюється)
```

Звідси:

- `add`, `has`, `delete` — **O(1)** у середньому; `size` — O(1);
- обхід — **O(n)** у порядку вставки;
- значення порівнюються за **SameValueZero** (розділ 8), хеш для об'єкта — за посиланням.

## 19. Порядок елементів: нюанси

- **Повторне додавання існуючого значення не змінює його позиції.**
- **Видалили й додали знову — значення опиняється в кінці.**

```js
const s = new Set(["a", "b", "c"]);
s.add("a");          // позиція не змінилась: a, b, c
s.delete("a");
s.add("a");          // тепер у кінці: b, c, a
[...s];              // ["b", "c", "a"]
```

Перевірено запуском. Це важливо, якщо ти використовуєш `Set` як чергу «давності використання» (LRU): щоб «освіжити» елемент — видали й додай знову.

## 20. Зміна `Set` під час ітерації

Ітерація по `Set` — «жива»: вона бачить зміни, зроблені під час обходу.

- елемент, **доданий** під час обходу, **буде відвіданий** (бо потрапляє в кінець);
- елемент, **видалений** до того, як до нього дійшла ітерація, **не буде відвіданий**.

```js
const s = new Set([1, 2, 3]);
const seen = [];
for (const x of s) {
  seen.push(x);
  if (x === 1) s.add(4);     // додали — буде відвіданий
  if (x === 2) s.delete(3);  // видалили — пропущений
}
// seen: [1, 2, 4]
```

Небезпека: додавати в кожній ітерації нове значення означає **нескінченний цикл**. Якщо логіка складна — спершу зроби копію: `for (const x of [...s]) …`.

Ітератор `set.values()` — **одноразовий**: після вичерпання він порожній.

## 21. Нюанси методів множин (ES2025)

Нові методи `union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`:

- вони **не мутують** жодну з множин — повертають **новий** `Set` (або `boolean` для `is…`);
- аргумент не обов'язково `Set`: це може бути **будь-який «set-подібний» об'єкт** — той, що має `size`, `has()` і `keys()`. Підходить, наприклад, `Map` (перевірено: `new Set([1, 2]).union(new Map([[3, "x"]]))` → `{1, 2, 3}`);
- **порядок результату:** `union` — спершу елементи першої множини, потім нові з другої; для `intersection` рушій ітерує **меншу** множину, тому порядок залежить від розмірів (перевірено: `{1,2,3,4}.intersection({4,3,5})` → `{4, 3}`). Якщо порядок важливий, не покладайся на нього.
- В Node.js 22+ та сучасних браузерах уже доступні; для старих середовищ — ручні версії (розділ 14).

## 22. Типові патерни, яких бракувало

**Унікальні об'єкти за ключем.** `Set` порівнює об'єкти за посиланням, тому для дедуплікації записів за `id` використовують `Map` (останній запис з однаковим id перемагає):

```js
const users = [{ id: 1, n: "a" }, { id: 2, n: "b" }, { id: 1, n: "c" }];
const unique = [...new Map(users.map((u) => [u.id, u])).values()];
// [{ id: 1, n: "c" }, { id: 2, n: "b" }]
```

**Відстеження відвіданих вершин у графі/обході** — `seen = new Set()`; перед обробкою `if (seen.has(x)) continue; seen.add(x);`.

**Перетин списків (унікальні спільні елементи):** `[...new Set(a)].filter(x => setB.has(x))` — O(n + m).

**Сортування унікальних:** `[...new Set(arr)].sort((x, y) => x - y)` (у `Set` власного `sort` немає).

**Копія з гарантією унікальності при вводі користувача** (теги, права доступу) — зберігай `Set`, у JSON віддавай масив.

## 23. Серіалізація та порівняння

- `JSON.stringify(new Set([1, 2]))` дає `"{}"` — `Set` не серіалізується. Перетворюй: `JSON.stringify([...set])`.
- `new Set([[1], [1]]).size` дорівнює **2**: масиви й об'єкти порівнюються за посиланням. «Унікальність за вмістом» потребує власного ключа (наприклад, `JSON.stringify(item)` або `id`).
- Два `Set` не порівнюються через `===`; для перевірки рівності: `a.size === b.size && a.isSubsetOf(b)`.
- `-0` у `Set` нормалізується до `+0`; `NaN` вважається однаковим із `NaN`.

## 24. Типові помилки

1. Додавати об'єкти й чекати дедуплікації за вмістом.
2. Індексувати `set[0]` (немає індексів).
3. Викликати `map`/`filter` прямо на `Set` (їх немає) — спершу `[...set]`.
4. Вважати `size` методом (це геттер: `set.size`, а не `set.size()`).
5. Додавати елементи під час обходу того ж `Set` без умови виходу — нескінченний цикл.
6. Очікувати стабільний порядок результату `intersection`.
7. `JSON.stringify(set)` без перетворення.
8. Використовувати `Set` для тисяч дрібних перевірок `has` у масиві з 10 елементів — тут `includes` простіший (різниці не відчуєш).
9. Забути, що `WeakSet` не ітерується й приймає лише об'єкти.

## 25. Алгоритм: коли брати Set

1. Потрібна **унікальність**? → `Set`.
2. Потрібен швидкий «чи є?» за O(1)? → `Set` (а не `includes` у циклі).
3. Унікальні об'єкти за ключем → `Map` за `id`.
4. Об'єднання/перетин/різниця → вбудовані методи або `filter + has`.
5. Потрібні індекси, `map/filter`, дублікати → `Array` (і `[...set]` для мостика).
6. Не змінюй `Set` під час обходу без потреби; сумніваєшся — ітеруй копію.
7. Об'єкти, що не повинні утримувати пам'ять → `WeakSet`.

## Підсумок

- `Set` — колекція унікальних значень будь-якого типу, без ключів.
- Зберігає порядок додавання (insertion order).
- `add()`/`has()`/`delete()`/`clear()` — базові операції; `add()` повертає сам `Set` (можна ланцюжком).
- `size` — властивість (геттер), а не метод.
- Унікальність визначається за SameValueZero (`NaN === NaN` тут `true`, `+0` і `-0` вважаються однаковими; об'єкти — за посиланням).
- `Set` ітерований напряму (`for...of`), еквівалентно `set.values()`.
- `keys()`/`entries()` існують лише для сумісності з `Map`-API і поводяться як `values()` (значення дублюється як «ключ»).
- Немає доступу за індексом — лише перетворення в масив дає це.
- Головні застосування: видалення дублікатів з масиву, швидка перевірка належності (O(1)), теоретико-множинні операції (`union`/`intersection`/`difference` — вбудовані з ES2025).
- Для `map`/`filter`/`reduce` потрібно спершу конвертувати в масив.
- `WeakSet` — лише об'єкти, слабкі посилання, не ітерований, для позначення об'єктів без ризику витоку пам'яті.
- Під капотом — впорядкована хеш-таблиця: `add/has/delete` за O(1), порядок вставки зберігається.
- Повторний `add` позицію не змінює; `delete` + `add` переносить значення в кінець.
- Ітерація «жива»: додані під час обходу елементи відвідуються, видалені — пропускаються.
- Методи множин (ES2025) не мутують, приймають set-подібні аргументи (`size`, `has`, `keys`).
- Для унікальних об'єктів за `id` використовуй `Map`; `JSON.stringify(set)` потребує `[...set]`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Створення й основні методи

**1.** Скільки елементів у `Set` після створення з масиву з дублікатами?

```js
new Set([1, 2, 2, 3, 3, 3]).size
```

**2.** Що отримаємо, якщо розгорнути `Set` з рядка?

```js
[...new Set('hello')]
```

**3.** Що поверне `has` для наявного і відсутнього значення?

```js
(() => { const s = new Set([1, 2]); return [s.has(1), s.has(3)]; })()
```

**4.** Що повертає `add` і чи працює ланцюжок викликів?

```js
(() => { const s = new Set(); const r = s.add(1).add(2).add(1); return [r === s, s.size]; })()
```

**5.** Що повертає `delete` для існуючого і неіснуючого значення?

```js
(() => { const s = new Set([1]); return [s.delete(1), s.delete(1)]; })()
```

**6.** Яким буде `size` після `clear()` і що поверне `clear()`?

```js
(() => { const s = new Set([1, 2]); const r = s.clear(); return [s.size, r]; })()
```

**7.** Скільки елементів у `Set` із трьох `NaN`?

```js
new Set([NaN, NaN, NaN]).size
```

**8.** Скільки елементів у `new Set([0, -0])`?

```js
new Set([0, -0]).size
```

**9.** Скільки елементів у `Set`, якщо додати два об'єкти `{ id: 1 }`?

```js
(() => { const s = new Set(); s.add({ id: 1 }); s.add({ id: 1 }); return s.size; })()
```

**10.** Скільки елементів у `Set` з `'1'` і `1`?

```js
new Set(['1', 1]).size
```

**11.** Яким буде порядок елементів `Set`?

```js
[...new Set([3, 1, 2, 1, 3])]
```

**12.** Що поверне `new Set()` без аргументів, якщо перетворити на масив, і що дасть `new Set(null).size`?

```js
[[...new Set()], new Set(null).size]
```

### Рівень 2. Ітерація, порядок, конвертація

**13.** Чи збігаються `keys()` і `values()` у `Set`?

```js
(() => { const s = new Set(['a']); return [s.keys === s.values, [...s.keys()], [...s.values()]]; })()
```

**14.** Що поверне `[...set.entries()]`?

```js
[...new Set(['a', 'b']).entries()]
```

**15.** Які аргументи отримує колбек `forEach` у `Set`?

```js
(() => { const o = []; new Set(['a']).forEach((v, k, s) => o.push([v, k, s instanceof Set])); return o; })()
```

**16.** Чи є в `Set` доступ за індексом?

```js
new Set(['a', 'b'])[0]
```

**17.** Видаліть дублікати з масиву зі збереженням порядку.

```js
[...new Set([5, 3, 5, 1, 3])]
```

**18.** Чи видалить `Set` дублікати об'єктів із однаковим вмістом?

```js
[...new Set([{ a: 1 }, { a: 1 }])].length
```

**19.** Яким буде порядок після повторного `add` існуючого значення?

```js
(() => { const s = new Set(['a', 'b', 'c']); s.add('a'); return [...s]; })()
```

**20.** Яким буде порядок після `delete` і повторного `add`?

```js
(() => { const s = new Set(['a', 'b', 'c']); s.delete('a'); s.add('a'); return [...s]; })()
```

**21.** Які елементи відвідає цикл, якщо під час обходу додати `4` і видалити `3`?

```js
(() => { const s = new Set([1, 2, 3]); const seen = []; for (const x of s) { seen.push(x); if (x === 1) s.add(4); if (x === 2) s.delete(3); } return seen; })()
```

**22.** Чи можна обійти ітератор `set.values()` двічі?

```js
(() => { const it = new Set([1, 2]).values(); return [[...it], [...it]]; })()
```

**23.** Що поверне `next()` у ітератора `Set`?

```js
(() => { const it = new Set(['x']).values(); return [it.next(), it.next()]; })()
```

**24.** Перетворіть `Set` на масив трьома способами. Які результати?

```js
(() => { const s = new Set([1, 2]); return [[...s], Array.from(s), Array.from(s, x => x * 10)]; })()
```

**25.** Що дасть `Array.from(new Set('aabbc')).join('')`?

```js
Array.from(new Set('aabbc')).join('')
```

**26.** Що виведе `for...of` по `Set` без виклику `.values()`?

```js
(() => { const o = []; for (const x of new Set([1, 2])) o.push(x); return o; })()
```

### Рівень 3. Операції над множинами, WeakSet, серіалізація

**27.** Який `size` у `Set`, створеного від `Set`, і чи це копія?

```js
(() => { const a = new Set([1, 2]); const b = new Set(a); b.add(3); return [a.size, b.size]; })()
```

**28.** Що дасть `A.union(B)` для `A = {1,2,3,4}`, `B = {3,4,5,6}`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
A.union(B)
```

**29.** Що дасть `A.intersection(B)`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
A.intersection(B)
```

**30.** Що дасть `A.difference(B)`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
A.difference(B)
```

**31.** Що дасть `A.symmetricDifference(B)`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
A.symmetricDifference(B)
```

**32.** Що повернуть `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
[A.isSubsetOf(new Set([1, 2, 3, 4, 5])), A.isSupersetOf(new Set([1, 2])), A.isDisjointFrom(new Set([9, 10]))]
```

**33.** Чи змінюють методи множин вихідні `Set`?

```js
const A = new Set([1, 2, 3, 4]), B = new Set([3, 4, 5, 6]);
A.union(B); [A.size, B.size]
```

**34.** Що станеться, якщо передати масив у `union`?

```js
new Set([1]).union([2])
```

**35.** Чи підійде `Map` як аргумент `union`?

```js
new Set([1]).union(new Map([[2, 'x']]))
```

**36.** Що поверне `[...A.union(B)]` і чому спершу йдуть елементи `A`?

```js
(() => { const A = new Set([3, 1]), B = new Set([2, 1]); return [...A.union(B)]; })()
```

**37.** Напишіть `union(a, b)`, `intersection(a, b)` і `difference(a, b)` без вбудованих методів (через `filter` і `has`).

```js
const union = (a, b) => new Set([...a, ...b])
const intersection = (a, b) => new Set([...a].filter(x => b.has(x)))
const difference = (a, b) => new Set([...a].filter(x => !b.has(x)))
```

**38.** Що станеться при `new WeakSet().add(1)`?

```js
new WeakSet().add(1)
```

**39.** Чи має `WeakSet` властивість `size` і чи можна його перебрати?

```js
(() => { const w = new WeakSet(); return [w.size, typeof w[Symbol.iterator]]; })()
```

**40.** Що дасть `JSON.stringify(new Set([1, 2]))` і `JSON.stringify([...new Set([1, 2])])`?

```js
[JSON.stringify(new Set([1, 2])), JSON.stringify([...new Set([1, 2])])]
```

### Рівень 4. Практичні функції

**41.** Напишіть `uniqueBy(arr, key)` — унікальні об'єкти за полем із збереженням першого.

```js
function uniqueBy(arr, key) {
  const seen = new Set()
  return arr.filter(o => !seen.has(o[key]) && seen.add(o[key]))
}
```

**42.** Напишіть `countUnique(text)` — кількість унікальних слів без урахування регістру.

```js
const countUnique = text => new Set(text.toLowerCase().match(/\p{L}+/gu)).size
```

**43.** Напишіть `duplicates(arr)` — значення, що повторюються.

```js
function duplicates(arr) {
  const seen = new Set(), dup = new Set()
  for (const x of arr) (seen.has(x) ? dup : seen).add(x)
  return [...dup]
}
```

**44.** Напишіть `common(...arrays)` — елементи, що є в усіх масивах.

```js
const common = (first, ...rest) => [...new Set(first)].filter(x => rest.every(a => a.includes(x)))
```

**45.** Напишіть `hasDuplicates(arr)` без вкладених циклів.

```js
const hasDuplicates = arr => new Set(arr).size !== arr.length
```

**46.** Напишіть `sameSet(a, b)` — чи містять два `Set` однакові елементи.

```js
const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x))
```

**47.** Напишіть `touch(set, value)` для LRU-подібного списку: освіжити значення, переніс його в кінець.

```js
function touch(set, value) {
  set.delete(value)
  set.add(value)
}
```

**48.** Напишіть `hasPermission(user, required)` — чи є всі потрібні ролі, використовуючи `isSupersetOf`.

```js
const hasPermission = (user, required) => new Set(user).isSupersetOf(new Set(required))
```

**49.** Напишіть `uniqueChars(str)` — рядок без повторних символів зі збереженням порядку.

```js
const uniqueChars = str => [...new Set(str)].join('')
```

**50.** Напишіть `sortedSet(set)` — відсортований масив чисел із `Set`.

```js
const sortedSet = set => [...set].sort((a, b) => a - b)
```

### Відповіді

1. `3`
2. `['h', 'e', 'l', 'o']`
3. `[true, false]`
4. `[true, 2]`
5. `[true, false]`
6. `[0, undefined]`
7. `1`
8. `1`
9. `2`
10. `2`
11. `[3, 1, 2]`
12. `[[], 0]`
13. `[true, ['a'], ['a']]`
14. `[['a', 'a'], ['b', 'b']]`
15. `[['a', 'a', true]]`
16. `undefined`
17. `[5, 3, 1]`
18. `2`
19. `['a', 'b', 'c']`
20. `['b', 'c', 'a']`
21. `[1, 2, 4]`
22. `[[1, 2], []]`
23. `[{ value: 'x', done: false }, { value: undefined, done: true }]`
24. `[[1, 2], [1, 2], [10, 20]]`
25. `'abc'`
26. `[1, 2]`
27. `[2, 3]`
28. `Set(6) {1, 2, 3, 4, 5, 6}`
29. `Set(2) {3, 4}`
30. `Set(2) {1, 2}`
31. `Set(4) {1, 2, 5, 6}`
32. `[true, true, true]`
33. `[4, 4]`
34. `TypeError: The .size property is NaN`
35. `Set(2) {1, 2}`
36. `[3, 1, 2]`
37. Виклик `[union(new Set([1, 2]), new Set([2, 3])), intersection(new Set([1, 2]), new Set([2, 3])), difference(new Set([1, 2]), new Set([2, 3]))]` → `[Set(3) {1, 2, 3}, Set(1) {2}, Set(1) {1}]`
38. `TypeError: Invalid value used in weak set`
39. `[undefined, 'undefined']`
40. `['{}', '[1,2]']`
41. Виклик `uniqueBy([{ id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 1, v: 'c' }], 'id')` → `[{ id: 1, v: 'a' }, { id: 2, v: 'b' }]`
42. Виклик `countUnique('Cat cat DOG dog bird')` → `3`
43. Виклик `duplicates([1, 2, 3, 2, 4, 1, 1])` → `[2, 1]`
44. Виклик `common([1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 6])` → `[3, 4]`
45. Виклик `[hasDuplicates([1, 2, 3]), hasDuplicates([1, 2, 1])]` → `[false, true]`
46. Виклик `[sameSet(new Set([1, 2]), new Set([2, 1])), sameSet(new Set([1, 2]), new Set([1, 3]))]` → `[true, false]`
47. Виклик `(() => { const s = new Set(['a', 'b', 'c']); touch(s, 'a'); return [...s]; })()` → `['b', 'c', 'a']`
48. Виклик `[hasPermission(['admin', 'edit', 'view'], ['edit', 'view']), hasPermission(['view'], ['edit'])]` → `[true, false]`
49. Виклик `uniqueChars('mississippi')` → `'misp'`
50. Виклик `sortedSet(new Set([10, 2, 33, 1]))` → `[1, 2, 10, 33]`
