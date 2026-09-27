# Array — впорядкована колекція значень за індексом

## 1. Що таке Array

`Array` — це спеціалізований об'єкт (насправді все ще `object`, `Array.prototype` успадковує від `Object.prototype`) для зберігання впорядкованого списку значень будь-якого типу, доступних за числовим індексом (з 0). Має службову властивість `length`, яка автоматично оновлюється при додаванні/видаленні елементів.

```js
const simpleArr = [1, "two", true, { id: 3 }, [4, 5]];
console.log(simpleArr.length); // 5
console.log(typeof simpleArr); // "object" — масив теж об'єкт
console.log(Array.isArray(simpleArr)); // true — надійний спосіб перевірити "чи це масив"
```

## 2. Створення масивів

```js
// а) array literal — найпоширеніший спосіб
const literalArr = [1, 2, 3];

// б) new Array() — рідко використовують, є пастка з одним числовим аргументом
const arrFromNew = new Array(1, 2, 3); // [1, 2, 3] — кілька аргументів = елементи
const arrWithLength = new Array(5); // [empty × 5] — один числовий аргумент = довжина, не елемент!
console.log(arrWithLength.length); // 5, але масив порожній (усі "дірки")

// в) Array.of() — уникає пастки new Array(n): завжди створює масив із переданих значень
console.log(Array.of(5)); // [5] — а не масив довжиною 5
console.log(Array.of(1, 2, 3)); // [1, 2, 3]

// г) Array.from() — створює масив з iterable або array-like об'єкта
console.log(Array.from("abc")); // ["a", "b", "c"] — рядок iterable
console.log(Array.from(new Set([1, 2, 2]))); // [1, 2] — з будь-якого iterable
console.log(Array.from({ length: 3 }, (_, i) => i * 2)); // [0, 2, 4] — з array-like + мапер
console.log(Array.from({ length: 5 }, (_, i) => i)); // [0, 1, 2, 3, 4] — швидкий спосіб діапазону

// д) Array(n).fill(value) — типовий патерн заповнення "порожнього" масиву
const filledFromNew = new Array(3).fill(0);
console.log(filledFromNew); // [0, 0, 0]
```

## 3. Мутуючі методи (змінюють оригінальний масив)

```js
// push(...items) — додає елемент(и) в кінець, повертає нову length
const pushArr = [1, 2];
const newLength = pushArr.push(3, 4);
console.log(pushArr, newLength); // [1, 2, 3, 4] 4

// pop() — видаляє й повертає останній елемент
const popArr = [1, 2, 3];
const popped = popArr.pop();
console.log(popArr, popped); // [1, 2] 3
console.log([].pop()); // undefined — на порожньому масиві не кидає помилку

// unshift(...items) — додає елемент(и) на початок, повертає нову length
const unshiftArr = [3, 4];
unshiftArr.unshift(1, 2);
console.log(unshiftArr); // [1, 2, 3, 4]
// push/pop працюють з кінцем масиву — O(1), швидко.
// unshift/shift працюють з початком — O(n), бо всі елементи
// зсуваються на нову позицію. На великих масивах це помітно повільніше.

// shift() — видаляє й повертає перший елемент
const shiftArr = [1, 2, 3];
const shifted = shiftArr.shift();
console.log(shiftArr, shifted); // [2, 3] 1
```

`splice(start, deleteCount, ...items)` — універсальний «хірург» масиву: видаляє/вставляє/замінює елементи прямо в оригіналі, повертає масив видалених елементів.

```js
const spliceArr = [1, 2, 3, 4, 5];

// видалення 2 елементів починаючи з індексу 1:
const removed = spliceArr.splice(1, 2);
console.log(spliceArr, removed); // [1, 4, 5] [2, 3]

// вставка без видалення (deleteCount = 0):
const spliceArr2 = [1, 2, 5];
spliceArr2.splice(2, 0, 3, 4);
console.log(spliceArr2); // [1, 2, 3, 4, 5]

// заміна елементів (видалити й одразу вставити нові):
const spliceArr3 = [1, 2, 3];
spliceArr3.splice(1, 1, "two", "two and a half");
console.log(spliceArr3); // [1, "two", "two and a half", 3]

// негативний start — рахує з кінця масиву:
const spliceArr4 = [1, 2, 3, 4, 5];
spliceArr4.splice(-2, 1);
console.log(spliceArr4); // [1, 2, 3, 5] — видалено передостанній елемент
```

`sort(compareFn)` сортує масив на місці, повертає той самий масив. Без `compareFn` сортує елементи як рядки (лексикографічно!) — класична пастка.

