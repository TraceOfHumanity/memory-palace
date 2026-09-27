# WeakSet — колекція унікальних «слабких» об'єктів (ES6)

## 1. Що таке WeakSet і чим він відрізняється від Set

`WeakSet` — це «родич» `Set` із тими самими трьома обмеженнями, що й у `WeakMap` відносно `Map`:

1. зберігати можна лише об'єкти (і, з ES2023, реєстровані symbol'и через `Symbol.for()`) — жодних чисел, рядків, boolean;
2. посилання на елементи «слабке» (weak reference) — не заважає збирачу сміття (garbage collector) видалити об'єкт;
3. `WeakSet` не iterable — немає `values()`/`keys()`/`entries()`/`forEach()`/`size` — вміст неможливо «перелічити».

```js
const weakSet = new WeakSet();
const obj1 = { id: 1 };
weakSet.add(obj1);
console.log(weakSet.has(obj1)); // true

// weakSet.add("string"); // TypeError: Invalid value used in weak set
```

## 2. Створення WeakSet

```js
// а) порожній WeakSet
const emptyWeakSet = new WeakSet();

// б) WeakSet одразу з даними — приймає будь-який iterable з об'єктів
const objA = {};
const objB = {};
const filledWeakSet = new WeakSet([objA, objB]);
console.log(filledWeakSet.has(objA)); // true
```

На відміну від `Set`, `WeakSet` не можна «подивитись» — скільки в ньому елементів, скопіювати весь вміст чи перебрати його — немає жодного способу отримати повний список (навмисне обмеження, як і в `WeakMap`).

## 3. weakSet.add(obj) — додавання елемента

```js
const visitedNodes = new WeakSet();
const nodeA = {};
visitedNodes.add(nodeA);
visitedNodes.add(nodeA); // повторне додавання того самого об'єкта — нічого не змінює (як і в Set)
console.log(visitedNodes.has(nodeA)); // true

// add() повертає сам WeakSet — можна ланцюжком, як і в Set:
const chainedWeakSet = new WeakSet().add(objA).add(objB);
```

## 4. weakSet.has(obj) — перевірка наявності

```js
console.log(visitedNodes.has(nodeA)); // true
console.log(visitedNodes.has({})); // false — це інший об'єкт у пам'яті

// пошук — за посиланням, а не за "вмістом" об'єкта:
const lookAlike1 = { tag: "same shape" };
const lookAlike2 = { tag: "same shape" };
const shapeWeakSet = new WeakSet([lookAlike1]);
console.log(shapeWeakSet.has(lookAlike2)); // false — не той самий об'єкт, хоч і виглядає однаково
```

## 5. weakSet.delete(obj) — видалення елемента

```js
console.log(visitedNodes.delete(nodeA)); // true — видалено
console.log(visitedNodes.delete({})); // false — такого об'єкта й не було
console.log(visitedNodes.has(nodeA)); // false
```

## 6. Чого в WeakSet немає — і чому саме

Немає: `size`, `values()`, `keys()`, `entries()`, `forEach()`, `for...of`, `clear()`. Причина та сама, що й у `WeakMap`: об'єкт може бути видалений збирачем сміття в будь-який момент, і момент цей не визначений специфікацією — тому ітерація дала б непередбачувані, «різні щоразу» результати, залежні від внутрішньої роботи рушія.

```js
// console.log(visitedNodes.size);      // undefined
// for (const item of visitedNodes) {}  // TypeError: visitedNodes is not iterable
```

## 7. Weak reference на практиці

Коли єдине «звичайне» (сильне) посилання на об'єкт-елемент зникає, об'єкт стає недосяжним для решти коду — і при наступному циклі збирача сміття видаляється з пам'яті разом із записом у `WeakSet`. Це відбувається автоматично, без ручного `delete()`.

```js
let temporaryTask = { title: "temporary task" };
const activeTasks = new WeakSet();
activeTasks.add(temporaryTask);
console.log(activeTasks.has(temporaryTask)); // true

temporaryTask = null;
// у майбутньому (непередбачувано коли саме) garbage collector звільнить
// і сам об'єкт, і відповідний запис у activeTasks — без витоку пам'яті
```

