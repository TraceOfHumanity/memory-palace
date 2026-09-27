# Object — способи створення та повний огляд методів

## 1. Способи створення об'єктів у JavaScript

```js
// а) object literal — найпоширеніший спосіб
const literalObj = {
  name: "John",
  age: 30,
};
console.log(literalObj);

// б) new Object() — функціонально ідентично до {}, але {} — швидший
// і прийнятіший (idiomatic) варіант
const newObj = new Object();
newObj.name = "Alex";
console.log(newObj);

// в) Object.create() — створює новий об'єкт з явно вказаним прототипом;
// Object.create(null) створює об'єкт без прототипу взагалі
// (навіть без Object.prototype) — корисно для "чистих" словників
const proto = {
  greet() {
    return "Hello!";
  },
};
const createdObj = Object.create(proto);
createdObj.name = "Ann";
console.log(createdObj.greet()); // "Hello!" — успадковано з proto
console.log(Object.getPrototypeOf(createdObj) === proto); // true

const dictLikeObj = Object.create(null);
dictLikeObj.key = "value";
console.log(dictLikeObj); // [Object: null prototype] { key: 'value' }

// г) constructor function — виклик функції з new створює новий об'єкт,
// прив'язує до нього this і повертає його
function Person(name, age) {
  this.name = name;
  this.age = age;
}
const personFromConstructor = new Person("Bob", 25);
console.log(personFromConstructor);

// д) class (ES6 — синтаксичний цукор над конструктор-функціями)
class PersonClass {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}
const personFromClass = new PersonClass("Kate", 28);
console.log(personFromClass);

// е) factory function — звичайна функція, що повертає новий об'єкт
// без використання new; не потребує this і конструкторів
function createPerson(name, age) {
  return { name, age };
}
const personFromFactory = createPerson("Mike", 40);
console.log(personFromFactory);

// є) Object.assign() — злиття одного чи кількох джерел у новий/цільовий об'єкт
const assignedObj = Object.assign({}, { a: 1 }, { b: 2 });
console.log(assignedObj); // { a: 1, b: 2 }

// ж) spread operator (ES2018) — поверхнева копія властивостей
const spreadSource = { x: 1, y: 2 };
const spreadObj = { ...spreadSource, z: 3 };
console.log(spreadObj); // { x: 1, y: 2, z: 3 }

// з) JSON.parse() — створення об'єкта з JSON-рядка
const jsonObj = JSON.parse('{"name":"Zoe","age":22}');
console.log(jsonObj);

// и) Object.fromEntries() — з масиву пар [ключ, значення] (або з Map)
const entriesObj = Object.fromEntries([
  ["a", 1],
  ["b", 2],
]);
console.log(entriesObj); // { a: 1, b: 2 }

const mapForEntries = new Map([
  ["x", 10],
  ["y", 20],
]);
console.log(Object.fromEntries(mapForEntries)); // { x: 10, y: 20 }

// і) singleton pattern через IIFE (Immediately Invoked Function Expression) —
// функція, яка одразу викликається і повертає об'єкт з інкапсульованим станом
const singleton = (function () {
  let privateValue = 0;
  return {
    increment() {
      privateValue += 1;
      return privateValue;
    },
  };
})();
console.log(singleton.increment()); // 1
console.log(singleton.increment()); // 2
```

Підсумок способів створення:

- `{}` — object literal, найпростіший і найшвидший спосіб;
- `new Object()` — те саме, що `{}`, але через явний виклик конструктора;
- `Object.create(proto)` — повний контроль над прототипом об'єкта;
- `function` + `new` — класичний конструктор (pre-ES6 патерн);
- `class` — сучасний синтаксис для конструкторів;
- factory function — звичайна функція, що повертає об'єкт (без `new`/`this`);
- `Object.assign()` — злиття/копіювання властивостей у новий об'єкт;
- spread `{ ...obj }` — сучасна альтернатива `Object.assign` для копіювання;
- `JSON.parse()` — створення об'єкта з JSON-рядка;
- `Object.fromEntries()` — створення об'єкта з масиву пар [ключ, значення];
- IIFE / singleton — створення одного об'єкта з приватним станом.

## 2. Огляд методів Object

**Статичні методи** (`Object.methodName(...)`):

- робота з властивостями: `keys`, `values`, `entries`, `fromEntries`, `assign`, `defineProperty`, `defineProperties`, `getOwnPropertyNames`, `getOwnPropertySymbols`, `getOwnPropertyDescriptor`, `getOwnPropertyDescriptors`, `hasOwn`;
- створення об'єктів і робота з прототипами: `create`, `getPrototypeOf`, `setPrototypeOf`;
- обмеження мутацій об'єкта: `freeze`, `isFrozen`, `seal`, `isSealed`, `preventExtensions`, `isExtensible`;
- порівняння: `is`;
- групування (ES2024): `groupBy`.

**Методи екземпляра** (`obj.methodName(...)`, через `Object.prototype`): `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toString`, `toLocaleString`, `valueOf`.

## 3. Object.keys()

`Object.keys(obj)` повертає масив рядків — імен власних (own) перелічуваних (enumerable) властивостей об'єкта, у тому порядку, в якому їх би обходив цикл `for...in` (але без успадкованих властивостей з прототипу).

```js
const userKeys = { name: "John", age: 30, city: "Kyiv" };
console.log(Object.keys(userKeys)); // ["name", "age", "city"]

// "власні" (own) — не успадковані властивості:
// Object.keys() ігнорує властивості, отримані через прототип
const parentObj = { inherited: "I'm from the prototype" };
const childObj = Object.create(parentObj);
childObj.own = "I'm an own property";
console.log(Object.keys(childObj)); // ["own"] — inherited не потрапляє

// тільки enumerable властивості: властивість, оголошена через
// Object.defineProperty з enumerable: false, не потрапить у результат
const withHiddenProp = {};
Object.defineProperty(withHiddenProp, "visible", {
  value: "visible value",
  enumerable: true,
});
Object.defineProperty(withHiddenProp, "hidden", {
  value: "hidden value",
  enumerable: false,
});
console.log(Object.keys(withHiddenProp)); // ["visible"]
```

Порядок ключів у результаті не довільний, він регламентований специфікацією: спочатку всі ключі, що є цілими невід'ємними числами (integer-like keys, наприклад `"0"`, `"1"`, `"2"`) — у зростаючому числовому порядку, незалежно від порядку додавання; потім усі звичайні строкові ключі — у порядку додавання (insertion order); symbol-ключі `Object.keys()` взагалі не повертає.

```js
const orderedObj = { b: 1, 2: "two", a: 2, 1: "one" };
console.log(Object.keys(orderedObj)); // ["1", "2", "b", "a"]
// числові ключі "1" і "2" підняті наверх і відсортовані,
// а "b" і "a" йдуть у порядку, в якому їх дописали

// результат — завжди масив рядків, навіть числові ключі повертаються
// як рядки, а не числа:
const numericKeysObj = { 10: "a", 20: "b" };
console.log(Object.keys(numericKeysObj)); // ["10", "20"]
console.log(typeof Object.keys(numericKeysObj)[0]); // "string"

// масиви — теж об'єкти, тому Object.keys() працює і з ними,
// повертаючи індекси елементів як рядки:
const arrForKeys = ["x", "y", "z"];
console.log(Object.keys(arrForKeys)); // ["0", "1", "2"]

// порожній об'єкт та "межові" значення:
console.log(Object.keys({})); // []
// примітиви автоматично обгортаються у Wrapper-об'єкт, і Object.keys
// повертає їхні власні перелічувані властивості:
console.log(Object.keys("abc")); // ["0", "1", "2"] — символи рядка
// null та undefined кидають помилку, бо їх неможливо привести до об'єкта:
// Object.keys(null); // TypeError: Cannot convert undefined or null to object

// найчастіше застосування — ітерація по об'єкту (об'єкти не iterable
// напряму, на відміну від масивів чи Map):
const productForIteration = { title: "Laptop", price: 25000, inStock: true };

Object.keys(productForIteration).forEach((key) => {
  console.log(`${key}: ${productForIteration[key]}`);
});
// title: Laptop
// price: 25000
// inStock: true

for (const key of Object.keys(productForIteration)) {
  console.log(key, "=", productForIteration[key]);
}

// частий прийом: перевірка, чи об'єкт порожній
function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}
console.log(isEmptyObject({})); // true
console.log(isEmptyObject({ a: 1 })); // false
```

Порівняння з іншими способами обходу: `Object.keys(obj)` → масив ключів (лише власні enumerable); `Object.values(obj)` → масив значень; `Object.entries(obj)` → масив пар `[ключ, значення]`; `for...in` → перебирає ключі, включно зі спадкованими (тому в `for...in` часто додатково перевіряють `obj.hasOwnProperty(key)`); `Reflect.ownKeys(obj)` → усі власні ключі, включно з не-enumerable і symbol-ключами (найповніший варіант).

```js
const forInDemo = Object.create({ inheritedProp: "from prototype" });
forInDemo.ownProp = "own";

for (const key in forInDemo) {
  console.log("for...in:", key); // виведе і ownProp, і inheritedProp
}
// Object.keys(forInDemo) поверне лише ["ownProp"]
```

### Підсумок Object.keys()

- Повертає масив рядків-імен власних enumerable властивостей.
- Не включає успадковані з прототипу властивості, symbol-ключі, non-enumerable властивості.
- Порядок: числові ключі за зростанням → рядкові за порядком додавання.
- Працює з масивами (повертає індекси-рядки) і з примітивами-обгортками.
- `null`/`undefined` → `TypeError`.
- Головне застосування: ітерація по властивостях об'єкта.

## 4. Object.values()

`Object.values(obj)` повертає масив значень власних (own) перелічуваних (enumerable) властивостей об'єкта. По суті — «сестра» `Object.keys()`, але замість ключів повертає значення.

```js
const userValues = { name: "John", age: 30, city: "Kyiv" };
console.log(Object.values(userValues)); // ["John", 30, "Kyiv"]

// порядок значень збігається з порядком Object.keys():
const orderedValuesObj = { b: "value-b2", 2: "two", a: "value-a2", 1: "one" };
console.log(Object.keys(orderedValuesObj)); // ["1", "2", "b", "a"]
console.log(Object.values(orderedValuesObj)); // ["one", "two", "value-b2", "value-a2"]
// values[i] відповідає keys[i] — порядок завжди узгоджений

// "власні" (own) — не успадковані значення:
const parentForValues = { inherited: "I'm from the prototype" };
const childForValues = Object.create(parentForValues);
childForValues.own = "I'm an own property";
console.log(Object.values(childForValues)); // ["I'm an own property"]

// тільки enumerable значення:
const withHiddenValue = {};
Object.defineProperty(withHiddenValue, "visible", {
  value: "visible value",
  enumerable: true,
});
Object.defineProperty(withHiddenValue, "hidden", {
  value: "hidden value",
  enumerable: false,
});
console.log(Object.values(withHiddenValue)); // ["visible value"]

// робота з масивами: повертає самі елементи (а не індекси):
const arrForValues = ["x", "y", "z"];
console.log(Object.values(arrForValues)); // ["x", "y", "z"]

// примітиви та "межові" значення:
console.log(Object.values({})); // []
console.log(Object.values("abc")); // ["a", "b", "c"] — символи рядка
// Object.values(null); // TypeError: Cannot convert undefined or null to object

// якщо значення — геттер: Object.values() викликає геттер, щоб
// отримати актуальне значення — на відміну від getOwnPropertyDescriptor(),
// який повернув би саму функцію-геттер, а не результат її виклику:
const objWithGetter = {
  _price: 100,
  get price() {
    console.log("price getter called");
    return this._price * 1.2; // наприклад, ціна з ПДВ
  },
};
console.log(Object.values(objWithGetter)); // [100, 120] — геттер спрацював

// найчастіше застосування: коли потрібні саме значення, а ключі не важливі
const cart = { apple: 3, banana: 5, orange: 2 };
const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
console.log(totalItems); // 10
console.log(Object.values(cart).some((count) => count > 4)); // true
console.log(Math.max(...Object.values(cart))); // 5
```

