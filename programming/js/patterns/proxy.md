# Proxy — патерн «замісник, що контролює доступ до об'єкта»

## 1. Що таке Proxy

Proxy — структурний патерн: об'єкт-замісник має той самий інтерфейс, що й реальний об'єкт (Subject), і стоїть між клієнтом та ним. Клієнт не помічає підміни, а замісник вирішує, чи, коли і як передати виклик справжньому об'єкту.

Види проксі: Virtual — відкладає створення дорогого об'єкта (lazy loading); Protection — перевіряє права доступу; Caching — запам'ятовує результати викликів; Logging — записує виклики (аудит, метрики); Remote — представляє об'єкт в іншому місці (RPC, HTTP-клієнт); Smart reference — рахує посилання, керує ресурсами.

Не плутати: мовна можливість `Proxy` (`new Proxy`) — механізм, яким патерн зручно реалізувати; детально — `common/data-structures/Proxy/Proxy.md`. Патерн Proxy можна написати й без `new Proxy` (розділ 3).

## 2. Відмінності від схожих патернів

- Proxy — той самий інтерфейс; мета — контроль доступу до об'єкта; зазвичай сам керує життєвим циклом реального об'єкта.
- Decorator — той самий інтерфейс; мета — додати поведінку; обгортки складаються в ланцюжок, вирішує клієнт.
- Adapter — інший інтерфейс; мета — зробити несумісне сумісним.

Технічно Proxy і Decorator схожі; розрізняє їх намір.

## 3. Класична реалізація: один інтерфейс, два класи

```js
// спільний інтерфейс (duck typing): метод getUser(id)
class RealUserApi {
  getUser(id) {
    console.log(`  [network] fetching user ${id}`);
    return { id, name: `User ${id}` };
  }
}

// замісник тримає посилання на реальний об'єкт і передає йому виклики
class CachingUserApi {
  #target;
  #cache = new Map();

  constructor(target) {
    this.#target = target;
  }

  getUser(id) {
    if (this.#cache.has(id)) {
      console.log(`  [cache] user ${id}`);
      return this.#cache.get(id);
    }
    const user = this.#target.getUser(id);
    this.#cache.set(id, user);
    return user;
  }
}

const api = new CachingUserApi(new RealUserApi());
api.getUser(1); //   [network] fetching user 1
api.getUser(1); //   [cache] user 1
api.getUser(2); //   [network] fetching user 2
```

Клієнтський код працює з `api` так само, як із `RealUserApi`.

## 3.1. Virtual Proxy: ліниве створення дорогого об'єкта

```js
class HeavyReport {
  constructor() {
    console.log("  [heavy HeavyReport initialization]");
    this.data = [1, 2, 3];
  }
  render() {
    return `Report: ${this.data.join(", ")}`;
  }
}

class LazyReport {
  #real = null;

  render() {
    // реальний об'єкт створюється при першому використанні
    this.#real ??= new HeavyReport();
    return this.#real.render();
  }
}

const lazy = new LazyReport(); // тут HeavyReport ще не створено
console.log("proxy created");
console.log(lazy.render()); //   [heavy HeavyReport initialization] → Report: 1, 2, 3
console.log(lazy.render()); // Report: 1, 2, 3 (вдруге без ініціалізації)
```

## 3.2. Protection Proxy: перевірка прав

```js
class Document {
  read() {
    return "secret content";
  }
  delete() {
    return "deleted";
  }
}

class ProtectedDocument {
  #doc;
  #role;

  constructor(doc, role) {
    this.#doc = doc;
    this.#role = role;
  }

  read() {
    return this.#doc.read(); // читати можуть усі
  }

  delete() {
    if (this.#role !== "admin") {
      throw new Error("Access denied: admin role required");
    }
    return this.#doc.delete();
  }
}

const guest = new ProtectedDocument(new Document(), "guest");
const admin = new ProtectedDocument(new Document(), "admin");

console.log(guest.read()); // secret content
try {
  guest.delete();
} catch (err) {
  console.log(err.message); // Access denied: admin role required
}
console.log(admin.delete()); // deleted
```

## 4. JS-спосіб: вбудований new Proxy — універсальний замісник

Ручний замісник (розділ 3) доводиться писати для кожного методу. `new Proxy(target, handler)` перехоплює операції над будь-якими властивостями одним обробником. Отже, «логуючий проксі» для довільного об'єкта:

```js
function withLogging(target, name = "obj") {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args) => {
        console.log(`  → ${name}.${String(prop)}(${args.join(", ")})`);
        const result = value.apply(obj, args); // this = справжній об'єкт
        console.log(`  ← ${JSON.stringify(result)}`);
        return result;
      };
    },
  });
}

const calc = withLogging({ add: (a, b) => a + b, mul: (a, b) => a * b }, "calc");
calc.add(2, 3); //   → calc.add(2, 3)   ← 5
calc.mul(4, 5); //   → calc.mul(4, 5)   ← 20
```

`value.apply(obj, args)` — важливо: інакше `this` усередині методів вказував би на проксі, а не на цільовий об'єкт (пастки `this` — `common/this.js`). Для приватних полів (`#`) це критично (розділ 8).

## 5. Універсальний Caching Proxy для функцій (пастка apply)

```js
function memoize(fn) {
  const cache = new Map();
  return new Proxy(fn, {
    apply(target, thisArg, args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = Reflect.apply(target, thisArg, args);
      cache.set(key, result);
      return result;
    },
  });
}

let calls = 0;
const slowSquare = (n) => {
  calls++;
  return n * n;
};

const fastSquare = memoize(slowSquare);
console.log(fastSquare(9), fastSquare(9), fastSquare(9)); // 81 81 81
console.log("real calls:", calls); // 1
```

