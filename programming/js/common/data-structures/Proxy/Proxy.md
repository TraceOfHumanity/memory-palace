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

## 17. Як це працює під капотом: внутрішні методи об'єкта

Кожен об'єкт у JavaScript має набір **внутрішніх методів** (їх у специфікації позначають подвійними дужками): `[[Get]]`, `[[Set]]`, `[[Has]]`, `[[Delete]]`, `[[OwnPropertyKeys]]`, `[[DefineOwnProperty]]`, `[[GetPrototypeOf]]`, `[[Call]]`, `[[Construct]]` та інші. Коли ти пишеш `obj.x`, рушій викликає `obj.[[Get]]("x")`.

`Proxy` — це об'єкт, у якого ці внутрішні методи **замінено**: замість стандартної поведінки він шукає в `handler` функцію з відповідним ім'ям (trap) і викликає її. Якщо пастки немає — делегує операцію прямо в `target`.

| Що ти робиш | Внутрішній метод | Trap у handler |
|---|---|---|
| `p.x`, `p["x"]`, деструктуризація | `[[Get]]` | `get` |
| `p.x = 1` | `[[Set]]` | `set` |
| `"x" in p` | `[[HasProperty]]` | `has` |
| `delete p.x` | `[[Delete]]` | `deleteProperty` |
| `Object.keys(p)`, `for…in`, `JSON.stringify` | `[[OwnPropertyKeys]]` | `ownKeys` (+ `getOwnPropertyDescriptor`) |
| `Object.defineProperty(p, …)` | `[[DefineOwnProperty]]` | `defineProperty` |
| `Object.getOwnPropertyDescriptor(p, "x")` | `[[GetOwnProperty]]` | `getOwnPropertyDescriptor` |
| `Object.getPrototypeOf(p)`, `instanceof` | `[[GetPrototypeOf]]` | `getPrototypeOf` |
| `Object.setPrototypeOf(p, …)` | `[[SetPrototypeOf]]` | `setPrototypeOf` |
| `Object.isExtensible(p)` | `[[IsExtensible]]` | `isExtensible` |
| `Object.preventExtensions(p)` | `[[PreventExtensions]]` | `preventExtensions` |
| `f(…)` (target — функція) | `[[Call]]` | `apply` |
| `new F(…)` (target — конструктор) | `[[Construct]]` | `construct` |

Це **всі 13 пасток**. Корисна модель: Proxy — це «диспетчер», який стоїть між кодом і об'єктом на кожній із 13 операцій.

> Зверни увагу: `proxy.method()` — це **дві** операції: спершу `get` (дістати функцію `method`), потім `apply`/виклик із `this = proxy`. Саме тому `get`-пастка бачить звернення до методів, а `this` усередині методу — це проксі, а не `target`.

## 18. `set` повинен повертати `true`

Пастка `set` **обов'язково** повертає булеве значення. Якщо вона повертає `false` (або нічого, тобто `undefined`) — у **strict mode** (модулі, класи, `"use strict"`) запис кидає `TypeError`; у «sloppy» режимі помилка мовчки ігнорується. Типова помилка — забути `return true`:

```js
const p = new Proxy({}, {
  set(target, prop, value) {
    target[prop] = value;
    // забули return true
  },
});
"use strict";
p.x = 1; // TypeError: 'set' on proxy: trap returned falsish for property 'x'
```

Правильно: `return Reflect.set(target, prop, value, receiver)` або явний `return true`. Для **відмови** у записі: `return false` (у strict mode це дасть `TypeError`) або кинути власну помилку.

## 19. `Proxy.revocable` — проксі, який можна «вимкнути»

```js
const { proxy, revoke } = Proxy.revocable({ a: 1 }, {});
console.log(proxy.a); // 1
revoke();             // відкликали доступ
proxy.a;              // TypeError: Cannot perform 'get' on a proxy that has been revoked
```

Після `revoke()` **будь-яка** операція над проксі кидає `TypeError`. Корисно, коли ти віддаєш стороннему коду тимчасовий доступ до об'єкта (сесія, токен, «одноразова» ручка) і хочеш гарантовано його закрити. Перевірено запуском.

## 20. Підводні камені: приватні поля, вбудовані об'єкти і `this`

Це **найчастіше джерело дивних багів** з Proxy.

**а) Приватні поля `#x` і проксі несумісні.** Приватне поле існує лише в самого екземпляра, не в проксі. Метод, викликаний через проксі, отримує `this = proxy` і не знаходить `#n`:

```js
class Counter { #n = 0; inc() { return ++this.#n; } }
const c = new Proxy(new Counter(), {});
c.inc(); // TypeError: Cannot read private member #n from an object whose class did not declare it
```

Лікування — у `get` повертати метод, прив'язаний до `target`:

```js
const c2 = new Proxy(new Counter(), {
  get(target, prop) {
    const value = Reflect.get(target, prop, target); // receiver = target
    return typeof value === "function" ? value.bind(target) : value;
  },
});
c2.inc(); // 1
```

**б) Вбудовані об'єкти з внутрішніми слотами — `Map`, `Set`, `Date`, `Promise`, типізовані масиви.** Їхні методи вимагають, щоб `this` був справжнім екземпляром, а не проксі:

```js
const m = new Proxy(new Map(), {});
m.set("a", 1); // TypeError: Method Map.prototype.set called on incompatible receiver
```

Те саме лікування: `bind(target)` у `get`.

**в) Масиви.** Проксі над масивом працює, але `push` — це кілька операцій. Перевірено: `proxy.push(10)` викликає `set` двічі: `"0" = 10` і `"length" = 1`. Обробляй обидва випадки (і не вважай, що `set` викликається «один раз на користувацьку дію»).

**г) Символи.** Рушій читає символьні властивості (`Symbol.iterator`, `Symbol.toPrimitive`, `util.inspect.custom` тощо). Якщо твоя `get`-пастка для будь-якого ключа повертає рядок/проксі, цикли, шаблонні рядки й `console.log(proxy)` можуть поводитися дивно. Для символів зазвичай делегуй `Reflect.get`.

**д) `console.log(proxy)`** у Node.js показує вміст `target` без виклику пасток (за замовчуванням); у браузерних DevTools проксі позначається окремо.

## 21. Глибока реактивність: як це влаштовано у Vue 3 (спрощено)

Один `set`-trap — це поверхнева реактивність. Щоб працювала вкладеність (`state.user.name = "B"`), у `get` потрібно **повертати проксі й для вкладених об'єктів**, а щоб не створювати нові проксі при кожному зверненні й зберегти ідентичність — **кешувати** їх у `WeakMap`.

Другий важливий елемент — **відстеження залежностей** (track/trigger): під час виконання «ефекту» кожне **читання** властивості записує «цей ефект залежить від цієї властивості», а кожен **запис** запускає лише ті ефекти, що залежать від зміненої властивості.

```js
const deps = new WeakMap();   // об'єкт → (ключ → набір ефектів)
let active = null;            // ефект, що зараз виконується
const cache = new WeakMap();  // сирий об'єкт → його проксі

function track(target, key) {
  if (!active) return;
  let m = deps.get(target);
  if (!m) deps.set(target, (m = new Map()));
  let s = m.get(key);
  if (!s) m.set(key, (s = new Set()));
  s.add(active);
}
function trigger(target, key) {
  deps.get(target)?.get(key)?.forEach((fn) => fn());
}

function reactive(obj) {
  if (cache.has(obj)) return cache.get(obj); // той самий проксі для того самого об'єкта
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key); // «хтось прочитав» → запам'ятати ефект
      const value = Reflect.get(target, key, receiver);
      return typeof value === "object" && value !== null ? reactive(value) : value;
    },
    set(target, key, value, receiver) {
      const old = target[key];
      const ok = Reflect.set(target, key, value, receiver);
      if (old !== value) trigger(target, key); // «хтось змінив» → перезапустити ефекти
      return ok;
    },
  });
  cache.set(obj, proxy);
  return proxy;
}

function effect(fn) { active = fn; fn(); active = null; }

const raw = { user: { name: "A" }, count: 0 };
const state = reactive(raw);
effect(() => console.log(state.user.name, state.count)); // A 0
state.count = 1;        // A 1
state.user.name = "B";  // B 1
state.count = 1;        // нічого: значення не змінилось
```

Перевірено запуском: ефект спрацював тричі ("A0", "A1", "B1"), а `reactive(raw) === state` (кеш зберігає ідентичність). Саме так, але з додатковими оптимізаціями, працює `reactive()`/`ref()` у Vue 3 та Proxy-сховища (MobX, Valtio, Immer).

## 22. Ще застосування

**Fluent / динамічний API** — будуємо шлях із ланцюжка звернень:

```js
const path = (parts = []) =>
  new Proxy(() => {}, {
    get: (_, key) => path([...parts, String(key)]), // кожне звернення додає сегмент
    apply: () => parts.join("."),                   // виклик — повертає шлях
  });
path().users.list.all(); // "users.list.all"
```