### Підсумок Object.values()

- Повертає масив значень власних enumerable властивостей.
- Порядок завжди узгоджений з `Object.keys()` (той самий обхід).
- Не включає успадковані та non-enumerable властивості.
- Для геттерів повертає результат виклику геттера, а не саму функцію.
- Працює з масивами (повертає елементи) і з примітивами-обгортками.
- `null`/`undefined` → `TypeError`.
- Головне застосування: підрахунки/пошук/агрегації по значеннях об'єкта.

## 5. Object.entries()

`Object.entries(obj)` повертає масив пар `[ключ, значення]` для власних (own) перелічуваних (enumerable) властивостей об'єкта. `Object.entries(obj)[i] === [Object.keys(obj)[i], Object.values(obj)[i]]` — по суті, об'єднання `Object.keys()` та `Object.values()`.

```js
const userEntries = { name: "John", age: 30, city: "Kyiv" };
console.log(Object.entries(userEntries));
// [["name","John"], ["age",30], ["city","Kyiv"]]

const orderedEntriesObj = { b: 1, 2: "two", a: 2, 1: "one" };
console.log(Object.entries(orderedEntriesObj));
// [["1","one"], ["2","two"], ["b",1], ["a",2]]

// "власні" enumerable пари — ті самі правила, що й у keys()/values():
const parentForEntries = { inherited: "from prototype" };
const childForEntries = Object.create(parentForEntries);
childForEntries.own = "own value";
console.log(Object.entries(childForEntries)); // [["own", "own value"]]

// найчастіше застосування — ітерація з деструктуризацією:
const productForEntries = { title: "Laptop", price: 25000, inStock: true };

for (const [key, value] of Object.entries(productForEntries)) {
  console.log(`${key}: ${value}`);
}
// title: Laptop
// price: 25000
// inStock: true

Object.entries(productForEntries).forEach(([key, value]) => {
  console.log(key, "->", value);
});
```

Об'єкти самі по собі не мають `map`/`filter`, але через `entries()` їх можна «прогнати» крізь масивні методи, а тоді зібрати назад в об'єкт через `Object.fromEntries()` — це і є та причина, чому `entries()` та `fromEntries()` зазвичай працюють у парі.

```js
const prices = { apple: 10, banana: 20, orange: 30 };

// підняти всі ціни на 10%:
const pricesWithMarkup = Object.fromEntries(
  Object.entries(prices).map(([key, value]) => [key, Math.round(value * 1.1)]),
);
console.log(pricesWithMarkup); // { apple: 11, banana: 22, orange: 33 }

// залишити тільки товари з ціною більше 15:
const expensiveOnly = Object.fromEntries(Object.entries(prices).filter(([, value]) => value > 15));
console.log(expensiveOnly); // { banana: 20, orange: 30 }

// робота з масивами: пари [індекс, значення]
const arrForEntries = ["x", "y", "z"];
console.log(Object.entries(arrForEntries));
// [["0","x"], ["1","y"], ["2","z"]]

// якщо значення — геттер: Object.entries() теж викликає геттер
const objWithGetterEntries = {
  _price: 100,
  get price() {
    return this._price * 1.2;
  },
};
console.log(Object.entries(objWithGetterEntries));
// [["_price", 100], ["price", 120]]

// "межові" значення:
console.log(Object.entries({})); // []
console.log(Object.entries("ab")); // [["0","a"], ["1","b"]]
// Object.entries(null); // TypeError: Cannot convert undefined or null to object

// зворотна операція — Object.fromEntries():
const backToObject = Object.fromEntries(Object.entries(userEntries));
console.log(backToObject); // { name: "John", age: 30, city: "Kyiv" }
console.log(backToObject !== userEntries); // true — це новий об'єкт (shallow copy)

// порівняння з Map: формат пар [ключ, значення] сумісний із
// конструктором Map:
const userMap = new Map(Object.entries(userEntries));
console.log(userMap.get("name")); // "John"
console.log(userMap instanceof Map); // true
```

### Підсумок Object.entries()

- Повертає масив пар `[ключ, значення]` власних enumerable властивостей.
- Порядок узгоджений з `Object.keys()`/`Object.values()`.
- Не включає успадковані та non-enumerable властивості.
- Для геттерів повертає результат виклику, а не саму функцію.
- Працює з масивами (пари `[індекс, елемент]`) і примітивами-обгортками.
- `null`/`undefined` → `TypeError`.
- У парі з `Object.fromEntries()` дозволяє «map/filter» по об'єкту.
- Формат пар сумісний із конструктором `Map`.

## 6. Object.assign()

`Object.assign(target, ...sources)` копіює всі власні перелічувані властивості з одного чи кількох об'єктів-джерел (`sources`) у цільовий об'єкт (`target`) і повертає `target` (той самий, змінений). Це мутація `target`, а не створення нового об'єкта «з нуля».

```js
const target1 = { a: 1 };
const source1 = { b: 2 };
const result1 = Object.assign(target1, source1);
console.log(result1); // { a: 1, b: 2 }
console.log(result1 === target1); // true — це той самий об'єкт, не копія
```

Щоб не мутувати жоден із джерельних об'єктів, першим аргументом передають порожній об'єкт `{}` — саме так `Object.assign()` зазвичай використовують для (поверхневого) клонування/злиття.

```js
const original = { x: 1, y: 2 };
const clone = Object.assign({}, original);
clone.x = 100;
console.log(original.x); // 1 — оригінал не змінився
console.log(clone.x); // 100

// злиття кількох джерел — порядок має значення: властивості з наступних
// джерел перезаписують однойменні властивості з попередніх
const merged = Object.assign({}, { a: 1, b: 1 }, { b: 2, c: 2 }, { c: 3 });
console.log(merged); // { a: 1, b: 2, c: 3 }
```

Це shallow copy (поверхневе копіювання): `Object.assign()` копіює значення властивостей першого рівня. Якщо значення властивості — об'єкт/масив (reference type), копіюється лише посилання на нього, а не сам вкладений об'єкт.

```js
const nestedSource = { info: { age: 30 } };
const shallowCopy = Object.assign({}, nestedSource);

shallowCopy.info.age = 99;
console.log(nestedSource.info.age); // 99 — теж змінилось!
console.log(shallowCopy.info === nestedSource.info); // true — те саме посилання

// для глибокого копіювання потрібні інші інструменти:
// structuredClone(obj), JSON.parse(JSON.stringify(obj)) (з обмеженнями),
// або рекурсивна функція / бібліотека (lodash.cloneDeep і т.д.)
```

На відміну від `Object.keys()`/`values()`/`entries()`, `Object.assign()` копіює не лише рядкові, а й symbol-ключі — головне, щоб властивість була власною (own) і перелічуваною (enumerable).

```js
const symKey = Symbol("id");
const sourceWithSymbol = { [symKey]: 123, regular: "regular property" };
const targetWithSymbol = Object.assign({}, sourceWithSymbol);
console.log(targetWithSymbol[symKey]); // 123 — символ теж скопійований

// успадковані та non-enumerable властивості не копіюються:
const protoSource = { fromProto: "from prototype" };
const ownSource = Object.create(protoSource);
ownSource.own = "own value";
console.log(Object.assign({}, ownSource)); // { own: "own value" } — без fromProto
```

`Object.assign()` використовує звичайне присвоєння через `[[Set]]` — тобто якщо в джерелі є геттер, він буде викликаний, щоб отримати значення, а якщо в `target` є сеттер з тим самим ім'ям — спрацює він. Результат — завжди звичайна дана властивість (data property) в `target`, геттери/сеттери самого `source` в `target` не переносяться як геттери.

```js
const sourceWithGetter = {
  get computed() {
    console.log("getter called");
    return 42;
  },
};
const plainResult = Object.assign({}, sourceWithGetter);
console.log(plainResult); // { computed: 42 } — вже звичайне значення, не геттер

// пропускає null / undefined серед джерел (але не target):
console.log(Object.assign({}, null, { a: 1 }, undefined)); // { a: 1 }
// Object.assign(null, { a: 1 }); // TypeError: Cannot convert undefined or null to object

// примітиви як джерела: обгортаються у Wrapper-об'єкт
console.log(Object.assign({}, "abc")); // { 0: "a", 1: "b", 2: "c" }

// типові застосування: злиття конфігів/опцій з дефолтними значеннями
function createConfig(userOptions) {
  const defaults = { theme: "light", fontSize: 14 };
  return Object.assign({}, defaults, userOptions);
}
console.log(createConfig({ fontSize: 18 })); // { theme: "light", fontSize: 18 }

// додавання властивостей до this всередині конструктора/методу:
class Widget {
  constructor(options) {
    Object.assign(this, { visible: true }, options);
  }
}
console.log(new Widget({ label: "OK" })); // Widget { visible: true, label: "OK" }
```

Порівняння зі spread-оператором `{ ...obj }`: object spread (ES2018) робить те саме, що `Object.assign({}, obj)`, але це синтаксична конструкція, а не виклик функції, і вона завжди створює новий об'єкт (не можна «мутувати» існуючий target).

```js
const spreadMerge = { ...{ a: 1 }, ...{ b: 2 } };
const assignMerge = Object.assign({}, { a: 1 }, { b: 2 });
console.log(spreadMerge, assignMerge); // однаковий результат: { a: 1, b: 2 }
```

