# Closures (замикання) — функція разом із лексичним оточенням

## 1. Визначення

Closure (замикання) — це функція **разом із посиланням** на лексичне оточення, у якому її створено. Це посилання зберігається, навіть коли зовнішня функція вже завершилась і її змінні, здавалося б, мали зникнути. Це прямий наслідок лексичного скоупінгу ([scope.md](variables-and-execution-context/scope.md)): функція шукає вільні змінні там, де вона **написана**, а не там, де **викликана**.

```js
function makeGreeter(greeting) {
  return function (name) {
    return `${greeting}, ${name}!`; // greeting — вільна змінна із зовнішньої функції
  };
}

const greetFormal = makeGreeter("Good evening");
const greetCasual = makeGreeter("Hi");

console.log(greetFormal("Ivan")); // Good evening, Ivan!
console.log(greetCasual("John")); // Hi, John!
```

`makeGreeter("Good evening")` давно завершився, але `greetFormal` досі «пам'ятає» `greeting` — це і є closure.

## 2. Замикання зберігає змінну, а не копію значення

Замикання тримає посилання на **саму змінну** (binding), а не «знімок» її значення на момент створення. Якщо змінна зміниться пізніше — замикання побачить нове значення:

```js
function makeCounter() {
  let count = 0; // count живе в лексичному оточенні makeCounter
  return {
    increment() {
      count += 1; // змінює ту саму зовнішню змінну
      return count;
    },
    reset() {
      count = 0; // інша функція, але той самий count — спільне оточення
      return count;
    },
  };
}

const counter = makeCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.reset()); // 0 — reset() і increment() ділять один count
```

Кожен **виклик** `makeCounter()` створює нове, незалежне оточення — різні лічильники не заважають один одному:

```js
const counter2 = makeCounter();
console.log(counter2.increment()); // 1 — власний count, а не 1 + попередні
```

І навпаки — «живий» зв'язок видно, коли змінна змінюється **після** створення функції:

```js
let message = "before";
const readMessage = () => message;
message = "after";
console.log(readMessage()); // after — не «before», бо замкнено змінну, а не значення
```

## 3. Класична пастка: var у циклі + замикання

(Детально про `var` — [var.md](variables-and-execution-context/var.md); тут — причина через призму замикань.)

```js
var callbacksWithVar = [];
for (var i = 0; i < 3; i++) {
  callbacksWithVar.push(function () {
    console.log("var i =", i); // усі функції замикають ОДНУ й ту саму i
  });
}
callbacksWithVar.forEach((cb) => cb());
// var i = 3
// var i = 3
// var i = 3
```

Цикл давно завершився, і всі колбеки бачать фінальне значення `i`. `let` створює **нове** лексичне оточення (і нову змінну) на кожній ітерації, тож кожне замикання бачить свою:

```js
let callbacksWithLet = [];
for (let j = 0; j < 3; j++) {
  callbacksWithLet.push(function () {
    console.log("let j =", j);
  });
}
callbacksWithLet.forEach((cb) => cb());
// let j = 0
// let j = 1
// let j = 2
```

Історичне виправлення без `let` — IIFE, яка вручну створює нове оточення на кожній ітерації:

```js
var callbacksWithIIFE = [];
for (var k = 0; k < 3; k++) {
  (function (capturedK) {
    callbacksWithIIFE.push(function () {
      console.log("captured k =", capturedK); // capturedK — параметр, свій на кожен виклик IIFE
    });
  })(k);
}
callbacksWithIIFE.forEach((cb) => cb());
// captured k = 0
// captured k = 1
// captured k = 2
```

## 4. Module pattern — приватність через замикання

До появи приватних полів класу (`#field`) замикання були головним способом емулювати приватний стан: він недоступний ззовні, лише через «публічні» функції, що мають доступ до замкненого оточення.

```js
const bankAccount = (function () {
  let balance = 0; // приватна змінна — ззовні недоступна

  function deposit(amount) {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    balance += amount;
    return balance;
  }
  function withdraw(amount) {
    if (amount > balance) throw new Error("Insufficient funds");
    balance -= amount;
    return balance;
  }
  function getBalance() {
    return balance;
  }

  return { deposit, withdraw, getBalance }; // лише ці функції — «публічний API»
})();

console.log(bankAccount.deposit(100)); // 100
console.log(bankAccount.withdraw(30)); // 70
console.log(bankAccount.getBalance()); // 70
console.log(bankAccount.balance); // undefined — ззовні balance недоступна
```

