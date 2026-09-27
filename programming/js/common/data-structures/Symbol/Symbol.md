# Symbol — примітивний тип із гарантовано унікальним значенням (ES6)

## 1. Що таке Symbol

`Symbol` — це сьомий примітивний тип у JS (поруч з `string`, `number`, `boolean`, `undefined`, `null`, `bigint`). Кожен виклик `Symbol()` створює унікальне значення — навіть якщо передати той самий опис (description), два symbol ніколи не будуть рівними.

```js
const s1 = Symbol();
const s2 = Symbol();
console.log(s1 === s2); // false — кожен symbol унікальний за визначенням
console.log(typeof s1); // "symbol"

const symbolA = Symbol("debug description");
const symbolB = Symbol("debug description");
console.log(symbolA === symbolB); // false — description не впливає на унікальність!
```

## 2. Навіщо Symbol, і чому description — лише для людей

Рядок, переданий у `Symbol("опис")`, використовується виключно для читабельності в дебазі/логах — він не є ідентифікатором і не впливає на порівняння чи пошук symbol.

```js
const idSymbol = Symbol("user id");
console.log(idSymbol.toString()); // "Symbol(user id)"
console.log(idSymbol.description); // "user id" — властивість для читання опису (ES2019)

const noDescSymbol = Symbol();
console.log(noDescSymbol.description); // undefined — опис не задавали
```

## 3. Symbol() — без new!

На відміну від інших «обгорткових» типів (`Number`, `String`, `Boolean`), `Symbol` не можна створити через `new` — це навмисне обмеження.

```js
// const wrongSymbol = new Symbol(); // TypeError: Symbol is not a constructor
const correctSymbol = Symbol("correct, without new");
```

## 4. Symbol як ключ об'єкта — гарантія від колізій

```js
const uniqueKey = Symbol("id");
const objWithSymbolKey = {
  name: "John",
  [uniqueKey]: "unique value",
};
console.log(objWithSymbolKey[uniqueKey]); // "unique value"
console.log(objWithSymbolKey); // { name: 'John', Symbol(id): 'unique value' }
```

Головна перевага: два symbol з однаковим description ніколи не конфліктують один з одним, навіть якщо вони прийшли з різних бібліотек, що не знають одна про одну:

```js
const libraryASymbol = Symbol("metadata");
const libraryBSymbol = Symbol("metadata");
const sharedObj = {};
sharedObj[libraryASymbol] = "library A data";
sharedObj[libraryBSymbol] = "library B data";
console.log(sharedObj[libraryASymbol], sharedObj[libraryBSymbol]);
// "library A data" "library B data" — жодного перезапису, хоч ключі виглядають однаково
```

## 5. Symbol-ключі «невидимі» для звичайних способів обходу

Це навмисна поведінка специфікації — symbol-ключі свідомо виключені зі «стандартних» механізмів перебору властивостей:

```js
console.log(Object.keys(objWithSymbolKey)); // ["name"]
console.log(Object.values(objWithSymbolKey)); // ["John"]
console.log(Object.entries(objWithSymbolKey)); // [["name", "John"]]
console.log(Object.getOwnPropertyNames(objWithSymbolKey)); // ["name"]
console.log(JSON.stringify(objWithSymbolKey)); // {"name":"John"}
for (const key in objWithSymbolKey) {
  console.log("for...in:", key); // лише "name"
}

// але symbol-ключі — не приватні! Їх можна знайти, знаючи посилання
// на сам symbol, або через спеціальний метод:
console.log(Object.getOwnPropertySymbols(objWithSymbolKey)); // [Symbol(id)]
console.log(Reflect.ownKeys(objWithSymbolKey)); // ["name", Symbol(id)] — усі ключі разом

// spread {...obj} і Object.assign() копіюють enumerable symbol-ключі
// (детальніше — в common/data-structures/Object/Object.md)
console.log({ ...objWithSymbolKey }[uniqueKey]); // "unique value" — скопійовано
```

## 6. Symbol() vs Symbol.for() — локальні vs глобальні (реєстровані) symbol

