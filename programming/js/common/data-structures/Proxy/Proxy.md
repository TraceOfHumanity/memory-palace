# Proxy — об'єкт-посередник для перехоплення операцій над об'єктом (ES6)

## 1. Що таке Proxy

`Proxy` — це «обгортка» навколо іншого об'єкта (`target`), яка дозволяє перехоплювати й перевизначати базові операції над ним: читання властивості, запис, видалення, перевірку наявності, виклик функції тощо. Кожна операція, яку можна перехопити, називається «пасткою» (trap).

```js
const target = { name: "Alex", age: 30 };
const handler = {
  get(target, prop) {
    console.log(`reading property "${prop}"`);
    return target[prop];
  },
};
const proxy = new Proxy(target, handler);

console.log(proxy.name); // 'reading property "name"' → "Alex"
```

## 2. Конструктор: new Proxy(target, handler)

- `target` — оригінальний об'єкт, який «обгортається»;
- `handler` — об'єкт-конфігурація з «пастками» (trap-функціями); `handler` без жодної пастки означає «прозорий» проксі — поводиться так само, як і сам `target`.

```js
const transparentProxy = new Proxy({ a: 1 }, {});
console.log(transparentProxy.a); // 1 — жодних перехоплень, просто проходить далі
```

## 3. Trap: get(target, prop, receiver) — перехоплення читання властивості

Спрацьовує при будь-якому читанні: `proxy.prop`, `proxy["prop"]`, навіть при деструктуризації чи `for...in`.

```js
const userTarget = { name: "John", age: 25, password: "secret123" };

const userProxy = new Proxy(userTarget, {
  get(target, prop, receiver) {
    if (prop === "password") {
      throw new Error("Access to password is forbidden");
    }
    if (!(prop in target)) {
      console.warn(`Property "${String(prop)}" does not exist`);
      return undefined;
    }
    return Reflect.get(target, prop, receiver); // "правильний" спосіб делегувати операцію далі
  },
});

console.log(userProxy.name); // "John"
// console.log(userProxy.password); // Error: Access to password is forbidden
userProxy.city; // console.warn: Property "city" does not exist
```

## 4. Trap: set(target, prop, value, receiver) — перехоплення запису

Спрацьовує при `proxy.prop = value`. Повинен повертати `true`/`false` (успіх/неуспіх) — у strict mode `false` призводить до `TypeError`.

```js
const validatedTarget = { age: 30 };

const validatedProxy = new Proxy(validatedTarget, {
  set(target, prop, value, receiver) {
    if (prop === "age") {
      if (typeof value !== "number" || value < 0) {
        throw new TypeError("age must be a non-negative number");
      }
    }
    return Reflect.set(target, prop, value, receiver);
  },
});

validatedProxy.age = 31; // ок
console.log(validatedProxy.age); // 31
// validatedProxy.age = -5; // TypeError: age must be a non-negative number
// validatedProxy.age = "thirty"; // TypeError: age must be a non-negative number
```

## 5. Trap: has(target, prop) — перехоплення оператора `in`

```js
const hiddenPropsTarget = { visible: 1, _secret: 2 };

const hiddenPropsProxy = new Proxy(hiddenPropsTarget, {
  has(target, prop) {
    if (typeof prop === "string" && prop.startsWith("_")) {
      return false; // "приховати" властивості, що починаються з _
    }
    return Reflect.has(target, prop);
  },
});

console.log("visible" in hiddenPropsProxy); // true
console.log("_secret" in hiddenPropsProxy); // false — хоча властивість насправді існує
console.log(hiddenPropsProxy._secret); // 2 — has() не впливає на пряме читання!
```

## 6. Trap: deleteProperty(target, prop) — перехоплення delete

```js
const protectedTarget = { name: "John", id: 1 };

const protectedProxy = new Proxy(protectedTarget, {
  deleteProperty(target, prop) {
    if (prop === "id") {
      throw new Error("Cannot delete id");
    }
    return Reflect.deleteProperty(target, prop);
  },
});

delete protectedProxy.name; // ок
console.log(protectedProxy); // { id: 1 }
// delete protectedProxy.id; // Error: Cannot delete id
```

## 7. Trap: ownKeys(target) — перехоплення Object.keys()/for...in/Object.getOwnPropertyNames()

```js
const filteredKeysTarget = { name: "John", _internal: "internal data", age: 30 };

const filteredKeysProxy = new Proxy(filteredKeysTarget, {
  ownKeys(target) {
    return Reflect.ownKeys(target).filter((key) => !String(key).startsWith("_"));
  },
  getOwnPropertyDescriptor(target, prop) {
    // ownKeys() має бути узгоджений з дескрипторами — без цього
    // Object.keys() кине помилку "invariant violation" для
    // "прихованих" ключів
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
});

console.log(Object.keys(filteredKeysProxy)); // ["name", "age"] — _internal прихована
```

## 8. Trap: defineProperty(target, prop, descriptor) — перехоплення Object.defineProperty()