```js
const numbersDefaultSort = [10, 1, 21, 2];
console.log(numbersDefaultSort.sort()); // [1, 10, 2, 21] — "10" < "2" як рядки!

// правильне числове сортування — через компаратор:
console.log([10, 1, 21, 2].sort((a, b) => a - b)); // [1, 2, 10, 21] — за зростанням
console.log([10, 1, 21, 2].sort((a, b) => b - a)); // [21, 10, 2, 1] — за спаданням

// сортування рядків з урахуванням локалі (правильна кирилиця/діакритика):
console.log(["cherry", "apple", "banana"].sort((a, b) => a.localeCompare(b)));
// ["apple", "banana", "cherry"]
```

```js
// reverse() — розвертає масив на місці, повертає той самий масив
const reverseArr = [1, 2, 3];
reverseArr.reverse();
console.log(reverseArr); // [3, 2, 1]

// fill(value, start, end) — заповнює масив значенням "на місці"
const fillArr = [1, 2, 3, 4, 5];
fillArr.fill(0, 1, 3); // заповнити 0 з індексу 1 до (не включно) 3
console.log(fillArr); // [1, 0, 0, 4, 5]
console.log(new Array(3).fill("x")); // ["x", "x", "x"] — типове застосування

// copyWithin(target, start, end) — копіює частину масиву в інше місце того ж масиву
const copyWithinArr = [1, 2, 3, 4, 5];
copyWithinArr.copyWithin(0, 3); // скопіювати з індексу 3 до кінця, вставити з індексу 0
console.log(copyWithinArr); // [4, 5, 3, 4, 5] — рідко використовується на практиці
```

## 4. Немутуючі методи (повертають новий масив/значення, оригінал не чіпають)

```js
// concat(...arraysOrValues) — об'єднує масиви в новий масив
const concatArr1 = [1, 2];
const concatArr2 = [3, 4];
const concatenated = concatArr1.concat(concatArr2, [5, 6], 7);
console.log(concatenated); // [1, 2, 3, 4, 5, 6, 7]
console.log(concatArr1); // [1, 2] — оригінал не змінився

// сучасна альтернатива — spread:
console.log([...concatArr1, ...concatArr2]); // [1, 2, 3, 4]
```

```js
// slice(start, end) — вирізає частину масиву в новий масив
const sliceArr = [1, 2, 3, 4, 5];
console.log(sliceArr.slice(1, 3)); // [2, 3] — end не включається
console.log(sliceArr.slice(-2)); // [4, 5] — негативний індекс: з кінця
console.log(sliceArr.slice()); // [1, 2, 3, 4, 5] — популярний спосіб скопіювати масив
console.log(sliceArr); // [1, 2, 3, 4, 5] — оригінал не змінився
```

Головне мнемонічне правило: `slice()` — «зрізати копію» (не мутує), `splice()` — «хірургічно втрутитись» (мутує оригінал).

```js
// join(separator) — перетворює масив на рядок
console.log([1, 2, 3].join()); // "1,2,3" — за замовчуванням через кому
console.log([1, 2, 3].join(" - ")); // "1 - 2 - 3"
console.log([1, 2, 3].join("")); // "123"

// flat(depth) — "розплющує" вкладені масиви в новий масив
const nestedArr = [1, [2, 3], [4, [5, 6]]];
console.log(nestedArr.flat()); // [1, 2, 3, 4, [5, 6]] — depth за замовчуванням = 1
console.log(nestedArr.flat(2)); // [1, 2, 3, 4, 5, 6] — глибина 2
console.log(nestedArr.flat(Infinity)); // повністю "сплющити", незалежно від глибини
console.log([1, [2, [3, [4]]]].flat(Infinity)); // [1, 2, 3, 4]

// flatMap(callback) — map() + flat(1) за один прохід (ефективніше окремих викликів)
const sentences = ["hello world", "how are you"];
console.log(sentences.map((s) => s.split(" "))); // [["hello","world"], ["how","are","you"]]
console.log(sentences.flatMap((s) => s.split(" "))); // ["hello", "world", "how", "are", "you"]
```

`toSorted()` / `toReversed()` / `toSpliced()` / `with()` (ES2023) — немутуючі версії. Сучасна альтернатива `sort()`/`reverse()`/`splice()`, яка не змінює оригінальний масив, а повертає новий — вирішує класичну проблему «випадково мутував масив, на який ще є посилання деінде».

```js
const originalForToMethods = [3, 1, 2];
const sortedCopy = originalForToMethods.toSorted((a, b) => a - b);
console.log(sortedCopy); // [1, 2, 3]
console.log(originalForToMethods); // [3, 1, 2] — оригінал не змінився!

console.log(originalForToMethods.toReversed()); // [2, 1, 3]
console.log(originalForToMethods.toSpliced(1, 1, "X")); // [3, "X", 2]
console.log(originalForToMethods.with(0, 100)); // [100, 1, 2] — замінити елемент за індексом
```

