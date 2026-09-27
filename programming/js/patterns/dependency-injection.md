# Dependency Injection — патерн «залежності приходять ззовні»

## 1. Що таке Dependency Injection (DI)

Залежність — це інший об'єкт, який потрібен класу для роботи (база даних, логер, HTTP-клієнт, годинник).

DI — підхід, за якого об'єкт не створює свої залежності сам (через `new` всередині), а отримує їх ззовні: через конструктор, метод або властивість. Хто саме створює й підставляє — вирішує код «вище» (composition root або DI-контейнер).

Навіщо: тестованість — у тесті підставляємо фейк замість справжньої БД; гнучкість — заміна реалізації (Postgres → Mongo) без правки класу; слабка зв'язаність — клас залежить від «контракту», а не від конкретного класу; явність — за конструктором видно, що потрібно класу.

Терміни, які плутають: **DI** (Dependency Injection) — техніка: залежності передають ззовні; **IoC** (Inversion of Control) — принцип: не клас керує створенням залежностей, а хтось інший; **DIP** (Dependency Inversion) — принцип SOLID: залежати від абстракцій, а не від конкретики; **DI-контейнер** — інструмент, що автоматизує DI (Nest).

## 2. Проблема: клас сам створює залежності

```js
class RealDatabase {
  find(id) {
    // уявімо: тут справжній запит у мережу
    return { id, name: "Olya (from the real DB)" };
  }
}

// ❌ UserServiceBad жорстко прив'язаний до RealDatabase
class UserServiceBad {
  constructor() {
    this.db = new RealDatabase(); // прихована залежність
  }
  getName(id) {
    return this.db.find(id).name;
  }
}

console.log(new UserServiceBad().getName(1)); // Olya (from the real DB)
```

Проблеми: у тесті неможливо замінити БД, не чіпаючи клас (тільки хаки на кшталт мокінгу модулів); змінити реалізацію = редагувати `UserServiceBad`; з коду виклику не видно, що сервіс залежить від БД.

## 3. Constructor injection — основний спосіб

```js
class UserService {
  #db;
  #logger;

  // залежності — параметри конструктора: чесний контракт класу
  constructor(db, logger) {
    this.#db = db;
    this.#logger = logger;
  }

  getName(id) {
    this.#logger.log(`looking up user ${id}`);
    return this.#db.find(id).name;
  }
}

const consoleLogger = { log: (msg) => console.log(`[LOG] ${msg}`) };

const service = new UserService(new RealDatabase(), consoleLogger);
console.log(service.getName(1));
// [LOG] looking up user 1
// Olya (from the real DB)

// різні реалізації — той самий UserService:
const inMemoryDb = { find: (id) => ({ id, name: "Test user" }) };
const silentLogger = { log: () => {} };

const testService = new UserService(inMemoryDb, silentLogger);
console.log(testService.getName(42)); // Test user
```

## 4. Тестованість: фейки та шпигуни

Завдяки DI перевіряємо поведінку без мережі, часу і випадковості.

```js
function createSpyLogger() {
  const calls = [];
  return { log: (msg) => calls.push(msg), calls };
}

const spy = createSpyLogger();
new UserService(inMemoryDb, spy).getName(7);
console.log(spy.calls); // [ 'looking up user 7' ]
```

Класичний випадок — час і випадковість. Не викликайте `Date.now()`/`Math.random()` усередині класу напряму, а ін'єктуйте:

```js
class TokenService {
  constructor(clock) {
    this.clock = clock;
  }
  isExpired(expiresAt) {
    return this.clock.now() >= expiresAt;
  }
}

const fixedClock = { now: () => 1000 };
console.log(new TokenService(fixedClock).isExpired(999)); // true
console.log(new TokenService(fixedClock).isExpired(2000)); // false
// результат детермінований — тест ніколи не "мигає"
```

## 5. Інші види ін'єкції

Setter/property injection — залежність ставиться після створення:

```js
class Reporter {
  setLogger(logger) {
    this.logger = logger;
  }
  report() {
    this.logger.log("report is ready"); // ⚠️ якщо setLogger не викликали — TypeError
  }
}
const reporter = new Reporter();
reporter.setLogger(consoleLogger);
reporter.report(); // [LOG] report is ready
```

Мінус: об'єкт може існувати у неповному стані. Використовують для необов'язкових залежностей або циклічних (див. розділ 8).

Method (parameter) injection — залежність приходить в один виклик:

```js
function formatUser(user, formatter) {
  return formatter(user);
}
console.log(formatUser({ name: "Olya" }, (u) => u.name.toUpperCase())); // OLYA
```

Функціональний DI: замикання (фабрика приймає залежності). У JS часто не потрібні класи — достатньо функції вищого порядку (closures — `common/closures.js`; фабрики — [factory.md](factory.md)):

```js
const makeGetUserName = (db) => (id) => db.find(id).name;

const getUserName = makeGetUserName(inMemoryDb);
console.log(getUserName(5)); // Test user
```

## 6. Composition root — єдине місце, де все з'єднується

«Ручний» DI: залежності збираються в одному місці на вході в застосунок (`main`). Решта коду про конкретні класи не знає.

```js
function createApp(config) {
  const db = config.useFake ? inMemoryDb : new RealDatabase();
  const logger = config.silent ? silentLogger : consoleLogger;
  const userService = new UserService(db, logger);
  return { userService };
}

const app = createApp({ useFake: false, silent: false });
console.log(app.userService.getName(3));
// [LOG] looking up user 3
// Olya (from the real DB)
```