```js
const definePropertyTarget = {};

const definePropertyProxy = new Proxy(definePropertyTarget, {
  defineProperty(target, prop, descriptor) {
    console.log(`defining property "${String(prop)}"`);
    return Reflect.defineProperty(target, prop, descriptor);
  },
});

Object.defineProperty(definePropertyProxy, "id", { value: 1, enumerable: true });
console.log(definePropertyProxy.id); // 'defining property "id"' → 1
```

## 9. Trap: getPrototypeOf / setPrototypeOf — перехоплення роботи з прототипом

```js
const protoTarget = {};
const customProto = { greet: () => "Hello!" };

const protoProxy = new Proxy(protoTarget, {
  getPrototypeOf(target) {
    console.log("reading prototype");
    return Reflect.getPrototypeOf(target);
  },
  setPrototypeOf(target, proto) {
    console.log("changing prototype");
    return Reflect.setPrototypeOf(target, proto);
  },
});

Object.setPrototypeOf(protoProxy, customProto); // "changing prototype"
console.log(Object.getPrototypeOf(protoProxy) === customProto); // "reading prototype" → true
```

## 10. Trap: apply(target, thisArg, argumentsList) — перехоплення виклику функції

Працює лише якщо `target` — функція (проксі «над функцією»).

```js
function greet(name) {
  return `Hello, ${name}`;
}

const greetProxy = new Proxy(greet, {
  apply(target, thisArg, argumentsList) {
    if (typeof argumentsList[0] !== "string") {
      throw new TypeError("First argument must be a string");
    }
    console.log(`calling ${target.name} with arguments:`, argumentsList);
    return Reflect.apply(target, thisArg, argumentsList);
  },
});

console.log(greetProxy("John")); // лог виклику → "Hello, John"
// greetProxy(123); // TypeError: First argument must be a string
```

## 11. Trap: construct(target, argumentsList, newTarget) — перехоплення `new`

```js
class Person {
  constructor(name) {
    this.name = name;
  }
}

const PersonProxy = new Proxy(Person, {
  construct(target, argumentsList, newTarget) {
    console.log("creating a new instance with:", argumentsList);
    if (typeof argumentsList[0] !== "string" || argumentsList[0].length === 0) {
      throw new TypeError("Name cannot be empty");
    }
    return Reflect.construct(target, argumentsList, newTarget);
  },
});

const newPerson = new PersonProxy("Maria"); // лог → створено
console.log(newPerson.name); // "Maria"
// new PersonProxy(""); // TypeError: Name cannot be empty
```

## 12. Інші trap-и (коротко, зустрічаються рідше)

- `isExtensible(target)` → перехоплення `Object.isExtensible()`;
- `preventExtensions(target)` → перехоплення `Object.preventExtensions()`;
- `getOwnPropertyDescriptor(target, prop)` → перехоплення `Object.getOwnPropertyDescriptor()`.

Усього пасток 13 — вони покривають практично кожну внутрішню операцію, яку рушій може виконати над об'єктом.

## 13. Reflect — «пара» до Proxy: безпечний спосіб виконати операцію далі

`Reflect` — вбудований об'єкт зі статичними методами, які дзеркально повторюють усі можливі trap-и `Proxy` (`Reflect.get`, `Reflect.set`, `Reflect.has`, `Reflect.deleteProperty`, `Reflect.apply`, `Reflect.construct` і т. д.). Усередині пастки завжди варто делегувати «решту роботи» саме через `Reflect`, а не через прямий `target[prop]` чи `target[prop] = value`.

Чому саме `Reflect`, а не `target[prop]` напряму:

- `Reflect.get`/`set` коректно передають `receiver` — критично важливо для геттерів/сеттерів, успадкованих через прототипний ланцюжок з проксі всередині нього (без `receiver` `this` у геттері може вказувати не на той об'єкт);
- `Reflect`-методи повертають boolean для `set`/`deleteProperty`/`defineProperty` — зручно одразу повернути результат з пастки;
- це узгоджений, «офіційний» спосіб виконати ту саму базову операцію, яку зараз перехоплює trap.

```js
const receiverDemoTarget = {
  _value: 10,
  get value() {
    return this._value; // this залежить від того, як був викликаний геттер
  },
};

const receiverDemoProxy = new Proxy(receiverDemoTarget, {
  get(target, prop, receiver) {
    // Reflect.get(...) передає receiver — тому this у геттері вище
    // вказуватиме на receiverDemoProxy, а не напряму на target
    return Reflect.get(target, prop, receiver);
  },
});
console.log(receiverDemoProxy.value); // 10 — коректно, завдяки receiver
```

## 14. Найчастіші застосування Proxy

а) валідація даних при записі (показано вище, `validatedProxy`);

б) logging / дебаг — прозоре логування будь-яких звернень до об'єкта:

```js
function withLogging(obj, label) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      console.log(`[${label}] read "${String(prop)}" →`, value);
      return value;
    },
    set(target, prop, value, receiver) {
      console.log(`[${label}] write "${String(prop)}" =`, value);
      return Reflect.set(target, prop, value, receiver);
    },
  });
}
const loggedUser = withLogging({ name: "Ivan" }, "user");
loggedUser.name; // [user] read "name" → Ivan
loggedUser.name = "Petro"; // [user] write "name" = Petro
```