Ключова відмінність: `Object.assign()` може мутувати переданий `target`, spread — ніколи (завжди новий об'єкт). У сучасному коді для злиття/клонування частіше обирають spread саме через це.

### Підсумок Object.assign()

- Копіює власні enumerable властивості (включно з symbol-ключами) з джерел у `target` і повертає мутований `target`.
- `Object.assign({}, ...)` — спосіб отримати новий об'єкт без мутації джерел.
- При кількох джерелах пізніші перезаписують однойменні властивості.
- Це shallow copy — вкладені об'єкти копіюються за посиланням.
- Викликає геттери джерела; в `target` записує звичайні значення.
- `null`/`undefined` серед джерел ігноруються, як `target` — кидають `TypeError`.
- Типове застосування: злиття опцій/конфігів, розширення `this`.
- Сучасна альтернатива для клонування/злиття — spread `{ ...obj }`.

## 7. Object.defineProperty()

`Object.defineProperty(obj, propName, descriptor)` визначає (або змінює) одну властивість об'єкта, даючи повний контроль над її поведінкою через «дескриптор властивості» — об'єкт з налаштуваннями. Повертає той самий `obj` (мутований).

```js
const preciseObj = {};
Object.defineProperty(preciseObj, "id", {
  value: 1,
  writable: false,
  enumerable: true,
  configurable: false,
});
console.log(preciseObj.id); // 1
```

Звичайне `obj.prop = value` створює властивість з «гостинними» дефолтами: `writable`, `enumerable`, `configurable` — усі `true`. `Object.defineProperty()` дозволяє явно вказати кожен з цих прапорців (flags), і якщо не вказати — за замовчуванням вони `false`.

```js
const plainAssign = {};
plainAssign.a = 1; // writable: true, enumerable: true, configurable: true

const viaDefineProperty = {};
Object.defineProperty(viaDefineProperty, "a", { value: 1 });
// тут writable/enumerable/configurable — усі false за замовчуванням!
console.log(Object.keys(viaDefineProperty)); // [] — властивість не enumerable
viaDefineProperty.a = 999; // мовчки ігнорується (writable: false)
console.log(viaDefineProperty.a); // 1
```

Дескриптор буває одного з двох видів — не можна змішувати `value`/`writable` з `get`/`set` в одному дескрипторі.

**Data descriptor** (звичайна властивість зі значенням): `value` — саме значення властивості (за замовчуванням `undefined`); `writable` — чи можна змінити value через звичайне присвоєння (default: `false`); `enumerable` — чи властивість з'являється в `for...in`, `Object.keys()` і т. д. (default: `false`); `configurable` — чи можна видалити властивість або змінити її дескриптор пізніше (default: `false`).

```js
Object.defineProperty(preciseObj, "readOnlyValue", {
  value: "cannot be changed",
  writable: false,
  enumerable: true,
  configurable: true,
});
```

**Accessor descriptor** (геттер/сеттер): `get` — функція, яка викликається при читанні властивості; `set` — функція, яка викликається при записі властивості; `enumerable`/`configurable` — ті самі прапорці, що й вище.

```js
const accessorObj = {};
let _internalValue = 0;
Object.defineProperty(accessorObj, "value", {
  get() {
    console.log("reading value");
    return _internalValue;
  },
  set(newValue) {
    console.log("writing value =", newValue);
    _internalValue = newValue;
  },
  enumerable: true,
  configurable: true,
});
accessorObj.value = 10; // "writing value = 10"
console.log(accessorObj.value); // "reading value" → 10
```

`writable: false` — захист від перезапису значення:

```js
const frozenValueObj = {};
Object.defineProperty(frozenValueObj, "version", {
  value: "1.0.0",
  writable: false,
  enumerable: true,
  configurable: true,
});
frozenValueObj.version = "2.0.0"; // у нестрогому режимі — мовчки ігнорується
console.log(frozenValueObj.version); // "1.0.0"

// у суворому режимі (strict mode / модулі / класи) така спроба
// кидає TypeError замість мовчазного ігнорування:
(function () {
  "use strict";
  try {
    frozenValueObj.version = "3.0.0";
  } catch (e) {
    console.log(e.message); // "Cannot assign to read only property 'version'..."
  }
})();
```

`enumerable: false` — приховати властивість від ітерацій. Класичний прийом для «службових» полів, які повинні існувати на об'єкті, але не повинні «засмічувати» `JSON.stringify`, `Object.keys/values/entries`, `for...in`, spread `{...obj}`.

```js
const objWithHiddenId = { name: "product" };
Object.defineProperty(objWithHiddenId, "_internalId", {
  value: "uuid-123",
  writable: true,
  enumerable: false,
  configurable: true,
});
console.log(Object.keys(objWithHiddenId)); // ["name"] — _internalId прихована
console.log(objWithHiddenId._internalId); // "uuid-123" — але доступ напряму працює
console.log(JSON.stringify(objWithHiddenId)); // {"name":"product"} — теж прихована
console.log({ ...objWithHiddenId }); // { name: "product" } — spread теж не бачить
```

`configurable: false` — захист від видалення і перевизначення. Якщо `configurable: false`, то `delete obj.prop` не спрацює (мовчки або з `TypeError` у strict mode); повторний виклик `Object.defineProperty` на цій властивості кине `TypeError`, якщо намагається змінити щось окрім `value` (за умови, що `writable` вже `true`) — тобто `configurable: false` «замикає» структуру властивості майже назавжди.

```js
const lockedProp = {};
Object.defineProperty(lockedProp, "locked", {
  value: "cannot be deleted or reconfigured",
  writable: true,
  enumerable: true,
  configurable: false,
});
delete lockedProp.locked; // не спрацює
console.log(lockedProp.locked); // все ще існує

// Object.defineProperty(lockedProp, "locked", { enumerable: false });
// TypeError: Cannot redefine property: locked
```

Якщо властивість вже існує і `configurable: true`, повторний виклик `Object.defineProperty()` дозволяє змінити її прапорці або значення — при цьому не вказані в новому дескрипторі поля залишаються такими, якими були (а не скидаються на дефолти).

```js
const reconfigurable = { visible: "initially visible" };
Object.defineProperty(reconfigurable, "visible", { enumerable: false });
console.log(Object.keys(reconfigurable)); // [] — тепер прихована
console.log(reconfigurable.visible); // "initially visible" — value не чіпали
```

Щоб побачити поточні прапорці властивості, використовують `Object.getOwnPropertyDescriptor()` (розбираємо окремо нижче):

```js
console.log(Object.getOwnPropertyDescriptor(preciseObj, "id"));
// { value: 1, writable: false, enumerable: true, configurable: false }
```

Типові застосування: створення справжніх приватних/службових полів (`enumerable: false`), обчислюваних (computed) властивостей через `get`/`set`, констант на об'єкті (`writable: false`, `configurable: false`), реалізація патерну «реактивність» (Vue 2 саме так відстежував зміни властивостей — через `Object.defineProperty` з `get`/`set`), валідація значення при записі:

```js
const validatedObj = {};
let _age = 0;
Object.defineProperty(validatedObj, "age", {
  get() {
    return _age;
  },
  set(newAge) {
    if (typeof newAge !== "number" || newAge < 0) {
      throw new RangeError("Age must be a non-negative number");
    }
    _age = newAge;
  },
  enumerable: true,
  configurable: true,
});
validatedObj.age = 25;
console.log(validatedObj.age); // 25
// validatedObj.age = -5; // RangeError: Age must be a non-negative number
```

Порівняння з object literal / звичайним присвоєнням: `obj.prop = value` — просто, але без контролю над `writable`/`enumerable`/`configurable` (усі стають `true` за замовчуванням); `Object.defineProperty(...)` — повний контроль, але прапорці за замовчуванням `false`, якщо їх явно не вказати; клас з `get`/`set` у тілі — синтаксичний цукор над accessor descriptor'ами, декларативніший спосіб зробити те саме.

### Підсумок Object.defineProperty()

- Визначає/змінює одну властивість з повним контролем через дескриптор.
- Дескриптор буває data (`value`/`writable`) або accessor (`get`/`set`) — не можна змішувати в одному виклику.
- Прапорці `writable`/`enumerable`/`configurable` за замовчуванням `false` (на відміну від звичайного присвоєння, де вони всі `true`).
- `writable: false` → заборонено змінювати `value`.
- `enumerable: false` → властивість не видно в `keys`/`values`/`entries`/`for...in`/`JSON.stringify`/spread.
- `configurable: false` → заборонено видаляти й переналаштовувати (окрім зміни `value`, якщо `writable: true`).
- Типове застосування: приховані службові поля, обчислювані властивості, константи на об'єкті, валідація при записі.

## 8. Object.defineProperties()

`Object.defineProperties(obj, descriptorsMap)` — те саме, що й `Object.defineProperty()`, але дозволяє визначити/змінити одразу кілька властивостей за один виклик. Другий аргумент — це об'єкт, де ключі — імена властивостей, а значення — їхні дескриптори. Повертає той самий `obj` (мутований).

```js
const multiPropObj = {};
Object.defineProperties(multiPropObj, {
  id: {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
  },
  name: {
    value: "Product",
    writable: true,
    enumerable: true,
    configurable: true,
  },
});
console.log(multiPropObj); // { id: 1, name: 'Product' }
```

Форма другого аргумента: `{ propName1: descriptor1, propName2: descriptor2, ... }` — кожен `descriptor` за тими самими правилами, що й в `Object.defineProperty()`. Можна змішувати data і accessor дескриптори в одному виклику:

```js
const mixedDescriptorsObj = {};
let _celsius = 0;

Object.defineProperties(mixedDescriptorsObj, {
  // data descriptor
  unit: {
    value: "metric",
    enumerable: true,
    writable: false,
    configurable: false,
  },
  // accessor descriptor
  celsius: {
    get() {
      return _celsius;
    },
    set(value) {
      _celsius = value;
    },
    enumerable: true,
    configurable: true,
  },
  // accessor descriptor, обчислюється на основі іншої властивості
  fahrenheit: {
    get() {
      return _celsius * 1.8 + 32;
    },
    set(value) {
      _celsius = (value - 32) / 1.8;
    },
    enumerable: true,
    configurable: true,
  },
});

mixedDescriptorsObj.celsius = 100;
console.log(mixedDescriptorsObj.fahrenheit); // 212
mixedDescriptorsObj.fahrenheit = 32;
console.log(mixedDescriptorsObj.celsius); // 0
```

Так само, як і `defineProperty()`, можна одразу переналаштувати кілька вже наявних властивостей — наприклад, «заморозити» частину полів об'єкта, зробивши їх non-writable/non-enumerable.

```js
const configObjMulti = { host: "localhost", port: 3000, debug: true };
Object.defineProperties(configObjMulti, {
  host: { writable: false },
  port: { writable: false },
});
configObjMulti.host = "example.com"; // ігнорується (writable: false)
configObjMulti.debug = false; // ок — debug не чіпали
console.log(configObjMulti); // { host: 'localhost', port: 3000, debug: false }
```

Головна відмінність від `Object.defineProperty()`: `Object.defineProperty(obj, "one", descriptor)` → одна властивість; `Object.defineProperties(obj, { one: d1, two: d2 })` → багато властивостей. По суті, `defineProperties()` — це «пакетна» (batch) версія `defineProperty()`, яка внутрішньо викликає `Object.defineProperty()` для кожного ключа переданого дескриптор-об'єкта.

Зв'язок з `Object.getOwnPropertyDescriptors()`: ці два методи — пара, що працює разом (аналогічно `entries()`/`fromEntries()`): `getOwnPropertyDescriptors()` дістає повний набір дескрипторів об'єкта, а `defineProperties()` дозволяє застосувати такий набір до іншого об'єкта. Це дає справжнє клонування об'єкта — з усіма прапорцями й геттерами/сеттерами (на відміну від `Object.assign()`/spread, які «спрощують» геттери до звичайних значень).

```js
const sourceForClone = {
  get computed() {
    return 42;
  },
};
Object.defineProperty(sourceForClone, "hidden", {
  value: "hidden",
  enumerable: false,
});

const properClone = Object.defineProperties({}, Object.getOwnPropertyDescriptors(sourceForClone));
console.log(Object.getOwnPropertyDescriptor(properClone, "computed"));
// { get: [Function: get computed], set: undefined, enumerable: true, configurable: true }
// геттер скопійовано як геттер, а не викликано і "сплющено" у значення
```

Найчастіше застосування: масове визначення обчислюваних (`get`/`set`) властивостей, масове «замороження» кількох конкретних полів об'єкта, точне (deep-structure-aware) клонування об'єкта разом з геттерами/сеттерами та прапорцями через `getOwnPropertyDescriptors()`, створення «публічного API» об'єкта з чіткими правилами доступу до кожного поля за один прохід.

### Підсумок Object.defineProperties()

- Пакетна версія `Object.defineProperty()`: визначає/змінює одразу кілька властивостей за один виклик.
- Другий аргумент — мапа `{ propName: descriptor, ... }`.
- Ті самі правила дескрипторів (data/accessor, дефолти `false`).
- Можна змішувати data і accessor дескриптори в одному виклику.
- У парі з `Object.getOwnPropertyDescriptors()` дає точне клонування об'єкта разом з геттерами/сеттерами і прапорцями.

## 9. Object.getOwnPropertyNames()

`Object.getOwnPropertyNames(obj)` повертає масив рядків — імен усіх власних (own) властивостей об'єкта, включно з non-enumerable, але без symbol-ключів. Це головна відмінність від `Object.keys()`.

```js
const namesDemoObj = { visible: "visible" };
Object.defineProperty(namesDemoObj, "hidden", {
  value: "hidden",
  enumerable: false,
});

console.log(Object.keys(namesDemoObj)); // ["visible"]
console.log(Object.getOwnPropertyNames(namesDemoObj)); // ["visible", "hidden"]
// getOwnPropertyNames() бачить і non-enumerable властивість,
// а Object.keys() — ні
```

Чому це важливо — «повний» список власних рядкових ключів: `Object.keys()` → лише own + enumerable; `Object.getOwnPropertyNames()` → own + enumerable і non-enumerable (але тільки рядкові ключі, без symbol); `Reflect.ownKeys()` → own + enumerable + non-enumerable + symbol-ключі (найповніший варіант).

Порядок ключів — ті самі правила, що й у `Object.keys()`: спочатку integer-like ключі за зростанням, потім рядкові — у порядку додавання (insertion order).

```js
const orderedNamesObj = { b: 1, 2: "two", a: 2, 1: "one" };
console.log(Object.getOwnPropertyNames(orderedNamesObj));
// ["1", "2", "b", "a"]

// масиви: побачити службову властивість "length"
// (у масивів length технічно існує, але вона non-enumerable —
// тому Object.keys() її не показує, а getOwnPropertyNames() — показує)
const arrForNames = ["x", "y", "z"];
console.log(Object.keys(arrForNames)); // ["0", "1", "2"]
console.log(Object.getOwnPropertyNames(arrForNames)); // ["0", "1", "2", "length"]
```

Найчастіше застосування — інтроспекція (обхід без фільтрації): коли треба побачити справжню повну «анатомію» об'єкта — для дебагу, для написання утиліт серіалізації/клонування, для перевірки, чи є на об'єкті службові/приховані поля.

```js
function inspectObject(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    console.log(key, "→", descriptor);
  });
}
inspectObject(namesDemoObj);
// visible → { value: 'visible', writable: true, enumerable: true, configurable: true }
// hidden  → { value: 'hidden', writable: false, enumerable: false, configurable: false }
```

Методи, оголошені в тілі `class`, за специфікацією є non-enumerable — саме тому їх не видно через `Object.keys(instance)` чи `for...in`, але видно через `getOwnPropertyNames()` на прототипі.

```js
class ExampleClass {
  method() {}
}
console.log(Object.keys(ExampleClass.prototype)); // []
console.log(Object.getOwnPropertyNames(ExampleClass.prototype));
// ["constructor", "method"]

// не включає успадковані властивості (як і keys/values/entries):
const protoForNames = { fromProto: "from prototype" };
const ownForNames = Object.create(protoForNames);
ownForNames.own = "own";
console.log(Object.getOwnPropertyNames(ownForNames)); // ["own"]

// "межові" значення:
console.log(Object.getOwnPropertyNames({})); // []
console.log(Object.getOwnPropertyNames("ab")); // ["0", "1", "length"]
// Object.getOwnPropertyNames(null); // TypeError: Cannot convert undefined or null to object

// порівняння зі symbol-версією:
const symKeyForNames = Symbol("meta");
const objWithBoth = { regular: 1, [symKeyForNames]: 2 };
console.log(Object.getOwnPropertyNames(objWithBoth)); // ["regular"] — symbol пропущено
console.log(Reflect.ownKeys(objWithBoth)); // ["regular", Symbol(meta)] — усе разом
```

### Підсумок Object.getOwnPropertyNames()

- Повертає масив усіх власних рядкових ключів — enumerable і non-enumerable.
- Не включає symbol-ключі (для них — `Object.getOwnPropertySymbols()`).
- Не включає успадковані з прототипу властивості.
- Порядок ключів: integer-like за зростанням → рядкові за insertion order.
- Показує «службові» non-enumerable властивості (`length` масиву, методи класу на прототипі тощо) — на відміну від `Object.keys()`.
- Найповніший варіант обходу власних ключів обох типів — `Reflect.ownKeys()`.
- Типове застосування: інтроспекція/дебаг, повний обхід структури об'єкта.

## 10. Object.getOwnPropertySymbols()

`Object.getOwnPropertySymbols(obj)` повертає масив усіх власних (own) symbol-ключів об'єкта. Це «дзеркальна» версія `Object.getOwnPropertyNames()` — але для symbol-ключів замість рядкових. Включає symbol-ключі незалежно від того, enumerable вони чи ні.

```js
const idSymbol = Symbol("id");
const metaSymbol = Symbol("meta");

const objWithSymbols = {
  regular: "regular property",
  [idSymbol]: "id value",
};
Object.defineProperty(objWithSymbols, metaSymbol, {
  value: "meta value",
  enumerable: false,
});

console.log(Object.getOwnPropertySymbols(objWithSymbols));
// [Symbol(id), Symbol(meta)] — обидва symbol-ключі, enumerable і ні
```

Навіщо взагалі потрібні symbol-ключі: `Symbol` — примітивний тип, кожне значення якого унікальне (навіть `Symbol("id") !== Symbol("id")`). Symbol-ключі використовують, щоб додати на об'єкт «приховану» властивість, яка ніколи не перетнеться з рядковим ключем (навіть випадково); реалізувати «напівприватні» внутрішні поля бібліотек; визначити спеціальну поведінку об'єкта через well-known symbols (`Symbol.iterator`, `Symbol.toPrimitive` і т. д.).

Symbol-ключі свідомо виключені зі «звичайних» способів обходу об'єкта — саме тому вони й підходять для приховування:

```js
console.log(Object.keys(objWithSymbols)); // ["regular"]
console.log(Object.values(objWithSymbols)); // ["regular property"]
console.log(Object.entries(objWithSymbols)); // [["regular", "regular property"]]
console.log(Object.getOwnPropertyNames(objWithSymbols)); // ["regular"]
console.log(JSON.stringify(objWithSymbols)); // {"regular":"regular property"}
for (const key in objWithSymbols) {
  console.log("for...in:", key); // лише "regular"
}
console.log({ ...objWithSymbols }); // spread копіює symbol-ключі! (див. нижче)
```

Але symbol-ключі — не приватні (це важливо!): symbol-ключ не дає справжньої приватності — якщо в когось є посилання на сам symbol, він вільно читає і пише властивість. Крім того, `Object.getOwnPropertySymbols()` дозволяє «знайти» всі symbol-ключі об'єкта, навіть не маючи посилання на сам символ.

```js
console.log(objWithSymbols[idSymbol]); // "id value" — прочитати можна легко
```

Справжня приватність у класах — це `#privateField` (hash-поля), вони недоступні навіть через `getOwnPropertySymbols()`.

На відміну від `Object.keys()`/`values()`/`entries()`, spread `{...obj}` і `Object.assign()` переносять enumerable symbol-ключі (адже вони орієнтуються на «own + enumerable», а не на тип ключа):

```js
console.log(Object.getOwnPropertySymbols({ ...objWithSymbols }));
// [Symbol(id)] — idSymbol скопійовано (enumerable: true за замовчуванням),
// а metaSymbol — ні, бо його явно зробили enumerable: false
```

`getOwnPropertySymbols()` покаже і well-known symbols (`Symbol.iterator` тощо), якщо вони визначені безпосередньо на об'єкті (а не успадковані з прототипу):

```js
const iterableObj = {
  items: [1, 2, 3],
  [Symbol.iterator]() {
    let index = 0;
    const items = this.items;
    return {
      next() {
        return index < items.length
          ? { value: items[index++], done: false }
          : { value: undefined, done: true };
      },
    };
  },
};
console.log([...iterableObj]); // [1, 2, 3] — власний Symbol.iterator спрацював
console.log(Object.getOwnPropertySymbols(iterableObj)); // [Symbol(Symbol.iterator)]

// не включає успадковані symbol-ключі (тільки власні):
const protoWithSymbol = { [Symbol("fromProto")]: "from prototype" };
const childOwnSymbols = Object.create(protoWithSymbol);
childOwnSymbols[Symbol("own")] = "own";
console.log(Object.getOwnPropertySymbols(childOwnSymbols).length); // 1 — лише свій

// "межові" значення:
console.log(Object.getOwnPropertySymbols({})); // []
// Object.getOwnPropertySymbols(null); // TypeError: Cannot convert undefined or null to object

// повний обхід: symbols + names разом
function getAllKeys(obj) {
  return [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];
}
console.log(getAllKeys(objWithSymbols)); // ["regular", Symbol(id), Symbol(meta)]
console.log(Reflect.ownKeys(objWithSymbols)); // те саме, одним викликом
```

### Підсумок Object.getOwnPropertySymbols()

- Повертає масив усіх власних symbol-ключів об'єкта.
- Включає їх незалежно від enumerable (на відміну від `keys`/`values`/`entries`).
- Symbol-ключі «невидимі» для `keys`/`values`/`entries`/`for...in`/`JSON.stringify`/`getOwnPropertyNames` — саме тому їх використовують для «прихованих» полів.
- Не дають справжньої приватності — символ можна знайти цим методом і прочитати значення, знаючи посилання на сам symbol.
- Spread `{...obj}` і `Object.assign()` копіюють enumerable symbol-ключі.
- Показує і well-known symbols (`Symbol.iterator` тощо), якщо вони визначені прямо на об'єкті.
- Не включає успадковані symbol-ключі з прототипу.
- Для повного списку всіх ключів (рядкові + symbol) — `Reflect.ownKeys()`.

## 11. Object.getOwnPropertyDescriptor()

`Object.getOwnPropertyDescriptor(obj, propName)` повертає об'єкт-дескриптор однієї конкретної власної (own) властивості — тобто показує, як саме ця властивість налаштована «під капотом». Це логічна протилежність до `Object.defineProperty()`: один метод записує дескриптор, інший — читає його назад.

```js
const descriptorDemoObj = { name: "John" };
console.log(Object.getOwnPropertyDescriptor(descriptorDemoObj, "name"));
// { value: 'John', writable: true, enumerable: true, configurable: true }
// саме такі прапорці отримує властивість при звичайному присвоєнні obj.prop = value
```

Для «звичайної» властивості (не геттера/сеттера) повертається data descriptor з полями: `value`, `writable`, `enumerable`, `configurable`.

```js
const preciseDescObj = {};
Object.defineProperty(preciseDescObj, "version", {
  value: "1.0.0",
  writable: false,
  enumerable: true,
  configurable: false,
});
console.log(Object.getOwnPropertyDescriptor(preciseDescObj, "version"));
// { value: '1.0.0', writable: false, enumerable: true, configurable: false }
```

Для властивості-геттера/сеттера повертається accessor descriptor — з полями `get`, `set` (замість `value`, `writable`). Важливо: `get`/`set` тут — самі функції (посилання), метод не викликає геттер, щоб дізнатись значення.

```js
const accessorDescObj = {
  get computed() {
    return 42;
  },
};
console.log(Object.getOwnPropertyDescriptor(accessorDescObj, "computed"));
// { get: [Function: get computed], set: undefined, enumerable: true, configurable: true }
// зверни увагу: ніякого value тут немає — це вже інший тип дескриптора

function isAccessorProperty(obj, propName) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
  return descriptor !== undefined && ("get" in descriptor || "set" in descriptor);
}
console.log(isAccessorProperty(accessorDescObj, "computed")); // true
console.log(isAccessorProperty(descriptorDemoObj, "name")); // false
```

Метод повертає `undefined`, якщо властивості немає (own) — не кидає помилку, і це стосується і властивостей з прототипу (метод дивиться лише на власні властивості):

```js
console.log(Object.getOwnPropertyDescriptor(descriptorDemoObj, "nonExistent")); // undefined

const protoForDescriptor = { fromProto: "from prototype" };
const ownForDescriptor = Object.create(protoForDescriptor);
console.log(Object.getOwnPropertyDescriptor(ownForDescriptor, "fromProto")); // undefined
// хоча ownForDescriptor.fromProto доступне через прототип,
// дескриптор саме власної властивості з такою назвою відсутній
```

Чому це надійніше, ніж просто читати значення `obj[prop]`: просте звернення `obj.prop` не покаже, чи це геттер і чи має він побічні ефекти при виклику, чи властивість взагалі writable/enumerable/configurable, чи властивість «своя», чи прийшла з прототипу. `getOwnPropertyDescriptor()` дає повну, точну інформацію без побічних ефектів (геттер не викликається під час перевірки).

```js
const loggingGetterObj = {
  get value() {
    console.log("getter called!"); // побічний ефект
    return Math.random();
  },
};
loggingGetterObj.value; // "getter called!" — value прочитано, геттер спрацював
Object.getOwnPropertyDescriptor(loggingGetterObj, "value"); // тихо, без побічних ефектів
```

Найчастіше застосування: перевірка, чи можна безпечно перезаписати/видалити властивість перед тим, як це робити:

```js
function canOverwrite(obj, propName) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
  return descriptor === undefined || (descriptor.writable && descriptor.configurable);
}
console.log(canOverwrite(preciseDescObj, "version")); // false — заморожена
```

Робота з symbol-ключами: `propName` може бути не лише рядком, а й символом — метод однаково працює і для symbol-властивостей.

```js
const symKeyForDescriptor = Symbol("secret");
const objWithSymbolProp = { [symKeyForDescriptor]: "secret value" };
console.log(Object.getOwnPropertyDescriptor(objWithSymbolProp, symKeyForDescriptor));
// { value: 'secret value', writable: true, enumerable: true, configurable: true }

console.log(Object.getOwnPropertyDescriptor({}, "anything")); // undefined
// Object.getOwnPropertyDescriptor(null, "x"); // TypeError: Cannot convert undefined or null to object
```

Порівняння з іншими `getOwnProperty*`-методами: `getOwnPropertyNames(obj)` → усі власні рядкові ключі; `getOwnPropertySymbols(obj)` → усі власні symbol-ключі; `getOwnPropertyDescriptor(obj, key)` → дескриптор однієї конкретної властивості; `getOwnPropertyDescriptors(obj)` → дескриптори усіх власних властивостей одразу (наступний розділ).

### Підсумок Object.getOwnPropertyDescriptor()

- Повертає повний дескриптор однієї власної властивості (або `undefined`).
- Для звичайної властивості: `{ value, writable, enumerable, configurable }`.
- Для геттера/сеттера: `{ get, set, enumerable, configurable }` — без виклику геттера.
- Дивиться лише на власні (own) властивості — з прототипу нічого не бере.
- Не має побічних ефектів (на відміну від `obj.prop`, який викликає геттер).
- Працює і з рядковими, і з symbol-ключами.
- Типове застосування: перевірка writable/configurable перед зміною, написання утиліт клонування/серіалізації, дебаг.

## 12. Object.getOwnPropertyDescriptors()

`Object.getOwnPropertyDescriptors(obj)` повертає об'єкт, де кожен ключ — це ім'я власної (own) властивості вихідного об'єкта, а значення — повний дескриптор цієї властивості. По суті — це «множина» з `Object.getOwnPropertyDescriptor()`, викликаного одразу для кожної власної властивості об'єкта (включно з symbol-ключами та non-enumerable властивостями).

```js
const multiDescObj = { name: "John" };
Object.defineProperty(multiDescObj, "id", {
  value: 1,
  writable: false,
  enumerable: false,
  configurable: false,
});

console.log(Object.getOwnPropertyDescriptors(multiDescObj));
// {
//   name: { value: 'John', writable: true, enumerable: true, configurable: true },
//   id:   { value: 1, writable: false, enumerable: false, configurable: false }
// }
```

Головне застосування: точне (shallow) клонування об'єкта. На відміну від `Object.assign({}, obj)` чи spread `{...obj}`, які «сплющують» геттери/сеттери у звичайні значення (викликаючи їх один раз і копіюючи результат), пара `Object.create()` + `Object.getOwnPropertyDescriptors()` зберігає геттери/сеттери як геттери/сеттери, а також усі прапорці (writable/enumerable/configurable) один-в-один.

```js
const sourceWithGetterSetter = {
  _value: 10,
  get doubled() {
    console.log("doubled getter called");
    return this._value * 2;
  },
  set doubled(v) {
    this._value = v / 2;
  },
};

// "наївне" клонування — геттер втрачається:
const naiveClone = { ...sourceWithGetterSetter };
console.log(Object.getOwnPropertyDescriptor(naiveClone, "doubled"));
// { value: 20, writable: true, enumerable: true, configurable: true } — уже не геттер!

// точне клонування — геттер/сеттер збережено:
const preciseClone = Object.defineProperties({}, Object.getOwnPropertyDescriptors(sourceWithGetterSetter));
console.log(Object.getOwnPropertyDescriptor(preciseClone, "doubled"));
// { get: [Function: get doubled], set: [Function: set doubled], enumerable: true, configurable: true }
preciseClone._value = 5;
console.log(preciseClone.doubled); // "doubled getter called" → 10 (реально перерахувалось)
```

MDN прямо рекомендує саме цю комбінацію з `Object.create()` як «правильний» спосіб поверхневого копіювання об'єкта (на відміну від `Object.assign()`):

```js
function shallowClone(obj) {
  return Object.create(
    Object.getPrototypeOf(obj), // зберігає той самий прототип
    Object.getOwnPropertyDescriptors(obj), // зберігає усі властивості з прапорцями
  );
}
const properShallowClone = shallowClone(sourceWithGetterSetter);
console.log(Object.getPrototypeOf(properShallowClone) === Object.getPrototypeOf(sourceWithGetterSetter)); // true
```

Що тут важливо: це все ще shallow (поверхневе) копіювання. Значення властивостей першого рівня копіюються «як є» — якщо `value` є об'єктом/масивом, у клоні буде те саме посилання, а не глибока копія (аналогічно `Object.assign()`/spread).

```js
const nestedForDescriptors = { info: { age: 30 } };
const shallowClonedNested = Object.create(
  Object.getPrototypeOf(nestedForDescriptors),
  Object.getOwnPropertyDescriptors(nestedForDescriptors),
);
shallowClonedNested.info.age = 99;
console.log(nestedForDescriptors.info.age); // 99 — теж змінилось (спільне посилання)
```

Ще одне типове застосування — коректне додавання методів/геттерів одного об'єкта до іншого (наприклад, реалізація патерну mixin), коли важливо не втратити `get`/`set` поведінку.

```js
const canFlyMixin = {
  fly() {
    return `${this.name} flies`;
  },
};
const canSwimMixin = {
  swim() {
    return `${this.name} swims`;
  },
};

class Duck {
  constructor(name) {
    this.name = name;
  }
}
Object.defineProperties(Duck.prototype, {
  ...Object.getOwnPropertyDescriptors(canFlyMixin),
  ...Object.getOwnPropertyDescriptors(canSwimMixin),
});

const duck = new Duck("Quack");
console.log(duck.fly()); // "Quack flies"
console.log(duck.swim()); // "Quack swims"
```

На відміну від `Object.assign()`/spread (які беруть лише enumerable), `getOwnPropertyDescriptors()` охоплює всі власні властивості — рядкові й symbol, enumerable і ні — тобто це найповніший «знімок» структури об'єкта.

```js
const symKeyForDescriptors = Symbol("meta");
const objForFullSnapshot = { visible: 1, [symKeyForDescriptors]: 2 };
Object.defineProperty(objForFullSnapshot, "hidden", {
  value: 3,
  enumerable: false,
});
console.log(Object.keys(Object.getOwnPropertyDescriptors(objForFullSnapshot)));
// ["visible", "hidden"] — рядкові ключі власного знімка...
console.log(Object.getOwnPropertySymbols(Object.getOwnPropertyDescriptors(objForFullSnapshot)));
// [Symbol(meta)] — ...і symbol-ключ теж присутній у знімку

console.log(Object.getOwnPropertyDescriptors({})); // {}
// Object.getOwnPropertyDescriptors(null); // TypeError: Cannot convert undefined or null to object
```

### Підсумок Object.getOwnPropertyDescriptors()

- Повертає об'єкт `{ propName: descriptor }` для усіх власних властивостей (рядкових і symbol, enumerable і non-enumerable).
- У парі з `Object.defineProperties()`/`Object.create()` дає точне (не «сплющене») поверхневе клонування об'єкта — з геттерами/сеттерами і всіма прапорцями як є.
- На відміну від `Object.assign()`/spread, не викликає геттери й не втрачає accessor-природу властивостей при клонуванні.
- Все ще shallow copy — вкладені об'єкти копіюються за посиланням.
- Зручний для коректної реалізації mixin-патерну.
- Типове застосування: точне клонування об'єктів, mixins, збереження/перенесення повної «структури» властивостей.

## 13. Object.hasOwn()

`Object.hasOwn(obj, propName)` повертає `true`/`false` — чи має `obj` власну (own) властивість з таким ім'ям (рядковим або symbol), незалежно від того, enumerable вона чи ні. Це сучасна (ES2022) заміна для `obj.hasOwnProperty(propName)`.

```js
const hasOwnDemoObj = { name: "John" };
console.log(Object.hasOwn(hasOwnDemoObj, "name")); // true
console.log(Object.hasOwn(hasOwnDemoObj, "toString")); // false — toString з прототипу
```

Чому це заміна для `obj.hasOwnProperty()`: раніше для цієї перевірки використовували метод екземпляра, але він успадковується через прототип, і якщо цей конкретний об'єкт (чи щось у його ланцюжку прототипів) перевизначив `hasOwnProperty` — виклик зламається.

```js
console.log(hasOwnDemoObj.hasOwnProperty("name")); // true — той самий результат

const brokenHasOwnProperty = { hasOwnProperty: "I'm not a function!" };
// brokenHasOwnProperty.hasOwnProperty("x"); // TypeError: hasOwnProperty is not a function
console.log(Object.hasOwn(brokenHasOwnProperty, "hasOwnProperty")); // true — а так усе ок
```

Найбільш класична проблема: `Object.create(null)`. Об'єкти без прототипу (створені через `Object.create(null)`) взагалі не мають методу `hasOwnProperty` — виклик `obj.hasOwnProperty()` кине `TypeError`. `Object.hasOwn()` — це статичний метод, тому він працює для будь-якого об'єкта, незалежно від його прототипу.

```js
const dictObj = Object.create(null);
dictObj.key = "value";
// dictObj.hasOwnProperty("key"); // TypeError: dictObj.hasOwnProperty is not a function
console.log(Object.hasOwn(dictObj, "key")); // true — працює завжди
```

До появи `Object.hasOwn()` (ES2022) «безпечним» способом вважали виклик `hasOwnProperty` напряму з `Object.prototype` через `.call()`:

```js
console.log(Object.prototype.hasOwnProperty.call(dictObj, "key")); // true
// Object.hasOwn(dictObj, "key") робить те саме, але коротше й читабельніше
```

`Object.hasOwn()` перевіряє сам факт існування властивості, а не те, чи її значення «порожнє». Це критична відмінність від перевірки типу `if (obj.prop)` чи `if (obj.prop !== undefined)`.

```js
const objWithFalsyValues = {
  zero: 0,
  emptyString: "",
  explicitUndefined: undefined,
  isFalse: false,
};

console.log(Object.hasOwn(objWithFalsyValues, "zero")); // true — властивість існує
console.log(objWithFalsyValues.zero ? "yes" : "no"); // "no" — 0 хибне (falsy)!

console.log(Object.hasOwn(objWithFalsyValues, "explicitUndefined")); // true — властивість існує
console.log(objWithFalsyValues.explicitUndefined !== undefined); // false — а значення дійсно undefined

console.log(Object.hasOwn(objWithFalsyValues, "neverDeclared")); // false — а цієї властивості взагалі немає
console.log(objWithFalsyValues.neverDeclared !== undefined); // false — той самий результат, що й вище!
// ^ саме тому перевірка "!== undefined" ненадійна — вона не розрізняє
// "властивості немає" від "властивість є, але дорівнює undefined"
```

Відрізняє «власну» від «успадкованої» — на відміну від `in`: оператор `in` перевіряє наявність властивості в усьому ланцюжку прототипів (включно з успадкованими), а `Object.hasOwn()` — тільки власні (own) властивості самого об'єкта.

```js
const protoForHasOwn = { fromProto: "from prototype" };
const ownForHasOwn = Object.create(protoForHasOwn);
ownForHasOwn.own = "own";

console.log("fromProto" in ownForHasOwn); // true — `in` бачить прототип
console.log(Object.hasOwn(ownForHasOwn, "fromProto")); // false — а hasOwn — ні
console.log(Object.hasOwn(ownForHasOwn, "own")); // true
```

Так само, як і `hasOwnProperty()`, `Object.hasOwn()` бачить non-enumerable властивості (на відміну від `Object.keys()` чи `for...in`) і працює з symbol-ключами.

```js
const hiddenPropObj = {};
Object.defineProperty(hiddenPropObj, "secret", {
  value: 42,
  enumerable: false,
});
console.log(Object.hasOwn(hiddenPropObj, "secret")); // true — навіть прихована

const symKeyForHasOwn = Symbol("id");
const objWithSymbolForHasOwn = { [symKeyForHasOwn]: 1 };
console.log(Object.hasOwn(objWithSymbolForHasOwn, symKeyForHasOwn)); // true
```

Найчастіше застосування: безпечна перевірка наявності ключа перед зверненням до нього (особливо для об'єктів невідомого/динамічного походження, як JSON-відповіді з API):

```js
function getStatusMessage(response) {
  if (Object.hasOwn(response, "error")) {
    return `Error: ${response.error}`;
  }
  return "OK";
}
console.log(getStatusMessage({ error: "Not found" })); // "Error: Not found"
console.log(getStatusMessage({ data: [] })); // "OK"

// фільтрація ключів у циклі for...in (щоб не зачепити успадковані):
for (const key in ownForHasOwn) {
  if (Object.hasOwn(ownForHasOwn, key)) {
    console.log("own property for...in:", key); // лише "own"
  }
}

console.log(Object.hasOwn({}, "anything")); // false
// Object.hasOwn(null, "x"); // TypeError: Cannot convert undefined or null to object
```

Порівняння способів перевірки наявності властивості: `Object.hasOwn(obj, key)` → власна властивість, будь-який об'єкт (рекомендовано); `obj.hasOwnProperty(key)` → власна властивість, але ламається на `Object.create(null)` чи перевизначеному `hasOwnProperty`; `key in obj` → власна + успадкована властивість; `obj[key] !== undefined` → ненадійно: плутає «немає властивості» з «властивість дорівнює `undefined`».

### Підсумок Object.hasOwn()

- Сучасний (ES2022), безпечний спосіб перевірити, чи `obj` має власну властивість `key`.
- Працює для будь-якого об'єкта, включно з `Object.create(null)` (на відміну від `obj.hasOwnProperty()`, який там впаде з `TypeError`).
- Перевіряє факт існування властивості, а не «правдивість» значення — надійніше, ніж `obj.prop` чи `obj.prop !== undefined`.
- Не бачить успадковані властивості (на відміну від оператора `in`).
- Бачить non-enumerable властивості й symbol-ключі.
- Рекомендований сучасний стандарт замість `obj.hasOwnProperty()`.

## 14. Object.getPrototypeOf()

`Object.getPrototypeOf(obj)` повертає прототип переданого об'єкта — тобто той об'єкт, з якого `obj` успадковує властивості й методи через ланцюжок прототипів (`[[Prototype]]`/`__proto__`).

```js
const plainProtoObj = {};
console.log(Object.getPrototypeOf(plainProtoObj) === Object.prototype); // true
// звичайний object literal завжди успадковує від Object.prototype
```

Що таке «прототип» насправді: кожен об'єкт у JS має внутрішній слот `[[Prototype]]` — посилання на інший об'єкт (або `null`). Коли рушій шукає властивість, якої немає у самого об'єкта, він іде по ланцюжку `[[Prototype]]` — саме так, наприклад, `obj.toString()` працює навіть якщо ти сам ніколи не визначав `toString` на `obj`.

```js
console.log(plainProtoObj.toString); // [Function: toString] — знайдено через прототип
console.log(Object.hasOwn(plainProtoObj, "toString")); // false — це не власна властивість
```

Зв'язок з конкретними способами створення об'єкта:

```js
// а) object literal / new Object() → прототип: Object.prototype
console.log(Object.getPrototypeOf({}) === Object.prototype); // true

// б) масив → прототип: Array.prototype (а вже його прототип — Object.prototype)
console.log(Object.getPrototypeOf([]) === Array.prototype); // true
console.log(Object.getPrototypeOf(Array.prototype) === Object.prototype); // true

// в) Object.create(proto) → прототип: саме той proto, що передали
const customProto = {
  greet() {
    return "Hello!";
  },
};
const createdWithCustomProto = Object.create(customProto);
console.log(Object.getPrototypeOf(createdWithCustomProto) === customProto); // true

// г) Object.create(null) → прототип: null (об'єкт без ланцюжка прототипів)
const noProtoObj = Object.create(null);
console.log(Object.getPrototypeOf(noProtoObj)); // null

// д) function-конструктор / class → прототип: ФункціяКонструктор.prototype
function Animal(name) {
  this.name = name;
}
const dog = new Animal("Rex");
console.log(Object.getPrototypeOf(dog) === Animal.prototype); // true

class CatAnimal {}
const catAnimal = new CatAnimal();
console.log(Object.getPrototypeOf(catAnimal) === CatAnimal.prototype); // true
```

Прототип сам по собі теж є об'єктом і теж має свій прототип — так утворюється ланцюжок, що завершується на `null` (ланцюжок прототипів, prototype chain).

```js
console.log(Object.getPrototypeOf(dog)); // Animal.prototype
console.log(Object.getPrototypeOf(Animal.prototype)); // Object.prototype
console.log(Object.getPrototypeOf(Object.prototype)); // null — кінець ланцюжка

// функція, що проходить весь ланцюжок і виводить його:
function printPrototypeChain(obj) {
  let current = obj;
  let level = 0;
  while (current !== null) {
    console.log("level", level, "→", current.constructor?.name ?? current);
    current = Object.getPrototypeOf(current);
    level++;
  }
}
printPrototypeChain(dog);
// level 0 → Animal      (сам dog, constructor === Animal)
// level 1 → Animal      (Animal.prototype, його власний constructor теж Animal!)
// level 2 → Object      (Object.prototype)
// (далі Object.getPrototypeOf(Object.prototype) === null → цикл завершується)
```

> ⚠️ Легко очікувати лише два рівні («Animal», потім одразу «Object»), але насправді їх три: `Animal.prototype.constructor` вказує на сам `Animal`, тому другий крок ланцюжка теж друкує «Animal», і лише третій крок доходить до `Object.prototype`.

При `extends` прототип дочірнього класу вказує на прототип батьківського — саме так дочірні екземпляри отримують доступ до батьківських методів.

```js
class Bird extends Animal {
  fly() {
    return `${this.name} flies`;
  }
}
const parrot = new Bird("Kiwi");
console.log(Object.getPrototypeOf(Bird.prototype) === Animal.prototype); // true
console.log(parrot instanceof Animal); // true — саме завдяки ланцюжку прототипів
```

`Object.getPrototypeOf()` vs `__proto__`: `__proto__` — це старий (легасі), нестандартизований спочатку геттер/сеттер, який робить те саме, що `getPrototypeOf()`/`setPrototypeOf()`, але через властивість, а не через функцію. Сучасний код повинен використовувати саме статичні методи `Object`, а не `__proto__` — він залишений лише для сумісності зі старим кодом.

```js
console.log(plainProtoObj.__proto__ === Object.getPrototypeOf(plainProtoObj)); // true
// [!] __proto__ вважається застарілим (legacy) — уникай його в новому коді
```

Як це відрізняється від `instanceof`: `instanceof` перевіряє, чи є даний прототип десь у ланцюжку (повертає `true`/`false`), а `getPrototypeOf()` дає доступ до самого об'єкта-прототипу для подальшого аналізу/маніпуляцій.

```js
console.log(dog instanceof Animal); // true — просто перевірка
console.log(Object.getPrototypeOf(dog)); // сам об'єкт Animal.prototype — можна досліджувати
```

Найчастіше застосування: визначення «справжнього типу» об'єкта під час дебагу/логування:

```js
function getConstructorName(obj) {
  const proto = Object.getPrototypeOf(obj);
  return proto?.constructor?.name ?? "no prototype (null)";
}
console.log(getConstructorName(dog)); // "Animal"
console.log(getConstructorName(noProtoObj)); // "no prototype (null)"

console.log(Object.getPrototypeOf("string")); // String.prototype — примітив обгортається
// Object.getPrototypeOf(null); // TypeError: Cannot convert undefined or null to object
```

`Reflect.getPrototypeOf()` робить те саме, але кидає `TypeError`, якщо аргумент — не об'єкт (замість спроби неявно привести примітив до об'єкта). У більшості випадків різниця не критична, Reflect-версію обирають у коді, орієнтованому на метапрограмування (proxy-трапи, рефлексія).

### Підсумок Object.getPrototypeOf()

- Повертає прототип об'єкта — той об'єкт, з якого `obj` успадковує властивості й методи через внутрішній слот `[[Prototype]]`.
- `{}`/`new Object()` → `Object.prototype`; `[]` → `Array.prototype`; `Object.create(proto)` → саме `proto`; `Object.create(null)` → `null`; `new Конструктор()`/`new Клас()` → `Конструктор.prototype`/`Клас.prototype`.
- Прототипи утворюють ланцюжок, що завершується на `null`.
- Сучасна заміна застарілого `obj.__proto__`.
- При `extends` прототип дочірнього класу вказує на прототип батьківського.
- Типове застосування: інтроспекція/дебаг типу об'єкта, точне клонування зі збереженням прототипу, метапрограмування.

## 15. Object.setPrototypeOf()

`Object.setPrototypeOf(obj, prototype)` змінює внутрішній слот `[[Prototype]]` вже існуючого об'єкта — тобто перепризначає, з якого об'єкта `obj` буде успадковувати властивості й методи. Повертає той самий `obj` (мутований).

```js
const baseProto = {
  greet() {
    return `Hello, I'm ${this.name}`;
  },
};