## 8. Головне застосування: «позначення» об'єктів без витоку пам'яті

Типовий сценарій — відстежити, чи об'єкт уже «оброблений», «провалідований», «видимий користувачу» тощо, не додаючи йому власну властивість і не тримаючи об'єкт у пам'яті штучно.

```js
const validatedObjects = new WeakSet();

function validate(obj) {
  if (validatedObjects.has(obj)) {
    console.log("already validated, skipping re-check");
    return true;
  }
  // умовна "дорога" перевірка:
  const isValid = obj && typeof obj === "object";
  if (isValid) validatedObjects.add(obj);
  return isValid;
}

const payload = { data: [1, 2, 3] };
console.log(validate(payload)); // true — перевірено і позначено
console.log(validate(payload)); // "already validated..." → true, повторна перевірка не виконується
```

Коли `payload` стане недосяжним, запис у `validatedObjects` зникне сам собою — на відміну від `Set`, де довелось би вручну викликати `set.delete(payload)`, інакше об'єкт «висів» би в пам'яті назавжди.

## 9. Застосування: захист від повторної ініціалізації (singleton-перевірка)

```js
const initializedInstances = new WeakSet();

class Plugin {
  constructor() {
    if (initializedInstances.has(this)) {
      throw new Error("Plugin already initialized");
    }
    initializedInstances.add(this);
  }
}

const plugin1 = new Plugin(); // ок
// new Plugin() у виклику plugin1.constructor.call(plugin1) кинув би помилку,
// якби хтось спробував "переініціалізувати" той самий екземпляр
```

## 10. Застосування: позначення DOM-елементів (у браузері)

Класичний приклад з реального світу — позначити DOM-елементи, для яких вже навішено обробник подій, щоб не робити цього двічі, не боячись, що `WeakSet` завадить елементу бути видаленим з пам'яті після видалення зі сторінки.

```js
// const elementsWithListener = new WeakSet();
// function attachOnce(element) {
//   if (elementsWithListener.has(element)) return;
//   elementsWithListener.add(element);
//   element.addEventListener("click", () => console.log("click!"));
// }
// коли element видаляється з DOM і на нього більше немає посилань,
// запис у elementsWithListener теж автоматично звільняється
```

## 11. WeakSet vs Set — коли що обирати

| Критерій | Set | WeakSet |
|---|---|---|
| Тип значень | будь-який | лише об'єкти (+ реєстровані symbol) |
| Керування пам'яттю | ручне (`set.delete()`/`clear()`) | автоматичне (garbage collection) |
| Ітерованість | так (`for...of`, `values()`, `forEach`) | ні — жодного способу перелічити |
| `size` | є | немає |
| Теоретико-множинні операції | `union`/`intersection`/`difference` | немає (несумісно зі «слабкістю») |
| Типове застосування | унікальні значення, дедублікація | «мітки» на об'єктах без витоку пам'яті |

Правило вибору: якщо треба позначити об'єкт (є/немає в колекції), не турбуючись про очищення, коли об'єкт більше не потрібен — `WeakSet`. Якщо потрібна повноцінна, передбачувана колекція значень з ітерацією й операціями над множинами — `Set` ([Set.md](../Set/Set.md)).

## Підсумок

- `WeakSet`: колекція унікальних значень, де кожне значення — обов'язково об'єкт, зі «слабким» посиланням (не заважає garbage collection).
- Методи: `add()`/`has()`/`delete()` — той самий інтерфейс, що в `Set` (без `values()`).
- Немає `size`, `values`/`keys`/`entries`/`forEach`, не ітерований — навмисно, бо вміст може непередбачувано зникати через збирач сміття.
- Перевірка наявності — за посиланням, а не за вмістом об'єкта.
- Коли об'єкт-елемент стає недосяжним, garbage collector автоматично звільняє і сам об'єкт, і відповідний запис у `WeakSet`.
- Головні застосування: позначення «оброблених»/«валідованих» об'єктів, захист від повторної ініціалізації, мітки на DOM-елементах.
- Вибирай `WeakSet` замість `Set`, коли потрібне автоматичне «прибирання за собою» пам'яті, а не звичайна, ітерована колекція.