Фабрика модулів — той самий патерн для **багатьох** незалежних екземплярів (див. також [factory.md](../patterns/factory.md)):

```js
function createBankAccount(initialBalance = 0) {
  let balance = initialBalance; // кожен виклик — окреме замикання
  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}
const accountA = createBankAccount(50);
const accountB = createBankAccount(200);
accountA.deposit(10);
console.log(accountA.getBalance(), accountB.getBalance()); // 60 200 — повністю незалежні
```

## 5. Мемоізація — кеш у замиканні

Замикання дозволяє функції пам'ятати результати попередніх викликів: кеш живе в замкненому оточенні, недоступний ззовні, і існує стільки ж, скільки сама функція.

```js
function memoize(fn) {
  const cache = new Map(); // приватний кеш, живе в замиканні
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log("from cache for", key);
      return cache.get(key);
    }
    console.log("computing for", key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

function slowSquare(n) {
  for (let i = 0; i < 1e6; i++) {} // штучна «дорога» операція
  return n * n;
}
const fastSquare = memoize(slowSquare);
console.log(fastSquare(5));
// computing for [5]
// 25
console.log(fastSquare(5));
// from cache for [5]
// 25
console.log(fastSquare(6));
// computing for [6]
// 36
```

`JSON.stringify(args)` як ключ — простий, але обмежений підхід: об'єкти з різним порядком ключів дадуть різні ключі, а функції й `undefined` у масиві перетворяться на `null`.

## 6. Каррінг і часткове застосування

Кожен рівень каррі-функції — окреме замикання, що «запам'ятовує» аргумент свого рівня:

```js
function multiply(a) {
  return function (b) {
    return function (c) {
      return a * b * c; // a і b — вільні змінні із зовнішніх замикань
    };
  };
}
console.log(multiply(2)(3)(4)); // 24

const double = multiply(2); // запам'ятали a = 2
const times6 = double(3); // запам'ятали b = 3 (a = 2 теж збережено)
console.log(times6(5)); // 30 — a=2, b=3, c=5
```

Практичне застосування — часткове застосування аргументів:

```js
function createLogger(prefix) {
  return function log(message) {
    console.log(`[${prefix}] ${message}`); // prefix «заморожений» у замиканні
  };
}
const errorLogger = createLogger("ERROR");
const infoLogger = createLogger("INFO");
errorLogger("Something went wrong"); // [ERROR] Something went wrong
infoLogger("All good"); // [INFO] All good
```

## 7. Замикання в обробниках подій та асинхронному коді

Саме через замикання колбеки й обробники подій «пам'ятають» контекст, де їх створено, навіть якщо реально викликаються набагато пізніше:

```js
function setupButtonCounter(label) {
  let clicks = 0;
  return function onClick() {
    clicks += 1;
    console.log(`"${label}" clicked ${clicks} time(s)`);
  };
}
const handleSaveClick = setupButtonCounter("Save");
handleSaveClick(); // "Save" clicked 1 time(s)
handleSaveClick(); // "Save" clicked 2 time(s)
// document.querySelector("#save").addEventListener("click", handleSaveClick);
// ^ типове застосування: обробник «пам'ятає» label і clicks між кліками
```

## 8. Замикання і пам'ять

Специфікація описує замикання як посилання на **все** лексичне оточення. Реальні рушії оптимізують це. V8 при компіляції зовнішньої функції визначає, які її змінні використовує **хоч одна** вкладена функція, і лише їх кладе в спільний об'єкт-контекст (context). Решта живе на стеку й зникає після завершення функції.

Звідси два випадки:

1. Велику змінну не використовує жодне вкладене замикання — вона **не** утримується, навіть якщо живе замикання, яке використовує іншу змінну.
2. Велику змінну використовує **будь-яке** вкладене замикання (навіть те, що вже не потрібне) — вона потрапляє в спільний контекст і утримується, поки живе **будь-яке** замикання з цього виклику. Це і є реальне джерело витоків.