`Symbol.for(key)` працює через глобальний реєстр symbol'ів — на відміну від `Symbol()`, повторний виклик з тим самим рядком-ключем повертає один і той самий symbol.

```js
const registeredSymbol1 = Symbol.for("shared.key");
const registeredSymbol2 = Symbol.for("shared.key");
console.log(registeredSymbol1 === registeredSymbol2); // true — той самий symbol з реєстру!

// на відміну від звичайного Symbol("shared.key") — щоразу новий:
console.log(Symbol("shared.key") === Symbol("shared.key")); // false

// Symbol.keyFor(symbol) — зворотна операція: дізнатись реєстраційний
// ключ зареєстрованого symbol (для незареєстрованого — undefined):
console.log(Symbol.keyFor(registeredSymbol1)); // "shared.key"
console.log(Symbol.keyFor(Symbol("not in registry"))); // undefined
```

Коли це потрібно: `Symbol.for()` використовують, коли symbol має бути однаковим у різних частинах застосунку/різних файлах/навіть різних вкладках браузера (глобальний реєстр — спільний на весь JS-рантайм), тоді як звичайний `Symbol()` зазвичай тримають у модульній змінній саме заради ізоляції.

## 7. Well-known symbols — вбудовані symbol, що налаштовують поведінку двигуна

JS сам використовує спеціальні «вбудовані» symbol-ключі (well-known symbols) для налаштування того, як об'єкт поводиться в певних вбудованих механізмах мови. Найважливіші з них:

### 7.1. Symbol.iterator — робить об'єкт ітерованим (iterable)

Дозволяє використовувати `for...of`, spread `{...obj}`/`[...obj]`, деструктуризацію масивів, `Array.from()` тощо для кастомного об'єкта.

```js
const customRange = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

for (const num of customRange) {
  console.log("value from range:", num); // 1, 2, 3, 4, 5
}
console.log([...customRange]); // [1, 2, 3, 4, 5] — spread теж працює завдяки Symbol.iterator

// делегування вже готовому ітератору (найпростіший спосіб зробити
// об'єкт-обгортку ітерованим):
const dataWrapper = {
  data: [10, 20, 30],
  [Symbol.iterator]() {
    return this.data[Symbol.iterator](); // делегуємо ітератору масиву
  },
};
for (const value of dataWrapper) {
  console.log("from wrapper:", value); // 10, 20, 30
}
```

### 7.2. Symbol.toPrimitive — налаштування ToPrimitive-приведення

Дає повний контроль над тим, як об'єкт перетворюється на примітив (замість окремих `toString()`/`valueOf()`) — `hint` підказує контекст приведення: `"number"`, `"string"` або `"default"`.

```js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.amount;
    if (hint === "string") return `${this.amount} ${this.currency}`;
    return `${this.amount} ${this.currency} (default)`; // hint === "default"
  }
}
const price = new Money(100, "USD");
console.log(+price); // 100 — hint: "number"
console.log(`Price: ${price}`); // "Price: 100 USD" — hint: "string"
console.log(price + ""); // "100 USD (default)" — hint: "default"
```

### 7.3. Symbol.toStringTag — налаштування Object.prototype.toString()

Впливає на те, що повертає `Object.prototype.toString.call(obj)` — корисно для власних класів, щоб їх можна було коректно ідентифікувати через цей «надійний» спосіб перевірки типу.

```js
class CustomCollection {
  get [Symbol.toStringTag]() {
    return "CustomCollection";
  }
}
console.log(Object.prototype.toString.call(new CustomCollection())); // "[object CustomCollection]"
console.log(Object.prototype.toString.call([])); // "[object Array]"
console.log(Object.prototype.toString.call(null)); // "[object Null]"
```

### 7.4. Symbol.hasInstance — кастомізація instanceof

```js
class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === "number" && value % 2 === 0;
  }
}
console.log(4 instanceof EvenNumber); // true — навіть попри те, що 4 не створювалось через new
console.log(5 instanceof EvenNumber); // false
```

### 7.5. Інші well-known symbols (коротко)