const targetObjForProto = { name: "Igor" };
console.log(targetObjForProto.greet); // undefined — ще немає такого методу

Object.setPrototypeOf(targetObjForProto, baseProto);
console.log(targetObjForProto.greet()); // "Hello, I'm Igor" — тепер метод успадкований
```

Головна відмінність від `Object.create()`: `Object.create(proto)` → створює новий об'єкт одразу з потрібним прототипом; `Object.setPrototypeOf()` → змінює прототип у вже існуючого об'єкта. Якщо прототип відомий заздалегідь — завжди краще `Object.create()`, а не спочатку створювати об'єкт, а потім міняти йому прототип.

Це дуже повільна операція — офіційно не рекомендована: за специфікацією та документацією MDN, зміна прототипу вже існуючого об'єкта — одна з найповільніших операцій у JS-рушіях. Це руйнує внутрішні оптимізації (приховані класи / shapes), які рушій будував для цього об'єкта, і змушує його і всі об'єкти, що успадковують від нього, повторно оптимізуватись. MDN прямо радить: «уникайте зміни `[[Prototype]]` об'єкта в коді, критичному до продуктивності» — використовуйте `Object.create()`.

```js
// повільно / не рекомендовано:
const slowWay = {};
slowWay.name = "an object that already exists and is in use";
Object.setPrototypeOf(slowWay, baseProto); // рушій "ламає" вже готову оптимізацію