в) значення за замовчуванням для відсутніх ключів (аналог defaultdict):

```js
function withDefault(defaultValue) {
  return new Proxy(
    {},
    {
      get(target, prop) {
        return prop in target ? target[prop] : defaultValue;
      },
    },
  );
}
const countersWithDefault = withDefault(0);
console.log(countersWithDefault.views); // 0 — навіть без явного встановлення
```

г) негативні індекси для масивів (як у Python: `arr[-1]`):

```js
function withNegativeIndices(array) {
  return new Proxy(array, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && /^-\d+$/.test(prop)) {
        return target[target.length + Number(prop)];
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
const negativeIndexArr = withNegativeIndices([10, 20, 30]);
console.log(negativeIndexArr[-1]); // 30 — те, для чого зазвичай потрібен at(-1)
```

д) «живі» об'єкти, що реагують на зміни (спрощена реактивність, саме так у своїй основі влаштована реактивність Vue 3):

```js
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      onChange(prop, value);
      return result;
    },
  });
}
const reactiveState = reactive({ count: 0 }, (prop, value) => {
  console.log(`state changed: ${prop} = ${value}`);
});
reactiveState.count = 1; // "state changed: count = 1"
```

е) обмеження доступу / реалізація «приватних» властивостей (показано вище, `userProxy` з `password`);

є) noop-об'єкти / моки для тестування — `Proxy`, що «ловить» будь-яке звернення до неіснуючого методу й повертає передбачувану заглушку.

## 15. Важливі нюанси й обмеження

```js
// а) рівність: proxy !== target — це різні значення для ===
console.log(proxy === target); // false, хоча proxy "прозоро" відображає target

// б) зміни через proxy відображаються і на target (і навпаки) —
// вони працюють з одними й тими самими даними, якщо пастка не
// перевизначає поведінку:
target.city = "Kyiv"; // змінили напряму
console.log(proxy.city); // "Kyiv" — proxy бачить зміну (get-пастка все одно читає target)
```

«Invariants» (незмінні правила) — деякі trap-и мають повертати узгоджений результат із реальним станом `target`, інакше рушій кидає `TypeError`. Наприклад, `get`-trap не може повернути інше значення для non-writable + non-configurable властивості:

```js
const invariantTarget = {};
Object.defineProperty(invariantTarget, "locked", {
  value: 42,
  writable: false,
  configurable: false,
});
const invariantProxy = new Proxy(invariantTarget, {
  get() {
    return 999; // порушує invariant для locked
  },
});
// console.log(invariantProxy.locked); // TypeError: 'get' on proxy: property 'locked' is a read-only
//                                        and non-configurable data property... inconsistent value
```

Продуктивність: `Proxy` додає накладні витрати на кожну перехоплену операцію, тому не варто загортати в проксі об'єкти, з якими працюють у «гарячих» (hot path), критичних до продуктивності ділянках коду.

## 16. Proxy vs Object.defineProperty() — чому Proxy потужніший

`Object.defineProperty()` (те, на чому будувалась реактивність Vue 2) дозволяє перехопити доступ лише до заздалегідь відомих, вже визначених властивостей — не бачить властивості, додані пізніше, і не бачить видалення властивостей.

`Proxy` перехоплює операції на рівні всього об'єкта — включно з властивостями, яких на момент створення проксі ще не існувало:

```js
const dynamicTarget = {};
const dynamicProxy = new Proxy(dynamicTarget, {
  set(target, prop, value) {
    console.log(`new property "${String(prop)}" added dynamically`);
    target[prop] = value;
    return true;
  },
});
dynamicProxy.brandNewProp = "I just appeared"; // Proxy це "бачить", defineProperty — ні
```

## Підсумок

- `Proxy(target, handler)` — обгортка над об'єктом, що перехоплює базові операції над ним через trap-функції в `handler`.
- Основні trap-и: `get`, `set`, `has`, `deleteProperty`, `ownKeys`, `defineProperty`, `getPrototypeOf`/`setPrototypeOf`, `apply` (для функцій), `construct` (для класів/конструкторів).
- `Reflect` — «пара» до `Proxy`: усередині пастки завжди делегуй «решту роботи» через `Reflect.*`, а не напряму через `target[prop]` — особливо важливо для коректної передачі `receiver`.
- `proxy !== target`, але вони працюють з тими самими даними (зміни через один бачить і другий, якщо пастка не змінює поведінку).
- Головні застосування: валідація при записі, логування/дебаг, значення за замовчуванням, «реактивність» (як у Vue 3), обмеження доступу до «приватних» полів, динамічні API-обгортки.
- Потужніший за `Object.defineProperty()`, бо бачить властивості, додані/видалені після створення проксі.
- Є правила узгодженості (invariants) — деякі пастки не можуть довільно «брехати» про non-configurable властивості.
- Додає накладні витрати — уникай у критичних до швидкодії ділянках.