- `Symbol.asyncIterator` → робить об'єкт асинхронно ітерованим (`for await...of`);
- `Symbol.isConcatSpreadable` → чи «розгортати» об'єкт у `Array.prototype.concat()`;
- `Symbol.species` → який конструктор використовувати для похідних методів вбудованих класів (`map()`, `filter()` тощо);
- `Symbol.unscopables` → які властивості ігнорує застаріла конструкція `with`.

## 8. Symbol не приводиться неявно до рядка

На відміну від решти примітивів, symbol не бере участі в неявному приведенні типів через конкатенацію чи шаблонні рядки — це навмисний захист від випадкових помилок.

```js
const strictSymbol = Symbol("test");
// console.log(`${strictSymbol}`); // TypeError: Cannot convert a Symbol value to a string
// console.log(strictSymbol + ""); // TypeError: Cannot convert a Symbol value to a string
console.log(String(strictSymbol)); // "Symbol(test)" — явне приведення працює
console.log(strictSymbol.toString()); // "Symbol(test)" — так теж можна
```

## 9. Найчастіші застосування Symbol

а) «напівприватні» внутрішні поля бібліотек/фреймворків (перед появою `#privateField` у класах — див. [WeakMap.md](../WeakMap/WeakMap.md) для повноцінного патерну приватності);

б) унікальні «мітки» для розрізнення однотипних об'єктів/подій:

```js
const EventType = {
  CLICK: Symbol("click"),
  HOVER: Symbol("hover"),
};
function handleEvent(type) {
  switch (type) {
    case EventType.CLICK:
      return "click handled";
    case EventType.HOVER:
      return "hover handled";
  }
}
console.log(handleEvent(EventType.CLICK)); // "click handled"
```

в) реалізація enum-подібних констант (гарантована унікальність, на відміну від звичайних рядкових констант, які можуть випадково збігтися з іншим рядком):

```js
const Direction = Object.freeze({
  UP: Symbol("up"),
  DOWN: Symbol("down"),
  LEFT: Symbol("left"),
  RIGHT: Symbol("right"),
});
```

г) кастомізація вбудованої поведінки об'єктів через well-known symbols (ітерованість, приведення типів, `instanceof` — показано вище);

д) додавання метаданих до об'єкта без ризику перезаписати чиюсь «звичайну» властивість (навіть якщо структура об'єкта заздалегідь не відома — наприклад, дані, що прийшли ззовні).

## 10. Symbol vs звичайний рядковий ключ — коли що обирати

| Критерій | Рядковий ключ | Symbol-ключ |
|---|---|---|
| Унікальність | не гарантована | гарантована (окрім `Symbol.for()`) |
| Видимість у keys/entries/JSON | видимий | невидимий (окрім `getOwnPropertySymbols`) |
| Придатність для публічного API | так, очікувано | зазвичай ні (незвично для читання) |
| Придатність для «службових» полів | ризик колізії з даними | безпечно, не конфліктує |
| Кастомізація поведінки двигуна | неможлива | так (well-known symbols) |

## Підсумок

- `Symbol` — примітивний тип, кожне значення якого гарантовано унікальне, навіть при однаковому description.
- Створюється лише через `Symbol()`, без `new`.
- `description` — лише для читабельності дебагу, не впливає на рівність.
- Symbol-ключі об'єкта «невидимі» для `Object.keys`/`values`/`entries`/`for...in`/`JSON.stringify`, але не приватні — видно через `Object.getOwnPropertySymbols()` / `Reflect.ownKeys()`.
- `Symbol.for(key)`/`Symbol.keyFor()` — глобальний реєстр, повертає однаковий symbol для однакового ключа (на відміну від `Symbol()`).
- Well-known symbols (`Symbol.iterator`, `Symbol.toPrimitive`, `Symbol.toStringTag`, `Symbol.hasInstance`...) кастомізують вбудовану поведінку об'єкта — ітерованість, приведення типів, `instanceof`.
- Не приводиться неявно до рядка (конкатенація кине `TypeError`) — потрібне явне `String(symbol)` чи `symbol.toString()`.
- Типове застосування: унікальні «мітки»/enum'и, службові/приховані поля без ризику колізії, кастомізація поведінки об'єктів.