```js norun
// запуск: node --expose-gc leak.js
function mb() {
  global.gc();
  return Math.round(process.memoryUsage().heapUsed / 1e6);
}
const keep = [];

function unusedByClosures() {
  const huge = new Array(5_000_000).fill(1.5);
  const n = huge.length;
  return () => n; // використовує лише n
}
for (let i = 0; i < 5; i++) keep.push(unusedByClosures());
console.log(mb()); // 3 — huge не утримується

function usedBySibling() {
  const huge = new Array(5_000_000).fill(1.5);
  const n = huge.length;
  const other = () => huge[0]; // «сусіднє» замикання, яке навіть не повертається
  return () => n; // але контекст спільний — huge живе разом із ним
}
for (let i = 0; i < 5; i++) keep.push(usedBySibling());
console.log(mb()); // 203 — 5 масивів по ~40 МБ утримуються
```

(Числа виміряні в Node 24; конкретні мегабайти залежать від версії, але різниця на порядки стабільна.)

Як зменшити ризик:

- не тримайте великі структури в змінних, які використовують вкладені функції, довше, ніж треба; якщо така змінна потрібна лише на старті — обнуліть її (`huge = null`) після використання;
- витягніть потрібне значення в окрему змінну (`const n = huge.length`) і використовуйте в замиканні лише її;
- знімайте обробники подій / таймери (`removeEventListener`, `clearInterval`), щоб звільнити самі замикання.

## 9. Фабрика функцій у циклі

```js
function createMultipliers() {
  const multipliers = [];
  for (let factor = 2; factor <= 4; factor++) {
    multipliers.push((n) => n * factor); // кожна стрілка замикає свій factor (завдяки let)
  }
  return multipliers;
}
const [double2, triple, quadruple] = createMultipliers();
console.log(double2(10), triple(10), quadruple(10)); // 20 30 40
```

> [!note] Виправлення відносно попередньої версії
> Раніше цикл починався з `factor = 1`, тож «`double2`» насправді множила на 1, `triple` — на 2, `quadruple` — на 3, і вивід був `10 20 30`. Ім'я змінної ніяк не впливає на поведінку функції — тепер діапазон `2..4` відповідає назвам.

## 10. Замикання та ітератори

Кожен об'єкт-ітератор, повернутий `[Symbol.iterator]()`, — теж замикання: він «пам'ятає» свій прогрес між викликами `next()` незалежно від інших ітераторів того самого iterable ([iterator.md](data-structures/iterator/iterator.md)):

```js
function createRange(from, to) {
  return {
    [Symbol.iterator]() {
      let current = from; // замикання навколо current — нове на кожен виклик [Symbol.iterator]()
      return {
        next() {
          return current <= to ? { value: current++, done: false } : { value: undefined, done: true };
        },
      };
    },
  };
}
const range = createRange(1, 3);
const it1 = range[Symbol.iterator]();
const it2 = range[Symbol.iterator]();
console.log(it1.next().value, it1.next().value); // 1 2 — свій прогрес
console.log(it2.next().value); // 1 — незалежний прогрес, не 3
```

## 11. Як «побачити» замикання в DevTools

Якщо поставити breakpoint (`debugger;`) усередині вкладеної функції, у панелі Scope Chrome DevTools / Node inspector з'явиться розділ **Closure** — список змінних із зовнішніх оточень, які функція фактично захопила. Туди потрапляють лише змінні, які використовує якась вкладена функція (розділ 8).

```js
function outerForDebug() {
  const secretValue = "visible in DevTools as Closure (outerForDebug)";
  const notCaptured = "absent from the Closure section";
  return function innerForDebug() {
    debugger; // Scope → Closure (outerForDebug): { secretValue }
    return secretValue;
  };
}
console.log(outerForDebug()()); // visible in DevTools as Closure (outerForDebug)
```

## Підсумок

- Closure = функція + посилання на лексичне оточення, де її створено; оточення живе, навіть коли зовнішня функція завершилась.
- Зберігається посилання на змінну (live binding), а не копія значення — пізніші зміни видно в замиканні.
- Кожен виклик зовнішньої функції створює нове, незалежне оточення.
- `var` у циклі + замикання = класична пастка (усі функції ділять одну змінну); `let` створює нову змінну на кожній ітерації, історична альтернатива — IIFE.
- Module pattern (IIFE з публічним API) — спосіб приватності до появи `#private`.
- Мемоізація — кеш у замиканні; каррінг — ланцюжок замикань, кожне «заморожує» один аргумент.
- V8 утримує лише ті змінні, які використовує хоч одне вкладене замикання, але всі замикання одного виклику ділять спільний контекст — велика змінна, використана одним із них, живе, поки живе будь-яке.
- Ітератори — теж замикання з власним прогресом.
- У DevTools замикання видно як розділ «Closure» у Scope.