## 5. Методи пошуку та перевірки

```js
// indexOf(value) / lastIndexOf(value) — пошук за значенням (===)
const indexOfArr = [10, 20, 30, 20];
console.log(indexOfArr.indexOf(20)); // 1 — перше входження
console.log(indexOfArr.lastIndexOf(20)); // 3 — останнє входження
console.log(indexOfArr.indexOf(999)); // -1 — не знайдено

// indexOf() використовує сувору рівність (===) — NaN ніколи не знайдеться:
console.log([NaN].indexOf(NaN)); // -1 — пастка, бо NaN !== NaN

// includes(value) — чи містить масив значення (повертає boolean)
console.log([1, 2, 3].includes(2)); // true
console.log([1, 2, 3].includes(99)); // false

// на відміну від indexOf(), includes() коректно знаходить NaN
// (використовує SameValueZero, як і Set/Map):
console.log([NaN].includes(NaN)); // true — тут пастки немає

// find(callback) / findLast(callback) — перший/останній елемент за умовою
const users = [
  { id: 1, active: false },
  { id: 2, active: true },
  { id: 3, active: true },
];
console.log(users.find((u) => u.active)); // { id: 2, active: true } — перший активний
console.log(users.findLast((u) => u.active)); // { id: 3, active: true } — останній активний
console.log(users.find((u) => u.id === 999)); // undefined — якщо нічого не знайдено

// findIndex(callback) / findLastIndex(callback) — перший/останній індекс за умовою
console.log(users.findIndex((u) => u.active)); // 1
console.log(users.findLastIndex((u) => u.active)); // 2
console.log(users.findIndex((u) => u.id === 999)); // -1

// some(callback) — чи хоча б один елемент задовольняє умову
console.log(users.some((u) => u.active)); // true — достатньо одного
console.log([1, 2, 3].some((n) => n > 10)); // false

// every(callback) — чи всі елементи задовольняють умову
console.log(users.every((u) => u.active)); // false — не всі активні
console.log([2, 4, 6].every((n) => n % 2 === 0)); // true — усі парні

// some()/every() на порожньому масиві:
console.log([].some(() => true)); // false — немає жодного, що задовольняє
console.log([].every(() => false)); // true — "усі" тривіально істинно (vacuous truth)
```

## 6. Методи ітерації та трансформації

```js
// forEach(callback) — виконує callback для кожного елемента, нічого не повертає
[1, 2, 3].forEach((item, index, array) => {
  console.log(`${index}: ${item} of ${array.length}`);
});
// forEach() завжди повертає undefined і не переривається через break/return
// (для дострокового виходу треба звичайний for/for...of)

// map(callback) — перетворює кожен елемент, повертає новий масив тієї ж довжини
console.log([1, 2, 3].map((n) => n * 2)); // [2, 4, 6]
console.log(users.map((u) => u.id)); // [1, 2, 3]

// filter(callback) — залишає лише елементи, що задовольняють умову
console.log([1, 2, 3, 4, 5].filter((n) => n % 2 === 0)); // [2, 4]
console.log(users.filter((u) => u.active)); // масив із двох активних користувачів
```

`reduce(callback, initialValue)` — «згортає» масив в одне значення. Сигнатура колбека: `(accumulator, currentItem, index, array)`.

```js
console.log([1, 2, 3, 4].reduce((sum, n) => sum + n, 0)); // 10 — сума
console.log([1, 2, 3, 4].reduce((max, n) => Math.max(max, n))); // 4 — без initialValue
// без initialValue: acc починається з першого елемента, ітерація йде з другого.
// на порожньому масиві без initialValue — TypeError: Reduce of empty array with no initial value

// типове застосування — групування (те, що робить Object.groupBy):
const wordsToCount = ["a", "b", "a", "c", "b", "a"];
const counts = wordsToCount.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
console.log(counts); // { a: 3, b: 2, c: 1 }

// reduceRight(callback, initialValue) — те саме, що reduce(), але справа наліво
console.log(["a", "b", "c"].reduce((acc, s) => acc + s)); // "abc"
console.log(["a", "b", "c"].reduceRight((acc, s) => acc + s)); // "cba"
```

