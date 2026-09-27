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