Так роблять клієнти RPC/ORM (`db.users.find(…)`), мок-бібліотеки, `Proxy` над `window.location`.

**Захист від друкарських помилок:** `get`-пастка кидає помилку при зверненні до неіснуючої властивості (корисно для конфігів/enum).

**Кешування та ліниві обчислення:** `get` обчислює значення при першому зверненні й зберігає.

**Нормалізація / транскодування:** перетворення snake_case ↔ camelCase «на льоту».

**Відстеження змін для undo/redo** — запис кожної операції `set`/`deleteProperty` у журнал.

## 23. Коли НЕ варто використовувати Proxy

- у «гарячих» циклах з мільйонами звернень — кожна операція проходить через JS-функцію;
- для об'єктів із приватними полями та вбудованих колекцій — вимагають `bind` і дають крихкий код;
- коли вистачить звичайних getter/setter, класу чи `Object.freeze` — простіший код легше читати й налагоджувати;
- коли потрібна підтримка дуже старих середовищ — Proxy **неможливо поліфілити**.

## 24. Типові помилки

1. Забути `return true` у `set` (TypeError у strict mode).
2. Звертатись до `target[prop]` замість `Reflect.get(target, prop, receiver)` — ламається `receiver` і успадковані геттери.
3. Викликати методи вбудованих колекцій чи приватні поля через проксі без `bind`.
4. Рекурсія: у `get`-пастці звернутись до `proxy.prop` (замість `target.prop`) — нескінченна рекурсія й переповнення стека.
5. Порушити **invariants** (див. розділ 15): наприклад, `ownKeys` повертає не всі ключі для заморожених об'єктів — `TypeError`.
6. Порівнювати `proxy === target` і дивуватись, що це `false`.
7. Не кешувати вкладені проксі: щоразу новий проксі → зламана ідентичність (`state.a === state.a` стає `false`).
8. Забути, що `get` бачить і **символи** та службові ключі (`then`, `toJSON`, `Symbol.toPrimitive`) — наприклад, `await proxy` читає `proxy.then`.

## 25. Алгоритм: як думати про Proxy

1. Чи справді потрібне перехоплення? Може вистачити getter/setter, класу, `Object.freeze`.
2. Яку саме **операцію** треба перехопити (читання, запис, `in`, `delete`, ключі, виклик, `new`)? Обери одну пастку з таблиці розділу 17.
3. У тілі пастки: своя логіка, потім **делегуй** через `Reflect.*` з тим самим `receiver`.
4. `set`, `deleteProperty`, `defineProperty` повертають булеве значення (`true` — успіх).
5. Вкладені об'єкти? Повертай проксі й кешуй у `WeakMap`.
6. Перевір приватні поля, `Map`/`Set`, символи, масиви.
7. Потрібно тимчасовий доступ → `Proxy.revocable`.

## Підсумок

- `Proxy(target, handler)` — обгортка над об'єктом, що перехоплює базові операції над ним через trap-функції в `handler`.
- Основні trap-и: `get`, `set`, `has`, `deleteProperty`, `ownKeys`, `defineProperty`, `getPrototypeOf`/`setPrototypeOf`, `apply` (для функцій), `construct` (для класів/конструкторів).
- `Reflect` — «пара» до `Proxy`: усередині пастки завжди делегуй «решту роботи» через `Reflect.*`, а не напряму через `target[prop]` — особливо важливо для коректної передачі `receiver`.
- `proxy !== target`, але вони працюють з тими самими даними (зміни через один бачить і другий, якщо пастка не змінює поведінку).
- Головні застосування: валідація при записі, логування/дебаг, значення за замовчуванням, «реактивність» (як у Vue 3), обмеження доступу до «приватних» полів, динамічні API-обгортки.
- Потужніший за `Object.defineProperty()`, бо бачить властивості, додані/видалені після створення проксі.
- Є правила узгодженості (invariants) — деякі пастки не можуть довільно «брехати» про non-configurable властивості.
- Додає накладні витрати — уникай у критичних до швидкодії ділянках.
- Усього 13 пасток; кожна відповідає внутрішньому методу об'єкта (`[[Get]]`, `[[Set]]`, `[[Call]]` …).
- `set` має повертати `true`, інакше у strict mode — `TypeError`.
- `Proxy.revocable` дає проксі, який можна вимкнути.
- Приватні поля та `Map`/`Set`/`Date` не працюють через проксі без `bind(target)`.
- Глибока реактивність = проксі для вкладених об'єктів + `WeakMap`-кеш + track/trigger.