// швидко / рекомендовано:
const fastWay = Object.create(baseProto, {
  name: { value: "object created right away with the correct prototype", enumerable: true },
});
```

Так само, як `Object.create(null)`, можна прибрати весь ланцюжок прототипів у вже існуючого об'єкта:

```js
const willLoseMethods = { data: 1 };
console.log(typeof willLoseMethods.toString); // "function" — успадковано з Object.prototype
Object.setPrototypeOf(willLoseMethods, null);
console.log(willLoseMethods.toString); // undefined — прототип прибрано повністю
```

Теоретично можна навіть «перетворити» екземпляр одного класу на екземпляр іншого, підмінивши прототип — хоча на практиці це радше цікавий приклад, ніж рекомендований патерн.

```js
class PetCat {
  speak() {
    return "Meow!";
  }
}
class PetDog {
  speak() {
    return "Woof!";
  }
}

const pet = new PetCat();
console.log(pet.speak()); // "Meow!"
Object.setPrototypeOf(pet, PetDog.prototype);
console.log(pet.speak()); // "Woof!" — той самий об'єкт, інша поведінка
console.log(pet instanceof PetDog); // true
console.log(pet instanceof PetCat); // false — instanceof тепер теж змінився
```

`Object.setPrototypeOf()` vs `__proto__ = value`: присвоєння через застарілий `__proto__` робить те саме, але `Object.setPrototypeOf()` — стандартизований, явний і рекомендований спосіб.

```js
const legacyWay = {};
legacyWay.__proto__ = baseProto; // працює, але вважається застарілим підходом
console.log(legacyWay.greet()); // спрацює так само
```

Коли це все ж виправдано: у бібліотеках/фреймворках, які реалізують наслідування «поверх» уже створених об'єктів (наприклад, поліфіли для старих рушіїв); для динамічної зміни поведінки об'єкта в спеціалізованих сценаріях (плагіни, патерн «стратегія» через прототип); не для звичайного щоденного коду — там завжди краще одразу закласти правильний прототип через `Object.create()`/`class`/`new`.

Якщо об'єкт не extensible (наприклад, після `Object.preventExtensions()`, `Object.seal()` чи `Object.freeze()`) — зміна прототипу кине `TypeError`.

```js
const frozenForProto = Object.freeze({});
// Object.setPrototypeOf(frozenForProto, baseProto);
// TypeError: Cannot set prototype of, object is not extensible