Ключ `JSON.stringify(args)` — спрощення: не працює для функцій, циклічних об'єктів; `Map`/`Set` і символи губляться (`common/type-coercion.js`).

## 6. Validation Proxy: контроль запису

```js
function withValidation(target, rules) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const rule = rules[prop];
      if (rule && !rule(value)) {
        throw new TypeError(`Invalid value for "${String(prop)}": ${value}`);
      }
      return Reflect.set(obj, prop, value);
    },
  });
}

const person = withValidation(
  { name: "Olya", age: 20 },
  { age: (v) => Number.isInteger(v) && v >= 0 && v <= 150 },
);

person.age = 30;
console.log(person.age); // 30
try {
  person.age = -5;
} catch (err) {
  console.log(err.message); // Invalid value for "age": -5
}
```

## 7. Remote Proxy: виклик віддаленого об'єкта як локального

Динамічний замісник: будь-який метод перетворюється на «мережевий запит». Так працюють RPC-клієнти та ORM-клієнти.

```js
function createRemote(send) {
  return new Proxy(
    {},
    {
      get(_, method) {
        return (...args) => send(String(method), args); // повертає Promise
      },
    },
  );
}

// імітація мережі (замість реального fetch)
const fakeServer = async (method, args) => {
  const handlers = { sum: (a, b) => a + b, greet: (n) => `Hello, ${n}` };
  return handlers[method](...args);
};

const remote = createRemote(fakeServer);
remote.sum(2, 3).then((v) => console.log("remote.sum:", v)); // 5
remote.greet("Olya").then((v) => console.log("remote.greet:", v));
// метод sum на remote не існує — Proxy створює його "на льоту"
```

## 8. Пастки Proxy

Приватні поля (`#`) ламаються через проксі, якщо `this` = проксі:

```js
class Counter {
  #count = 0;
  increment() {
    return ++this.#count;
  }
}

const brokenProxy = new Proxy(new Counter(), {}); // навіть порожній handler
try {
  brokenProxy.increment(); // this === проксі, а #count є лише у справжнього об'єкта
} catch (err) {
  console.log(err.name + ":", err.message.slice(0, 55));
  // TypeError: Cannot read private member #count from an object whose class did not declare it
}

// рішення: прив'язувати методи до цільового об'єкта
const workingProxy = new Proxy(new Counter(), {
  get(target, prop) {
    const value = Reflect.get(target, prop, target); // receiver = target
    return typeof value === "function" ? value.bind(target) : value;
  },
});
console.log(workingProxy.increment()); // 1
```

Ідентичність: `проксі !== target`.

```js
const target = {};
const proxied = new Proxy(target, {});
console.log(proxied === target); // false — порівняння за посиланням, Set/Map,
// WeakMap-ключі "бачать" різні об'єкти (common/data-structures/WeakMap/WeakMap.md)
```

Продуктивність: кожна операція проходить через пастку — це повільніше за пряме звернення і ускладнює оптимізації V8 (hidden classes, inline caching — `performance/01-hidden-classes.md`). У гарячих циклах проксі ставити не варто, для рідкісних контрольних точок (валідація, логування) — доречно.

Прозорість — пастка прихованої поведінки: клієнт не знає, що працює із замісником: логіка кешування чи прав «невидима», що ускладнює налагодження. Документуйте і не ховайте в проксі бізнес-логіку.

Результат кешу може бути застарілим: caching proxy потребує стратегії інвалідації (TTL, очищення при зміні).

`Proxy.revocable` — проксі, який можна «вимкнути»:

```js
const { proxy: temp, revoke } = Proxy.revocable({ secret: 1 }, {});
console.log(temp.secret); // 1
revoke();
try {
  temp.secret;
} catch (err) {
  console.log(err.name); // TypeError — доступ відкликано
}
```

## 9. Proxy у реальному світі

- Vue 3: реактивність (`reactive()`) побудована на Proxy; раніше Vue 2 використовував `Object.defineProperty`;
- MobX, Immer (draft-об'єкти в `produce()`) — проксі для відстеження змін;
- ORM/RPC-клієнти (Prisma, tRPC): виклики методів → запити;
- NestJS: інтерцептори, гарди, кеш (`@CacheInterceptor`) — по суті проксі навколо обробників (`node/nest/controllers.md`); AOP-декоратори обгортають методи так само;
- Observer через Proxy: [observer.md](observer.md) (розділ 8);
- тести: шпигуни й моки (`jest.fn`/`spyOn`) — замісники методів;
- CDN, reverse proxy (nginx), API gateway — Proxy на рівні мережі.

## Підсумок

- Proxy — замісник із тим самим інтерфейсом, що контролює доступ до реального об'єкта: створення, права, кешування, логування, віддалений виклик.
- Види: virtual (ліниве створення), protection (права), caching, logging, remote, smart reference.
- Від Decorator відрізняється наміром (контроль доступу, а не додавання функціональності), від Adapter — тим, що інтерфейс не змінюється.
- Класична реалізація: клас-замісник тримає `target` і делегує виклики, додаючи свою логіку до/після.
- У JS вбудований `new Proxy(target, handler)` перехоплює `get`/`set`/`apply` тощо для будь-яких властивостей одним обробником (`Reflect.get`/`set`/`apply` — правильний спосіб переслати операцію далі).
- Пастки: приватні поля (`#`) ламаються, якщо `this` = проксі (рішення: `bind(target)`); `proxy !== target`; додаткова вартість кожної операції; прихована поведінка ускладнює налагодження; кеш потребує інвалідації.
- `Proxy.revocable` дозволяє відкликати доступ.
- Застосування: реактивність (Vue 3, MobX, Immer), RPC/ORM-клієнти, інтерцептори і кеш у Nest, шпигуни у тестах.
