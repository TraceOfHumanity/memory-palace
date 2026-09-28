# Singleton — патерн «єдиний екземпляр»

## 1. Що таке Singleton

Singleton — це породжуючий патерн, який гарантує, що у програмі існує рівно один екземпляр певного класу/об'єкта, і надає глобальну точку доступу до нього. Скільки б разів і з яких місць коду ти не «попросив» цей об'єкт — щоразу отримуєш той самий екземпляр.

Типові кандидати: підключення до бази даних, конфігурація застосунку, логер, кеш, пул з'єднань — усе, де другий екземпляр був би марним (дублювання ресурсів) або шкідливим (розбіжний стан).

## 2. Проблема, яку він вирішує: без патерна легко створити дублікати

```js
class NaiveConnection {
  constructor() {
    this.id = Math.random().toString(36).slice(2, 8);
    console.log(`Opened a NEW connection ${this.id}`);
  }
}

const connA = new NaiveConnection(); // з'єднання №1
const connB = new NaiveConnection(); // з'єднання №2 — дублікат, хоча потрібне лише одне
console.log(connA === connB); // false — це два різні об'єкти й два різні ресурси
```

## 3. Класична реалізація через class: static-поле + getInstance()

```js
class Database {
  static #instance = null; // приватне static-поле: єдине місце, де живе екземпляр

  constructor() {
    if (Database.#instance) {
      // конструктор можна викликати напряму (new Database()) — тому
      // захищаємось: повертаємо вже наявний екземпляр замість нового
      return Database.#instance;
    }
    this.connectionId = Math.random().toString(36).slice(2, 8);
    this.queries = [];
    console.log(`Database: connection created ${this.connectionId}`);
    Database.#instance = this;
  }

  static getInstance() {
    if (!Database.#instance) {
      Database.#instance = new Database(); // лінива (lazy) ініціалізація —
      // створюємо лише при першому запиті
    }
    return Database.#instance;
  }

  query(sql) {
    this.queries.push(sql);
    return `[${this.connectionId}] executed: ${sql}`;
  }
}

const db1 = Database.getInstance();
const db2 = Database.getInstance();
const db3 = new Database(); // навіть прямий new повертає той самий екземпляр

console.log(db1 === db2); // true
console.log(db1 === db3); // true
console.log(db1.query("SELECT 1"));
console.log(db2.queries); // ["SELECT 1"] — стан спільний, бо це один і той самий об'єкт
```

Чому `return` у конструкторі працює: якщо конструктор явно повертає об'єкт, оператор `new` віддає саме його, а не щойно створений `this` (детально механіка `new` й повернення з конструктора — `common/this.md`, розділ 6 «new binding»). Примітивний `return` був би проігнорований.

## 4. Найпростіший Singleton у JS — сам модуль (module cache)

У Node.js (і в ES-модулях) файл виконується лише один раз, а результат `require()`/`import` кешується. Тому будь-який об'єкт, який експортує модуль, — це вже singleton «з коробки», без жодного спеціального коду:

```text
// logger.js
class Logger {
  log(msg) { console.log(`[LOG] ${msg}`); }
}
module.exports = new Logger(); // експортуємо готовий екземпляр, а не клас

// a.js
const logger = require("./logger");
// b.js
const logger = require("./logger"); // той самий об'єкт, що й в a.js
```

Node.js зберігає завантажені модулі в `require.cache`: другий `require` того самого файлу не виконує його повторно, а повертає закешований `module.exports`.

Демонстрація прямо тут — емулюємо це через власний «модуль»:

```js
const moduleCache = new Map();
function fakeRequire(name, factory) {
  if (!moduleCache.has(name)) {
    console.log(`Module "${name}" runs for the FIRST time`);
    moduleCache.set(name, factory());
  }
  return moduleCache.get(name);
}

const configA = fakeRequire("config", () => ({ env: "production" }));
const configB = fakeRequire("config", () => ({ env: "production" })); // factory не викликається
console.log(configA === configB); // true
```

⚠️ Важливий нюанс: кеш ключується за реальним шляхом до файлу. Якщо той самий пакет опиниться на диску у двох місцях (наприклад, `node_modules/a/node_modules/lib` і `node_modules/lib` різних версій), ви отримаєте два екземпляри — «singleton» виявляється подвійним. Саме через це бібліотеки зі станом (React, styled-components) вимагають, щоб у дереві залежностей була одна копія пакета.

## 5. Singleton через замикання (модульний патерн)

До появи `class` і приватних полів (`#field`) єдиний екземпляр ховали в замиканні (детально `common/closures.md`, розділ 4):

```js
const Counter = (function () {
  let instance = null; // недоступна ззовні

  function create() {
    let count = 0;
    return {
      increment: () => ++count,
      current: () => count,
    };
  }

  return {
    getInstance() {
      if (!instance) instance = create();
      return instance;
    },
  };
})();

const counter1 = Counter.getInstance();
const counter2 = Counter.getInstance();
counter1.increment();
counter1.increment();
console.log(counter2.current()); // 2 — це той самий лічильник
console.log(counter1 === counter2); // true
```

## 6. Захист екземпляра: Object.freeze