```js
// at(index) — доступ за індексом, підтримує негативні індекси (ES2022)
const atArr = [10, 20, 30];
console.log(atArr.at(0)); // 10
console.log(atArr.at(-1)); // 30 — останній елемент, без arr[arr.length - 1]
console.log(atArr[-1]); // undefined — звичайний доступ через [] так не вміє

// keys() / values() / entries() — ітератори (як і в Map)
for (const index of [10, 20, 30].keys()) {
  console.log("index:", index); // 0, 1, 2
}
for (const value of [10, 20, 30].values()) {
  console.log("value:", value); // 10, 20, 30
}
for (const [index, value] of [10, 20, 30].entries()) {
  console.log(index, "->", value); // 0 -> 10, 1 -> 20, 2 -> 30
}
```

## 7. Статичні методи Array

`typeof` для масиву повертає `"object"` — тому для перевірки завжди використовують саме `Array.isArray()`, а не `typeof`.

```js
console.log(Array.isArray([1, 2, 3])); // true
console.log(Array.isArray({})); // false
console.log(typeof [1, 2, 3]); // "object" — тому typeof тут марний
```

`Array.from()` і `Array.of()` — див. розділ 2 вище.

## 8. Пастки та важливі нюанси

Масив — це reference type (як і об'єкт):

```js
const originalReference = [1, 2, 3];
const notACopy = originalReference; // це те саме посилання, не копія!
notACopy.push(4);
console.log(originalReference); // [1, 2, 3, 4] — теж змінився

// для копіювання — spread, slice() або структурне клонування:
const properCopy = [...originalReference];
const alsoProperCopy = originalReference.slice();
const deepCopy = structuredClone(originalReference); // глибока копія, включно з вкладеними об'єктами
```

«Дірки» в масиві (sparse arrays):

```js
const sparseArr = [1, , 3]; // пропущений елемент — це "дірка", а не undefined
console.log(sparseArr.length); // 3
console.log(sparseArr[1]); // undefined
// forEach/map/filter пропускають дірки (не викликають callback для них):
sparseArr.forEach((item) => console.log("forEach sees:", item)); // лише 1 і 3, не index 1
console.log(sparseArr.map((n) => n * 2)); // [2, empty, 6] — дірка залишається діркою
```

Чому `length` можна «змінити вручну» (і навіщо це знати):

```js
const truncatableArr = [1, 2, 3, 4, 5];
truncatableArr.length = 2; // обрізає масив!
console.log(truncatableArr); // [1, 2]

truncatableArr.length = 5; // "розширює" масив дірками
console.log(truncatableArr); // [1, 2, <3 empty items>]
```

## 9. Мутуючі vs немутуючі — повна шпаргалка

| Дія | Мутує оригінал | Не мутує (повертає новий/значення) |
|---|---|---|
| додати в кінець | `push()` | `concat()`, `[...arr, item]` |
| видалити з кінця | `pop()` | `slice(0, -1)` |
| додати на початок | `unshift()` | `[item, ...arr]` |
| видалити з початку | `shift()` | `slice(1)` |
| видалити/вставити | `splice()` | `toSpliced()` |
| сортувати | `sort()` | `toSorted()` |
| розвернути | `reverse()` | `toReversed()` |
| замінити за індексом | `arr[i] = value` | `with(i, value)` |
| заповнити значенням | `fill()` | `Array(n).fill()` на новому масиві |

## Підсумок

- `Array` — впорядкована колекція значень за числовим індексом, технічно теж об'єкт (`Array.prototype` ← `Object.prototype`).
- Створення: `[]`, `new Array()`, `Array.of()`, `Array.from()` (з iterable/array-like).
- Мутуючі методи (змінюють оригінал): `push`/`pop`/`shift`/`unshift`/`splice`/`sort`/`reverse`/`fill`/`copyWithin`.
- Немутуючі методи (повертають новий масив): `concat`/`slice`/`flat`/`flatMap`/`toSorted`/`toReversed`/`toSpliced`/`with`.
- Пошук: `indexOf`/`lastIndexOf` (`===`, ламається на `NaN`), `includes` (SameValueZero, коректно з `NaN`), `find`/`findLast`/`findIndex`/`findLastIndex`.
- Перевірка: `some` (хоч один), `every` (усі).
- Ітерація/трансформація: `forEach`, `map`, `filter`, `reduce`/`reduceRight`, `at` (негативні індекси), `keys`/`values`/`entries`.
- `Array.isArray()` — єдиний надійний спосіб перевірити тип масиву.
- Масив — reference type: просте присвоєння не копіює, потрібен `spread`/`slice()`/`structuredClone()`.
- Є «дірки» (sparse arrays) — `forEach`/`map` їх пропускають.
- При виборі методу — думай «мутує чи ні»: сучасний код частіше тяжіє до немутуючих версій (`toSorted`, `toReversed` тощо).