// Object.setPrototypeOf(null, {}); // TypeError: Object.setPrototypeOf called on null or undefined
```

Порівняння `getPrototypeOf()` / `setPrototypeOf()` / `create()`: `Object.getPrototypeOf(obj)` → прочитати поточний прототип; `Object.setPrototypeOf(obj, proto)` → змінити прототип існуючого об'єкта (повільно); `Object.create(proto)` → створити новий об'єкт одразу з потрібним прототипом (швидко).

### Підсумок Object.setPrototypeOf()

- Змінює `[[Prototype]]` вже існуючого об'єкта, повертає той самий `obj`.
- Офіційно не рекомендовано для продуктивного коду — руйнує внутрішні оптимізації рушія (hidden classes), працює повільно.
- Якщо прототип відомий заздалегідь — завжди краще `Object.create()`.
- Можна виставити прототип у `null` (позбавити об'єкт успадкування) або підмінити на прототип іншого класу.
- Сучасна заміна застарілого `obj.__proto__ = value`.
- Кидає `TypeError` на non-extensible об'єктах (frozen/sealed/prevented).
- Виправдане застосування: бібліотеки/поліфіли, динамічна зміна поведінки; не для звичайного щоденного коду.

## 16. Object.freeze()

`Object.freeze(obj)` робить об'єкт повністю незмінним: не можна додавати нові властивості; не можна видаляти існуючі властивості; не можна змінювати значення існуючих властивостей; не можна змінювати дескриптори властивостей (writable/enumerable/configurable) — усі стають `configurable: false`, а data-властивості ще й `writable: false`. Повертає той самий об'єкт (мутований), не копію.

```js
const frozenObj = Object.freeze({ name: "John", age: 30 });
frozenObj.age = 99; // ігнорується мовчки (нестрогий режим)
frozenObj.city = "Kyiv"; // теж ігнорується — не можна додати нову властивість
delete frozenObj.name; // теж ігнорується — не можна видалити
console.log(frozenObj); // { name: "John", age: 30 } — без жодних змін