Без контейнера це чудово працює для малих і середніх проєктів.

## 7. Простий DI-контейнер (як це працює у Nest «під капотом»)

Контейнер зберігає «рецепти» створення і сам будує граф залежностей. Реєстрація за токеном (ім'ям); залежності перелічені явно.

```js
class Container {
  #recipes = new Map(); // token → { factory, deps, singleton }
  #instances = new Map(); // кеш singleton-екземплярів

  register(token, factory, { deps = [], singleton = true } = {}) {
    this.#recipes.set(token, { factory, deps, singleton });
    return this;
  }

  resolve(token, chain = []) {
    if (chain.includes(token)) {
      throw new Error(`Circular dependency: ${[...chain, token].join(" → ")}`);
    }
    const recipe = this.#recipes.get(token);
    if (!recipe) throw new Error(`Not registered: ${token}`);

    if (recipe.singleton && this.#instances.has(token)) {
      return this.#instances.get(token);
    }

    // рекурсивно будуємо залежності
    const args = recipe.deps.map((dep) => this.resolve(dep, [...chain, token]));
    const instance = recipe.factory(...args);

    if (recipe.singleton) this.#instances.set(token, instance);
    return instance;
  }
}

const container = new Container()
  .register("db", () => new RealDatabase())
  .register("logger", () => consoleLogger)
  .register("userService", (db, logger) => new UserService(db, logger), {
    deps: ["db", "logger"],
  });

const resolved = container.resolve("userService");
console.log(resolved.getName(9));
// [LOG] looking up user 9
// Olya (from the real DB)
console.log(container.resolve("userService") === resolved); // true — singleton

// підміна для тестів: перереєструємо токен, решта коду не змінюється
const testContainer = new Container()
  .register("db", () => inMemoryDb)
  .register("logger", () => silentLogger)
  .register("userService", (db, logger) => new UserService(db, logger), {
    deps: ["db", "logger"],
  });
console.log(testContainer.resolve("userService").getName(9)); // Test user
```

Це прямий аналог Nest: `@Injectable()` + providers у модулі + constructor-параметри. Nest сам читає типи параметрів (через `reflect-metadata`) замість явного масиву `deps` — детально `node/nest/providers-and-dependency-injection.md` та `node/nest/modules.md`. Scope singleton/transient/request у Nest — та сама ідея прапорця `singleton`; зв'язок з [singleton.md](singleton.md).

## 8. Циклічні залежності

A залежить від B, а B від A — створити жоден неможливо через конструктори. Контейнер має це помітити:

```js
const cyclic = new Container()
  .register("a", (b) => ({ b }), { deps: ["b"] })
  .register("b", (a) => ({ a }), { deps: ["a"] });

try {
  cyclic.resolve("a");
} catch (err) {
  console.log(err.message); // Circular dependency: a → b → a
}
```

Зазвичай це сигнал поганого дизайну: винесіть спільну частину в третій клас або використайте події ([observer.md](observer.md)). Nest має `forwardRef()` як аварійний вихід.

## 9. Типові помилки

**Service Locator — підміна, а не DI.** Клас сам «дістає» залежності з глобального контейнера:

```text
class Bad { run() { container.resolve("db").find(1); } }
```

Залежності знову приховані (не видно в конструкторі), а клас прив'язаний до контейнера. У DI контейнер знає клас, а не навпаки.

**Зайва абстракція.** Не всі залежності треба ін'єктувати. Чисті утиліти (`Math`, форматери без стану) імпортують напряму. Ін'єктуйте те, що треба підміняти: I/O (БД, мережа, файли), час, випадковість, зовнішні сервіси.

**«Божественний» конструктор.** Якщо в конструкторі 8+ залежностей — клас робить забагато (порушення Single Responsibility), а не проблема DI.

**`new` усередині параметрів за замовчуванням:** `constructor(db = new RealDatabase())` — компроміс: зручно, але повертає жорстку залежність від конкретного класу в модуль. Прийнятно для простих випадків, для великих систем — ні.

**Залежність від конкретного класу, а не від контракту.** У JS інтерфейсів немає (duck typing): достатньо, щоб об'єкт мав метод `find()`. У TypeScript контракт виражають через `interface` — `typescript/interface-vs-type.ts`. Тоді фейки типізуються так само, як і справжні реалізації.

## Підсумок

- DI: об'єкт отримує залежності ззовні, а не створює через `new` всередині; це техніка реалізації принципів IoC і DIP (SOLID).
- Constructor injection — основний спосіб: контракт класу видно в конструкторі, об'єкт одразу у готовому стані; setter injection — для необов'язкових залежностей; method injection — для залежності одного виклику.
- Головна користь: тестованість (підставляємо фейки БД, годинника, випадковості) і легка заміна реалізацій без правок класу.
- У JS DI можна робити без класів: замиканням/фабрикою (`makeGetUserName(db)`) і просто передачею функцій.
- Composition root — єдине місце, де збираються всі залежності (ручний DI без контейнера добре працює у малих проєктах).
- DI-контейнер автоматизує створення графа: реєструє рецепти, рекурсивно резолвить залежності, кешує singleton, виявляє цикли — так працює Nest (`@Injectable`, providers, scopes).
- Циклічні залежності — сигнал поганого дизайну; Service Locator — це не DI (залежності знову приховані).
- Ін'єктуйте те, що треба підміняти (I/O, час, випадковість), але не перетворюйте DI на абстракцію заради абстракції.