Singleton — це спільний стан, а спільний стан легко зіпсувати. Якщо об'єкт має бути незмінним (наприклад, конфігурація), його заморожують (детально `Object.freeze` і його обмеження — `common/data-structures/Object/Object.md`):

```js
const AppConfig = Object.freeze({
  apiUrl: "https://api.example.com",
  retries: 3,
});
AppConfig.retries = 99; // мовчки ігнорується (у strict mode — TypeError)
console.log(AppConfig.retries); // 3
// Object.freeze — shallow: вкладені об'єкти лишаються змінними
```

## 7. Проблеми Singleton — чому його часто називають антипатерном

Прихована глобальна змінна: будь-який код може викликати `getInstance()` і змінити спільний стан. Залежність від singleton не видно в сигнатурі функції — функція «секретно» залежить від глобального об'єкта.

```js
function processOrderBad(order) {
  const db = Database.getInstance(); // прихована залежність!
  return db.query(`INSERT ${order}`);
}
// з сигнатури processOrderBad(order) неможливо здогадатись, що вона
// ходить у базу
```

✅ Явна передача залежності (dependency injection) — те саме, що у Nest робить контейнер автоматично (`node/nest/providers-and-dependency-injection.md`, розділ 13, порівняння з ручним DI):

```js
function processOrder(order, db) {
  return db.query(`INSERT ${order}`);
}
console.log(processOrder("order-1", Database.getInstance()));
```

Важке тестування: стан singleton переживає між тестами: тест №1 записав дані — тест №2 їх бачить. Ізолювати тести неможливо без спеціального методу скидання (`reset`), який потрібно писати лише заради тестів:

```js
class ResettableRegistry {
  static #instance = null;
  items = [];
  static getInstance() {
    return (ResettableRegistry.#instance ??= new ResettableRegistry());
  }
  static resetForTests() {
    ResettableRegistry.#instance = null;
  }
}
ResettableRegistry.getInstance().items.push("from test #1");
ResettableRegistry.resetForTests(); // без цього тест №2 побачив би "from test #1"
console.log(ResettableRegistry.getInstance().items); // []
```

Порушення принципу єдиної відповідальності: клас одночасно виконує свою роботу і керує власним життєвим циклом (гарантує єдиність). Це два різні обов'язки (SOLID — детально в `common/SOLID/`).

Що Singleton не гарантує: один екземпляр на процес, а не на систему. Кожен `worker_thread` має власну копію модулів → власний «singleton»; кожен процес у cluster/PM2 має власний → N процесів = N екземплярів; кожен запуск serverless-функції може створювати новий. Для справді спільного стану потрібне зовнішнє сховище (Redis, БД).

## 8. Singleton у NestJS — DI-контейнер замість ручного патерна

Провайдери Nest за замовчуванням — singleton у межах застосунку (`Scope.DEFAULT`, детально `node/nest/providers-and-dependency-injection.md`, розділ 5). Різниця з ручним патерном: екземпляр створює й роздає контейнер, а не сам клас — клас лишається звичайним, без `getInstance()` і без приватного static-поля, а залежність передається через конструктор і тому видна та легко підміняється в тестах. Тобто ви отримуєте користь singleton (один екземпляр) без його головних недоліків (прихована глобальність, важкі тести).

## 9. Коли використовувати, а коли ні

✅ Підходить: ресурс за своєю природою один (пул з'єднань, логер, реєстр налаштувань), стан який не змінюється або змінюється контрольовано, спрощення передачі «наскрізних» сервісів.

❌ Не підходить: об'єкт із бізнес-станом, який залежить від запиту/користувача (стан «просочиться» між запитами), клас, який потрібно ізольовано тестувати, ситуації, де завтра може знадобитись другий екземпляр (інша БД, інший тенант).

Практичне правило: у JS найчастіше досить експортувати єдиний екземпляр з модуля (розділ 4) — окремий клас Singleton із `getInstance()` потрібен рідко.

## Підсумок

- Singleton гарантує єдиний екземпляр і глобальну точку доступу; типові кандидати — підключення до БД, конфіг, логер, кеш.
- Класична реалізація: приватне static-поле + `getInstance()` з ліниво створюваним екземпляром; захист від прямого `new` — повернення наявного екземпляра з конструктора.
- У JS/Node.js модуль сам є singleton: кеш `require`/`import` гарантує одноразове виконання файлу — достатньо експортувати готовий екземпляр (але кеш ключується за шляхом до файлу, тож дублікати пакета в `node_modules` дають дублікати «singleton»).
- До `class`/`#private` єдиний екземпляр ховали в замиканні (IIFE).
- `Object.freeze` захищає від випадкової зміни спільного стану (але shallow).
- Недоліки: прихована глобальна залежність (не видно в сигнатурі), важке тестування (стан переживає тести, потрібен `reset`), змішування відповідальностей; тому явна передача залежності (DI) зазвичай краща.
- «Єдиний» означає єдиний на процес: `worker_threads`, cluster і serverless дають кілька екземплярів — для спільного стану потрібне зовнішнє сховище.
- У Nest роль singleton виконує DI-контейнер (`Scope.DEFAULT`) — без `getInstance()` і з поверненням контролю над тестуванням.