// у строгому режимі будь-яка з цих спроб кидає TypeError:
(function () {
  "use strict";
  try {
    frozenObj.age = 100;
  } catch (e) {
    console.log(e.message); // "Cannot assign to read only property 'age' of object..."
  }
})();
```

`Object.isFrozen()` — перевірка, чи об'єкт заморожений:

```js
console.log(Object.isFrozen(frozenObj)); // true
console.log(Object.isFrozen({})); // false — звичайний об'єкт не заморожений
```

Це shallow freeze (поверхневе заморожування) — класична пастка: `freeze()` блокує лише властивості першого рівня. Якщо значення властивості — вкладений об'єкт/масив, його можна змінювати як завгодно — `freeze()` на нього не поширюється.

```js
const shallowFrozenObj = Object.freeze({
  name: "Product",
  meta: { price: 100 },
});
shallowFrozenObj.meta.price = 999; // працює! meta — окремий об'єкт, не заморожений
console.log(shallowFrozenObj.meta.price); // 999
console.log(Object.isFrozen(shallowFrozenObj.meta)); // false — вкладений об'єкт вільний
```

У самій мові немає вбудованого «deepFreeze» — його пишуть рекурсивно самостійно (або беруть з бібліотеки):

```js
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value !== null && (typeof value === "object" || typeof value === "function")) {
      deepFreeze(value); // рекурсивно заморожуємо вкладені об'єкти
    }
  });
  return Object.freeze(obj);
}

const deepFrozenObj = deepFreeze({
  name: "Product",
  meta: { price: 100 },
});
deepFrozenObj.meta.price = 999; // тепер ігнорується — meta теж заморожена
console.log(deepFrozenObj.meta.price); // 100
console.log(Object.isFrozen(deepFrozenObj.meta)); // true
```

Дуже поширена плутанина: `const` захищає лише binding (не можна переприсвоїти саму змінну), а `freeze()` захищає значення об'єкта (не можна змінити його вміст). Це дві різні, незалежні речі.

```js
const notActuallyImmutable = { count: 0 };
notActuallyImmutable.count = 1; // працює — const не захищає вміст об'єкта
console.log(notActuallyImmutable.count); // 1

const trulyFrozen = Object.freeze({ count: 0 });
trulyFrozen.count = 1; // не працює — freeze захищає саме вміст
console.log(trulyFrozen.count); // 0

// найнадійніший захист — комбінація обох:
const constAndFrozen = Object.freeze({ count: 0 });
// тепер ні binding (const), ні вміст (freeze) змінити не можна
```

Що саме відбувається з дескрипторами після `freeze()`:

```js
console.log(Object.getOwnPropertyDescriptor(frozenObj, "age"));
// { value: 30, writable: false, enumerable: true, configurable: false }
// enumerable залишається таким, яким був — freeze() його не чіпає,
// міняються лише writable (→ false) і configurable (→ false)
```

Заморожений масив теж не можна мутувати мутуючими методами — але деякі методи, що не змінюють оригінал (`map`, `filter`, `slice`), продовжують працювати, бо вони повертають новий масив.

```js
const frozenArr = Object.freeze([1, 2, 3]);
// frozenArr.push(4);  // TypeError у strict mode: Cannot add property 3, object is not extensible
console.log(frozenArr.map((n) => n * 2)); // [2, 4, 6] — це ок, map створює новий масив
```

Якщо властивість — геттер/сеттер: `freeze()` робить accessor-властивість `configurable: false`, але самі `get`/`set` функції `freeze()` не зупиняє — сеттер, якщо він є, продовжує виконуватись (freeze не забороняє логіку всередині `set`).

```js
let internalCounter = 0;
const objWithSetterFrozen = Object.freeze({
  get counter() {
    return internalCounter;
  },
  set counter(value) {
    internalCounter = value; // freeze не блокує сам сеттер
  },
});
objWithSetterFrozen.counter = 5;
console.log(objWithSetterFrozen.counter); // 5 — сеттер спрацював попри freeze()
```

Найчастіше застосування — створення справжніх констант-конфігів/enum'ів:

```js
const Colors = Object.freeze({
  RED: "red",
  GREEN: "green",
  BLUE: "blue",
});
// Colors.RED = "purple"; // не спрацює — Colors справді незмінний
```

А також: захист публічного стану бібліотеки/модуля від випадкових мутацій ззовні (наприклад, конфігурація за замовчуванням); immutable-патерни у стані застосунку (спрощений варіант того, що робить Immutable.js чи Redux Toolkit «під капотом» з Immer).

Порівняння з іншими рівнями обмеження (seal/preventExtensions): `Object.preventExtensions(obj)` → лише забороняє додавання нових властивостей; `Object.seal(obj)` → + забороняє видалення (але значення міняти можна); `Object.freeze(obj)` → + забороняє зміну значень (найсуворіший рівень). Кожен наступний рівень — це «надбудова» над попереднім (детально в розділі 17 нижче).

### Підсумок Object.freeze()

- `Object.freeze()` — найсуворіший рівень захисту об'єкта: заборонено додавати, видаляти й змінювати властивості.
- `Object.isFrozen(obj)` перевіряє, чи об'єкт заморожений.
- Це shallow freeze — вкладені об'єкти не захищені автоматично, для цього потрібна рекурсивна `deepFreeze()`.
- `const` захищає binding змінної, `freeze()` захищає вміст об'єкта — це різні, незалежні механізми.
- У strict mode спроба зміни кидає `TypeError`, у нестрогому — мовчки ігнорується.
- Геттери/сеттери продовжують працювати навіть на замороженому об'єкті.
- Типове застосування: константи/enum'и, захист конфігів, immutable-стан.

## 17. Object.seal() / Object.preventExtensions()

`Object.seal(obj)` забороняє додавати нові властивості й видаляти існуючі (робить усі властивості `configurable: false`), але, на відміну від `freeze()`, значення вже існуючих властивостей міняти можна (`writable` залишається таким, яким був).

```js
const sealedObj = Object.seal({ name: "John", age: 30 });
sealedObj.age = 31; // працює — значення можна змінювати
sealedObj.city = "Kyiv"; // ігнорується — не можна додати нову властивість
delete sealedObj.name; // ігнорується — не можна видалити
console.log(sealedObj); // { name: "John", age: 31 }

