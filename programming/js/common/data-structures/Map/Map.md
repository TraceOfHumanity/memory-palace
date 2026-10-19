# Map — колекція ключ-значення з будь-яким типом ключа (ES6)

## 1. Що таке Map і чим він відрізняється від звичайного об'єкта

`Map` — це вбудована структура даних для зберігання пар ключ-значення, де ключем може бути значення будь-якого типу (не лише рядок чи symbol, як у звичайного об'єкта) — число, boolean, об'єкт, функція, масив, навіть `NaN`. Пари зберігають порядок додавання (insertion order).

```js
const simpleMap = new Map();
simpleMap.set("string key", 1);
simpleMap.set(42, "numeric key");
simpleMap.set(true, "boolean key");

const objAsKey = { id: 1 };
simpleMap.set(objAsKey, "object as key");

console.log(simpleMap.get(objAsKey)); // "object as key" — працює тільки з Map
```

## 2. Створення Map

```js
// а) порожній Map
const emptyMap = new Map();

// б) Map одразу з даними — конструктор приймає iterable з пар [ключ, значення]
const filledMap = new Map([
  ["name", "John"],
  ["age", 30],
]);
console.log(filledMap); // Map(2) { 'name' => 'John', 'age' => 30 }

// в) з масиву пар (той самий принцип, що й вище)
const arrayOfPairs = [
  ["a", 1],
  ["b", 2],
];
const fromArray = new Map(arrayOfPairs);

// г) з іншого Map (копіювання — поверхневе, shallow copy)
const copiedMap = new Map(filledMap);
console.log(copiedMap.get("name")); // "John"
console.log(copiedMap === filledMap); // false — новий, незалежний Map

// д) з Object.entries() — перетворення звичайного об'єкта в Map
const plainObj = { x: 1, y: 2, z: 3 };
const mapFromObject = new Map(Object.entries(plainObj));
console.log(mapFromObject.get("x")); // 1
```

## 3. map.set(key, value) — додавання / оновлення елемента

```js
const userMap = new Map();
userMap.set("name", "Alex");
userMap.set("age", 25);

// повторний set() з тим самим ключем — оновлює значення, а не дублює:
userMap.set("age", 26);
console.log(userMap.get("age")); // 26 — старе значення перезаписано

// set() повертає сам Map — тому виклики можна ланцюжком (chaining):
const chainedMap = new Map().set("a", 1).set("b", 2).set("c", 3);
console.log(chainedMap); // Map(3) { 'a' => 1, 'b' => 2, 'c' => 3 }
```

## 4. map.get(key) — отримання значення

```js
console.log(userMap.get("name")); // "Alex"
console.log(userMap.get("nonExistentKey")); // undefined — якщо ключа немає

// на відміну від Object, тут ключі порівнюються за SameValueZero-
// алгоритмом (майже як ===, але NaN === NaN тут вважається true):
const mapWithNaN = new Map();
mapWithNaN.set(NaN, "value for NaN");
console.log(mapWithNaN.get(NaN)); // "value for NaN" — знайдено, хоча NaN !== NaN
```

## 5. map.has(key) — перевірка наявності ключа

```js
console.log(userMap.has("name")); // true
console.log(userMap.has("email")); // false

// важливо: на відміну від obj.prop (де undefined може означати і
// "властивості немає", і "властивість дорівнює undefined"), тут
// has() дає однозначну відповідь:
userMap.set("middleName", undefined);
console.log(userMap.get("middleName")); // undefined
console.log(userMap.has("middleName")); // true — ключ існує, просто значення undefined
console.log(userMap.has("neverSetKey")); // false — а цього ключа взагалі немає
```

## 6. map.delete(key) — видалення елемента

```js
const deletableMap = new Map([
  ["a", 1],
  ["b", 2],
]);
console.log(deletableMap.delete("a")); // true — видалення відбулось
console.log(deletableMap.delete("z")); // false — такого ключа не було, нічого не видалено
console.log(deletableMap); // Map(1) { 'b' => 2 }
// delete() повертає boolean (успіх/неуспіх) — на відміну від
// оператора delete для звичайних об'єктів, який завжди повертає true
```

## 7. map.clear() — очищення всієї колекції

```js
const clearableMap = new Map([
  ["a", 1],
  ["b", 2],
  ["c", 3],
]);
clearableMap.clear();
console.log(clearableMap); // Map(0) {}
console.log(clearableMap.size); // 0
```

## 8. map.size — кількість елементів

`size` — це геттер (властивість), а не метод — викликається без дужок.

```js
console.log(userMap.size); // кількість пар у userMap

// Головна перевага над Object.keys(obj).length: size обчислюється
// рушієм за O(1), тоді як для об'єкта треба спершу зібрати масив
// усіх ключів — O(n).
console.log(Object.keys(plainObj).length); // теж працює, але дорожче для великих об'єктів
```

## 9. Ітерація: map.keys() / map.values() / map.entries()

```js
const iterableMap = new Map([
  ["name", "John"],
  ["age", 30],
  ["city", "Kyiv"],
]);

// map.keys() — ітератор по ключах
for (const key of iterableMap.keys()) {
  console.log("key:", key);
}

// map.values() — ітератор по значеннях
for (const value of iterableMap.values()) {
  console.log("value:", value);
}

// map.entries() — ітератор по парах [ключ, значення]
for (const [key, value] of iterableMap.entries()) {
  console.log(key, "=", value);
}

// важливо: усі три методи повертають Map Iterator, а не масив —
// щоб отримати справжній масив, потрібно обгорнути у Array.from()
// або розгорнути через spread:
const keysArray = Array.from(iterableMap.keys());
const valuesAsArray = [...iterableMap.values()];
console.log(keysArray, valuesAsArray);
```

## 10. Map є iterable напряму — for...of без .entries()

`Map` реалізує `Symbol.iterator` так, що ітерація за замовчуванням — це те саме, що й `map.entries()`. Саме тому `for...of` працює прямо по самому `Map`, без виклику жодного методу:

```js
for (const [key, value] of iterableMap) {
  console.log("direct iteration:", key, value);
}

// це і є причина, чому [...map] дає масив пар, а не щось інше:
console.log([...iterableMap]); // [["name","John"], ["age",30], ["city","Kyiv"]]

// а на відміну від Map, звичайний об'єкт НЕ iterable — for...of по
// ньому напряму кине TypeError:
// for (const pair of plainObj) {} // TypeError: plainObj is not iterable
```

## 11. map.forEach(callback) — перебір із колбеком

Сигнатура колбека: `(value, key, map)` — саме в такому порядку (значення перше, а не ключ, на відміну від інтуїтивного очікування, але так само, як `array.forEach((item, index, array) => {})`).

```js
iterableMap.forEach((value, key, mapRef) => {
  console.log(`${key}: ${value}`);
});

// forEach() не має способу "перервати" перебір (break/return не
// зупиняють цикл) — якщо потрібне дострокове завершення, використовуй
// звичайний for...of з break.
for (const [key, value] of iterableMap) {
  if (key === "age") break; // так можна, forEach так не можна
}
```

## 12. Map.groupBy() — статичний метод групування (ES2024)

`Map.groupBy(iterable, callback)` групує елементи колекції в новий `Map`, де ключі — результат виклику `callback`, а значення — масиви елементів цієї групи. Порівняно з `Object.groupBy()` (який повертає звичайний об'єкт), тут ключами групування можуть бути будь-які значення, не лише рядки/символи.

```js
const products = [
  { name: "Laptop", category: "electronics", price: 25000 },
  { name: "Mouse", category: "electronics", price: 500 },
  { name: "Bread", category: "food", price: 30 },
];

const groupedByCategory = Map.groupBy(products, (item) => item.category);
console.log(groupedByCategory.get("electronics")); // [{ name: "Laptop", ... }, { name: "Mouse", ... }]
console.log(groupedByCategory instanceof Map); // true

// групування за нестандартним ключем — наприклад, за самим об'єктом:
const categoryElectronics = { label: "electronics" };
const categoryFood = { label: "food" };
const groupedByObjectKey = Map.groupBy(products, (item) =>
  item.category === "electronics" ? categoryElectronics : categoryFood,
);
console.log(groupedByObjectKey.get(categoryElectronics).length); // 2 — ключ-об'єкт спрацював
```

## 13. Конвертація Map ↔ об'єкт ↔ масив

```js
// Map → масив пар:
const mapToArray = [...iterableMap]; // або Array.from(iterableMap)

// Map → звичайний об'єкт (працює коректно, лише якщо всі ключі — рядки/symbol):
const mapToObject = Object.fromEntries(iterableMap);
console.log(mapToObject); // { name: "John", age: 30, city: "Kyiv" }

// об'єкт → Map:
const objectToMap = new Map(Object.entries(mapToObject));

// масив пар → Map:
const pairsToMap = new Map([
  ["a", 1],
  ["b", 2],
]);
```

## 14. Map vs Object — коли що обирати

| Критерій | Map | Object |
|---|---|---|
| Тип ключа | будь-який (навіть об'єкти) | лише рядок або symbol |
| Порядок ключів | завжди insertion order | integer-ключі спереду, потім insertion order |
| Розмір колекції | `map.size` (O(1)) | `Object.keys(obj).length` (O(n)) |
| Ітерованість (iterable) | так, напряму (`for...of`) | ні, потрібен `Object.keys()`/`entries()` тощо |
| Продуктивність при частих додаваннях/видаленнях | краще оптимізований для цього сценарію | має накладні витрати через прототипний ланцюжок |
| Ризик колізії з успадкованим іменем (`"toString"` тощо) | немає (немає прототипних «службових» імен) | є (наприклад, ключ `"toString"` конфліктує з методом) |
| Серіалізація в JSON | не підтримується напряму (потрібна ручна конвертація) | так, `JSON.stringify()` з коробки |

```js
// Приклад проблеми з "небезпечними" ключами в об'єкті — з Map такого немає:
const dangerousKeysMap = new Map();
dangerousKeysMap.set("toString", "nothing is broken");
console.log(dangerousKeysMap.get("toString")); // "nothing is broken" — усе ок

const dangerousKeysObj = {};
dangerousKeysObj["toString"] = "I overrode the method!";
console.log(typeof dangerousKeysObj.toString); // "string" — метод справді зламаний

// JSON.stringify не бачить вміст Map:
console.log(JSON.stringify(iterableMap)); // "{}" — треба спочатку сконвертувати в об'єкт/масив
console.log(JSON.stringify(Object.fromEntries(iterableMap))); // {"name":"John","age":30,"city":"Kyiv"}
```

## 15. WeakMap — коротко, для контрасту з Map

`WeakMap` — «родич» `Map` з трьома ключовими відмінностями:

1. ключами можуть бути лише об'єкти (і, з ES2023, незареєстровані symbol — не `Symbol.for`) — не можна використати рядок, число чи boolean як ключ;
2. ключі зберігаються «слабко» (weak reference) — якщо на об'єкт-ключ більше ніде немає посилань, збирач сміття (garbage collector) може видалити і сам об'єкт, і відповідний запис у `WeakMap`;
3. `WeakMap` не ітерований — немає `keys()`/`values()`/`entries()`/`forEach()`/`size`, бо неможливо надійно «перелічити» вміст, який може зникнути в будь-який момент через garbage collection.

```js
const weakMapDemo = new WeakMap();
let temporaryKey = { id: 1 };
weakMapDemo.set(temporaryKey, "bound private data");
console.log(weakMapDemo.get(temporaryKey)); // "bound private data"

// коли temporaryKey стане недосяжним (наприклад, temporaryKey = null),
// збирач сміття зможе звільнити пам'ять і від самого об'єкта,
// і від запису в WeakMap — це запобігає витокам пам'яті (memory leaks)
```

Типове застосування `WeakMap` — зберігання «приватних» метаданих для об'єктів, які не заважають самому об'єкту бути зібраним збирачем сміття, коли він більше нікому не потрібен. Детально — [WeakMap.md](../WeakMap/WeakMap.md).

## 16. Практичні приклади

Кілька невеликих типових задач на `Map`.

```js
// Перевірка наявності ключа
const set1 = new Map();
set1.set(5, true);
set1.set(10, true);
console.log(set1.has(5)); // true
console.log(set1.has(15)); // false

// Швидкий пошук/словник
const dictionary = new Map();
dictionary.set("hello", "hola");
dictionary.set("world", "mundo");
console.log(dictionary.get("hello")); // hola

// Підрахунок входжень елементів масиву
const countOccurrences = (arr) => {
  const counts = new Map();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return counts;
};
const fruits = ["apple", "banana", "apple", "orange", "banana", "apple"];
console.log(countOccurrences(fruits));
// Map { 'apple' => 3, 'banana' => 2, 'orange' => 1 }

// Видалення дублікатів (через ключі Map, порядок зберігається)
const removeDuplicates = (arr) => {
  const unique = new Map();
  for (const item of arr) {
    unique.set(item, true);
  }
  return Array.from(unique.keys());
};
console.log(removeDuplicates([1, 2, 3, 1, 2, 4])); // [1, 2, 3, 4]

// Групування масиву об'єктів за ключем — три способи
const users = [
  { name: "Alex", role: "admin" },
  { name: "John", role: "user" },
  { name: "Anna", role: "admin" },
];

// 1) вручну через Map (див. розділ 12 — Map.groupBy() робить те саме "з коробки")
const groupByMap = (arr, key) => {
  const grouped = new Map();
  for (const item of arr) {
    const group = item[key];
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(item);
  }
  return grouped;
};
console.log(groupByMap(users, "role"));
// Map { 'admin' => [{...Alex}, {...Anna}], 'user' => [{...John}] }

// 2) через reduce у звичайний об'єкт, зі spread (менш ефективно — O(n²)
// через копіювання масиву на кожній ітерації, performance/09-allocation-optimization.md)
const groupByReduceSpread = (arr, key) =>
  arr.reduce((acc, item) => {
    acc[item[key]] = [...(acc[item[key]] || []), item];
    return acc;
  }, {});
console.log(groupByReduceSpread(users, "role"));

// 3) через reduce у звичайний об'єкт, з push (без зайвих копій — краще)
const groupByReducePush = (arr, key) =>
  arr.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
console.log(groupByReducePush(users, "role"));
```

## 17. Як Map працює під капотом

`Map` — **впорядкована хеш-таблиця**: масив записів у порядку вставки плюс хеш-індекс. Звідси:

- `set`, `get`, `has`, `delete` — **O(1)** у середньому; `size` — O(1);
- ключі порівнюються за **SameValueZero**: `NaN` знаходить `NaN`, `0` і `-0` — один ключ; об'єкти — **за посиланням**; `"0"` і `0` — різні ключі;
- обхід — O(n) у порядку вставки.

```js
const m = new Map([[NaN, "nan"], [0, "zero"]]);
m.get(NaN);  // "nan"
m.get(-0);   // "zero"
m.get("0");  // undefined — це інший ключ
```

Докладніше про хеш-таблиці — у [HashTable](../HashTable/HashTable.md).

## 18. Порядок і зміна під час ітерації

- **`set` для існуючого ключа оновлює значення, але НЕ змінює позицію** (перевірено: `set("x", 9)` лишає `x` першим).
- **`delete` + `set`** переносить ключ у кінець. На цьому — LRU-кеш на `Map`.
- Ітерація «жива»: ключі, **додані** під час обходу, **будуть відвідані**; **видалені** до візиту — пропускаються. Додавання нових ключів у кожній ітерації — нескінченний цикл; для складної логіки ітеруй копію `[...map]`.

```js
const it = new Map([[1, "a"], [2, "b"]]);
for (const [k] of it) {
  if (k === 1) it.set(3, "c");  // 3 буде відвіданий: порядок обходу 1, 2, 3
}
```

## 19. Складені ключі

Ключ-масив чи ключ-об'єкт порівнюється **за посиланням**, тому `map.get([1, 2])` після `map.set([1, 2], …)` дає `undefined` (перевірено). Для складених ключів:

```js
// 1) рядок-ключ із роздільником
const grid = new Map();
grid.set(`${x},${y}`, value);
grid.get(`${x},${y}`);

// 2) вкладені Map
const nested = new Map();            // Map<number, Map<number, V>>
nested.set(1, new Map([[2, "v"]]));
nested.get(1)?.get(2);

// 3) один «канонічний» об'єкт-ключ: зберігати посилання на нього
```

Роздільник має бути таким, щоб він не міг траплятися в частинах ключа, інакше `("a,b", "c")` і `("a", "b,c")` збігнуться.

## 20. Map як кеш: мемоізація та LRU

**Мемоізація** — результат функції зберігається за аргументом:

```js
function memoize(fn) {
  const cache = new Map();
  return (arg) => {
    if (cache.has(arg)) return cache.get(arg);  // has, а не get() ?? — результат може бути undefined/0
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
```

**LRU-кеш на `Map`** (найкоротша реалізація, бо `Map` пам'ятає порядок вставки):

```js
class LRU {
  #m = new Map();
  constructor(capacity) { this.capacity = capacity; }
  get(key) {
    if (!this.#m.has(key)) return undefined;
    const value = this.#m.get(key);
    this.#m.delete(key);       // «освіжити»: видалити…
    this.#m.set(key, value);   // …і додати в кінець
    return value;
  }
  set(key, value) {
    this.#m.delete(key);
    this.#m.set(key, value);
    if (this.#m.size > this.capacity) {
      this.#m.delete(this.#m.keys().next().value);  // найстарший — перший ключ
    }
  }
}
```

Перевірено: після `set(a), set(b), get(a), set(c)` при ємності 2 у кеші лишаються `a` та `c`. Класична реалізація з двозв'язним списком — у [LinkedList-variants](../LinkedList/LinkedList-variants.md); `Map`-версія коротша, бо порядок вставки зберігає сам `Map`.

Для кешу, прив'язаного до об'єктів-ключів без витоку пам'яті — `WeakMap`.

## 21. Serialization: Map у JSON і назад

`JSON.stringify(new Map([["a", 1]]))` → `"{}"`: `Map` не серіалізується. Варіанти:

```js
// 1) масив пар
const text = JSON.stringify([...map]);          // '[["a",1],["b",2]]'
const back = new Map(JSON.parse(text));

// 2) об'єкт (лише коли всі ключі — рядки)
JSON.stringify(Object.fromEntries(map));

// 3) replacer/reviver — щоб вкладені Map серіалізувались автоматично
const replacer = (k, v) => (v instanceof Map ? { __map__: [...v] } : v);
JSON.stringify({ m: map }, replacer);           // '{"m":{"__map__":[["a",1],["b",2]]}}'
```

`structuredClone(map)` **коректно** копіює `Map` (і вкладені `Set`, `Date`).

## 22. Корисні рецепти

```js
// лічильник (значення за замовчуванням через ??)
for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

// сортування за значенням — повертає НОВИЙ Map
const sorted = new Map([...counts].sort((a, b) => b[1] - a[1]));

// злиття (пізніші перемагають)
const merged = new Map([...mapA, ...mapB]);

// фільтрація
const big = new Map([...counts].filter(([, n]) => n > 1));

// «getOrCreate» для групування
if (!groups.has(key)) groups.set(key, []);
groups.get(key).push(item);

// Map.groupBy — те саме з коробки (ES2024)
Map.groupBy(items, (item) => item.category);
```

## 23. Типові помилки

1. Використовувати `map[key] = value` замість `map.set(key, value)`: це створює **звичайну властивість**, а не запис Map.
2. Ключі-об'єкти/масиви й очікування пошуку «за вмістом».
3. `map.size()` — це геттер, дужок немає.
4. `JSON.stringify(map)` без перетворення (порожній `{}`).
5. `if (map.get(key))` для перевірки наявності — хибно для `0`, `""`, `false`; використовуй `has`.
6. Змінювати `Map` під час обходу з додаванням нових ключів (нескінченний цикл).
7. `forEach((key, value))` — порядок аргументів `(value, key)`.
8. Очікувати від `Map` індексного доступу чи `map.length`.
9. Складений ключ через `+` без роздільника → колізії.
10. Використовувати `Map` там, де `Object` природніший (запис з відомими полями, JSON).

## 24. Алгоритм: як користуватися Map

1. Динамічні ключі або ключі не рядки → `Map`; запис з відомими полями → `Object`.
2. `set/get/has/delete`; перевіряй наявність через `has`, а не через truthy.
3. Обхід: `for (const [k, v] of map)`.
4. Складений ключ → рядок з роздільником або вкладені `Map`.
5. Кеш: `Map` (мемоізація) або LRU (`delete` + `set`).
6. Серіалізація: `[...map]`, `Object.fromEntries` або replacer.
7. Ключі-об'єкти без витоку пам'яті → `WeakMap`.

## Підсумок

- `Map` — колекція пар ключ-значення з ключем будь-якого типу.
- Зберігає порядок додавання (insertion order) завжди.
- `set()`/`get()`/`has()`/`delete()`/`clear()` — базові операції; `set()` повертає сам `Map` (можна ланцюжком).
- `size` — властивість (геттер), а не метод.
- Ключі порівнюються за SameValueZero (`NaN === NaN` тут `true`, на відміну від звичайного `===`).
- `Map` ітерований напряму (`for...of`), еквівалентно `map.entries()`.
- `forEach(value, key, map)` — порядок аргументів: значення першим.
- `Map.groupBy()` групує iterable у новий `Map` з довільними ключами.
- Конвертація: `Object.fromEntries(map)` → об'єкт; `new Map(Object.entries(obj))` → назад у `Map`.
- Обирай `Map` замість `Object`, коли: ключі не є рядками/symbol, важливий порядок, часті додавання/видалення, потрібен безпечний захист від колізій з успадкованими іменами.
- `WeakMap` — лише об'єкти як ключі, слабкі посилання, не ітерований, використовується для приватних метаданих без витоку пам'яті.
- Під капотом — впорядкована хеш-таблиця; `set` існуючого ключа позицію не змінює, `delete` + `set` переносить у кінець (основа LRU на `Map`).
- Складені ключі: рядок із роздільником або вкладені `Map`; масиви/об'єкти як ключі — за посиланням.
- `JSON.stringify(map)` порожній: використовуй `[...map]` чи replacer; `structuredClone(map)` працює.
- Перевіряй наявність через `has`, а не через `if (map.get(key))`.
