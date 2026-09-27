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

1. ключами можуть бути лише об'єкти (і, з ES2023, реєстровані symbol) — не можна використати рядок, число чи boolean як ключ;
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