// Object.isSealed() — перевірка:
console.log(Object.isSealed(sealedObj)); // true
console.log(Object.isSealed({})); // false
// кожен frozen-об'єкт автоматично є і sealed (freeze — суворіший рівень):
console.log(Object.isSealed(Object.freeze({}))); // true

// що відбувається з дескрипторами:
console.log(Object.getOwnPropertyDescriptor(sealedObj, "age"));
// { value: 31, writable: true, enumerable: true, configurable: false }
// на відміну від freeze(): writable залишився true
```

Найм'якший рівень обмеження — `Object.preventExtensions()`: забороняє лише додавання нових властивостей. Існуючі властивості й далі можна міняти і видаляти.

```js
const nonExtensibleObj = Object.preventExtensions({ name: "John", age: 30 });
nonExtensibleObj.age = 31; // працює
delete nonExtensibleObj.name; // працює — видалення дозволене
nonExtensibleObj.city = "Kyiv"; // ігнорується — нову властивість не додати
console.log(nonExtensibleObj); // { age: 31 }

// Object.isExtensible() — перевірка:
console.log(Object.isExtensible(nonExtensibleObj)); // false
console.log(Object.isExtensible({})); // true — звичайний об'єкт розширюваний
// sealed і frozen об'єкти теж non-extensible (це найслабша умова із трьох):
console.log(Object.isExtensible(Object.seal({}))); // false
console.log(Object.isExtensible(Object.freeze({}))); // false
```

Порівняльна таблиця трьох рівнів обмеження:

| Рівень | додати нову | видалити | змінити значення |
|---|---|---|---|
| `preventExtensions()` | ✗ | ✓ | ✓ |
| `seal()` | ✗ | ✗ | ✓ |
| `freeze()` | ✗ | ✗ | ✗ |

Кожен наступний рівень включає в себе обмеження попереднього: frozen ⊂ sealed ⊂ non-extensible (усі sealed є non-extensible, усі frozen є sealed).

Як «зняти» ці обмеження — ніяк. У стандартному JS немає способу «розморозити» чи «розпечатати» об'єкт назад — ці операції односторонні. Єдиний вихід — створити новий об'єкт (наприклад, через spread `{...obj}`) з тими самими даними, але вже без обмежень.

```js
const unlockedCopy = { ...sealedObj }; // новий, звичайний, розширюваний об'єкт
console.log(Object.isSealed(unlockedCopy)); // false
```

Усі три — теж shallow (не поширюються на вкладені об'єкти):

```js
const shallowSealed = Object.seal({ meta: { price: 100 } });
shallowSealed.meta.price = 999; // працює — meta не запечатана
console.log(shallowSealed.meta.price); // 999
```

## 18. Object.is()

`Object.is(value1, value2)` порівнює два значення за принципом SameValue-алгоритму — це схоже на `===` (strict equality), але з двома важливими винятками.

```js
console.log(Object.is(1, 1)); // true — як і ===
console.log(Object.is("a", "a")); // true
console.log(Object.is({}, {})); // false — різні посилання, як і ===
```

Відмінність №1: `NaN`. `===` вважає `NaN` не рівним самому собі (єдине значення в JS з такою властивістю), а `Object.is()` коректно визначає `NaN` як рівний `NaN`.

```js
console.log(NaN === NaN); // false — класична пастка
console.log(Object.is(NaN, NaN)); // true — Object.is() тут точніший
```

Відмінність №2: `+0` та `-0`. `===` вважає `+0` і `-0` однаковими, а `Object.is()` їх розрізняє (математично й за специфікацією IEEE 754 це різні значення).

```js
console.log(0 === -0); // true
console.log(Object.is(0, -0)); // false — Object.is() бачить різницю
console.log(Object.is(-0, -0)); // true
```

Найчастіше застосування — надійна перевірка на `NaN` без хитрощів на кшталт `value !== value`:

```js
function isActuallyNaN(value) {
  return Object.is(value, NaN);
}
console.log(isActuallyNaN(NaN)); // true
```

React та інші бібліотеки використовують SameValue-подібне порівняння у механізмах порівняння пропсів/стану (`memo`, `useState`-сеттери), саме тому корисно розуміти цю відмінність. Для звичайного щоденного порівняння `Object.is()` не замінює `===`: він повільніший і призначений саме для цих «межових» випадків.

## 19. Object.groupBy() (ES2024)

`Object.groupBy(iterable, callback)` групує елементи ітерованої колекції (масиву чи будь-якого iterable) у звичайний об'єкт, де ключі — це результат виклику `callback` для кожного елемента, а значення — масиви елементів, що потрапили в цю групу.

```js
const inventory = [
  { name: "apples", type: "fruit" },
  { name: "carrots", type: "vegetable" },
  { name: "bananas", type: "fruit" },
  { name: "potatoes", type: "vegetable" },
];

const groupedByType = Object.groupBy(inventory, (item) => item.type);
console.log(groupedByType);
// {
//   fruit: [{ name: "apples", ... }, { name: "bananas", ... }],
//   vegetable: [{ name: "carrots", ... }, { name: "potatoes", ... }]
// }
```

Callback отримує (елемент, індекс) — як у `map`/`filter`:

```js
const numbersToGroup = [1, 2, 3, 4, 5, 6];
const groupedByParity = Object.groupBy(numbersToGroup, (num) => (num % 2 === 0 ? "even" : "odd"));
console.log(groupedByParity); // { odd: [1, 3, 5], even: [2, 4, 6] }

const groupedByIndex = Object.groupBy(["a", "b", "c"], (_, index) => (index < 2 ? "first" : "rest"));
console.log(groupedByIndex); // { first: ["a", "b"], rest: ["c"] }
```

Результат — об'єкт без прототипу (`Object.create(null)`). Це навмисно зроблено, щоб ключі групування (наприклад, `"toString"` чи `"constructor"`) не конфліктували зі спадкованими властивостями.

```js
console.log(Object.getPrototypeOf(groupedByType)); // null
console.log(Object.hasOwn(groupedByType, "fruit")); // true — перевіряти варто саме так
```

До ES2024 це робили вручну через `reduce()`:

```js
function groupByManual(array, callback) {
  return array.reduce((acc, item, index) => {
    const key = callback(item, index);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
console.log(groupByManual(numbersToGroup, (num) => (num % 2 === 0 ? "even" : "odd")));
// той самий результат, що й Object.groupBy(), але без null-прототипу
```

`Map.groupBy()` — «сестра» для групування в `Map`: якщо ключами групування можуть бути не лише рядки/символи (наприклад, об'єкти чи числа, де важлива саме ідентичність ключа), поруч є статичний метод `Map.groupBy()` з тим самим API, але результат — `Map` замість звичайного об'єкта ([Map.md](../Map/Map.md)).

```js
const groupedIntoMap = Map.groupBy(numbersToGroup, (num) => (num % 2 === 0 ? "even" : "odd"));
console.log(groupedIntoMap instanceof Map); // true
console.log(groupedIntoMap.get("even")); // [2, 4, 6]
```

## 20. Методи екземпляра (через Object.prototype)

`obj.hasOwnProperty(key)` перевіряє, чи `obj` має власну властивість `key` (без успадкованих). Сучасна рекомендована заміна — статичний `Object.hasOwn(obj, key)` (розділ 13) — саме через проблеми з `Object.create(null)` і можливістю перевизначення цього методу.

```js
console.log({ a: 1 }.hasOwnProperty("a")); // true
```

`obj.isPrototypeOf(otherObj)` перевіряє, чи `obj` знаходиться у ланцюжку прототипів `otherObj` — тобто чи `otherObj` (прямо чи опосередковано) успадковує від `obj`. Це «дзеркальна» перевірка до `instanceof` (яка перевіряє через конструктор, а не через сам об'єкт-прототип).

```js
function Vehicle() {}
const vehicleProto = Vehicle.prototype;
const car = new Vehicle();

console.log(vehicleProto.isPrototypeOf(car)); // true
console.log(car instanceof Vehicle); // true — той самий сенс, інший синтаксис
console.log(Object.prototype.isPrototypeOf(car)); // true — Object.prototype теж у ланцюжку
```

`obj.propertyIsEnumerable(key)` перевіряє, чи власна властивість `key` є enumerable. Для успадкованих властивостей завжди повертає `false`, навіть якщо вони enumerable на самому прототипі.

```js
const enumDemoObj = { visible: 1 };
Object.defineProperty(enumDemoObj, "hidden", { value: 2, enumerable: false });
console.log(enumDemoObj.propertyIsEnumerable("visible")); // true
console.log(enumDemoObj.propertyIsEnumerable("hidden")); // false
console.log(enumDemoObj.propertyIsEnumerable("toString")); // false — не власна властивість
```

`obj.toString()` повертає рядкове представлення об'єкта. Викликається неявно під час приведення до рядка (шаблонні рядки, конкатенація тощо). Дефолтна реалізація з `Object.prototype` повертає `"[object Object]"` — саме тому багато вбудованих типів (`Array`, `Date`, `RegExp`...) перевизначають `toString()` під власні потреби.

```js
console.log({}.toString()); // "[object Object]"
console.log([1, 2, 3].toString()); // "1,2,3" — Array перевизначає toString
console.log(`Value: ${{}}`); // "Value: [object Object]" — неявний виклик

class Money {
  constructor(amount) {
    this.amount = amount;
  }
  toString() {
    return `$${this.amount}`;
  }
}
console.log(`Price: ${new Money(100)}`); // "Price: $100" — власний toString спрацював
```

`obj.toLocaleString()` за замовчуванням робить те саме, що й `toString()`, але призначений для перевизначення під локалізоване форматування (дати, числа, валюта тощо) — саме так це роблять `Number`, `Date`, `Array`.

```js
console.log((1234567.891).toLocaleString("uk-UA")); // "1 234 567,891" — залежно від рушія/локалі
console.log(new Date(2026, 0, 1).toLocaleString("uk-UA")); // локалізована дата й час
```

`obj.valueOf()` повертає примітивне значення об'єкта — викликається неявно під час приведення до числа/арифметичних операцій (тоді як `toString()` викликається для приведення до рядка). Порядок спроб приведення (`ToPrimitive`) залежить від «натяку» (hint): для арифметики спершу пробується `valueOf()`, для рядків — `toString()`.

```js
class Wallet {
  constructor(balance) {
    this.balance = balance;
  }
  valueOf() {
    return this.balance;
  }
}
const wallet1 = new Wallet(100);
const wallet2 = new Wallet(50);
console.log(wallet1 + wallet2); // 150 — valueOf() використано в арифметиці
console.log(wallet1 > wallet2); // true — теж через valueOf()

console.log(new Date(2026, 0, 1).valueOf()); // timestamp у мілісекундах (число)
```

### Підсумок методів екземпляра, seal/preventExtensions/is/groupBy

- `seal()`: заборонити додавання/видалення, значення міняти можна.
- `preventExtensions()`: заборонити лише додавання нових властивостей.
- `freeze()` ⊂ `seal()` ⊂ `preventExtensions()` — кожен рівень суворіший.
- Усі три — shallow, і «зняти» їх назад неможливо (лише новий об'єкт).
- `Object.is()`: як `===`, але коректно розрізняє `NaN` і `+0`/`-0`.
- `Object.groupBy()`: групує iterable у null-прототипний об'єкт `{ ключ: [елементи] }` за результатом колбека; `Map.groupBy()` — те саме в `Map`.
- `hasOwnProperty`/`isPrototypeOf`/`propertyIsEnumerable` — методи інтроспекції власних властивостей і ланцюжка прототипів.
- `toString()`/`toLocaleString()`/`valueOf()` — неявно викликаються рушієм під час приведення об'єкта до рядка/числа (`ToPrimitive`).
