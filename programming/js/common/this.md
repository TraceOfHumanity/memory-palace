# this — контекст виклику функції

Приклади нижче виконуються як звичайний Node.js-файл (CommonJS, **не** strict mode). Де поведінка залежить від strict mode, це показано явно через `"use strict"` усередині функції.

## 1. Головне правило

`this` у звичайній функції визначається **не** місцем, де функцію оголошено (як лексичні змінні — [scope.md](variables-and-execution-context/scope.md)), а тим, **як саме її викликали**. Одна й та сама функція може мати різний `this` у різних викликах — звідси майже вся плутанина.

```js
function whoIsThis() {
  return this;
}

const objA = { name: "A", whoIsThis };
const objB = { name: "B", whoIsThis };

console.log(objA.whoIsThis().name); // A — викликано як objA.method()
console.log(objB.whoIsThis().name); // B — та сама функція, інший виклик → інший this

const detachedFn = objA.whoIsThis;
console.log(detachedFn() === globalThis); // true — sloppy mode: this «падає» на globalThis
```

У strict mode (ES-модулі, класи, `"use strict"`) той самий «відірваний» виклик дав би `this === undefined`, і `detachedFn().name` кинув би `TypeError`.

## 2. Чотири правила за пріоритетом

Для `this` у **звичайній** (не стрілковій) функції перевіряй правила по черзі — перше, що підходить, визначає `this`:

1. **new binding** — виклик через `new Fn()`;
2. **explicit binding** — `call()` / `apply()` / `bind()`;
3. **implicit binding** — виклик як метод: `obj.method()`;
4. **default binding** — просто `fn()` (найнижчий пріоритет).

Стрілкові функції в цю систему не входять — у них окреме правило, лексичний `this` (розділ 7).

## 3. Default binding — звичайний виклик `fn()`

У strict mode `this` при звичайному виклику — `undefined`:

```js
function strictDefaultThis() {
  "use strict";
  return this;
}
console.log(strictDefaultThis()); // undefined
```

У нестрогому режимі `this` «падає» на глобальний об'єкт `globalThis` (`window` у браузері, `global` у Node):

```js
function sloppyDefaultThis() {
  return this === globalThis;
}
console.log(sloppyDefaultThis()); // true
```

Чому це важливо: випадкове потрапляння `this` на `globalThis` — стара пастка, через яку код тихо читав і записував глобальні змінні. Strict mode значною мірою існує саме для того, щоб перетворити цю тиху помилку на явний `undefined` → `TypeError`.

## 4. Implicit binding — виклик як метод `obj.method()`

Коли функцію викликано через крапку, `this` — об'єкт **зліва від крапки** в момент виклику, незалежно від того, де метод визначено:

```js
const userImplicit = {
  name: "Oleh",
  greet() {
    console.log(`Hi, I am ${this.name}`);
  },
};
userImplicit.greet(); // Hi, I am Oleh
```

### 4.1. this визначає остання частина перед викликом

```js
const outerImplicit = {
  name: "outer",
  inner: {
    name: "inner",
    greet() {
      console.log(this.name);
    },
  },
};
outerImplicit.inner.greet(); // inner — this === outerImplicit.inner, а не outerImplicit
```

### 4.2. Класична пастка: «відірваний» метод

Implicit binding діє лише в момент виклику `obj.method()`. Якщо ту саму функцію присвоїти змінній і викликати окремо — зв'язок з об'єктом втрачено, спрацьовує default binding:

```js
const counterObj = {
  count: 0,
  increment() {
    this.count++;
    return this.count;
  },
};

console.log(counterObj.increment()); // 1 — this === counterObj

const incrementDetached = counterObj.increment; // лише копія посилання на функцію
console.log(incrementDetached()); // NaN — this === globalThis, globalThis.count був undefined
console.log(counterObj.count); // 1 — сам об'єкт не змінився
```

У strict mode (наприклад, у класі) той самий виклик кинув би `TypeError: Cannot read properties of undefined`.

Та сама пастка ламає передачу методів як колбеків. `this` тоді визначає **той, хто викликає** колбек:

- `setTimeout(obj.method)` — у Node `this` буде об'єктом `Timeout`, у браузері — `window`;
- `element.addEventListener("click", obj.method)` — DOM викликає обробник з `this === element` (`event.currentTarget`).

В обох випадках `this` — **не** `obj`:

```js
const timerTarget = {
  count: 0,
  increment() {
    this.count++; // this тут — не timerTarget
  },
};
setTimeout(function () {
  console.log(this.constructor.name); // Timeout — у Node
});
setTimeout(timerTarget.increment);
setTimeout(() => console.log(timerTarget.count), 10); // 0 — метод збільшив count на об'єкті Timeout
```

## 5. Explicit binding — `call()` / `apply()` / `bind()`

Ці методи є в кожної звичайної функції (через `Function.prototype`) і дозволяють явно вказати `this`:

```js
function introduce(greeting, punctuation) {
  console.log(`${greeting}, I am ${this.name}${punctuation}`);
}

const personX = { name: "Maria" };
const personY = { name: "Ivan" };
```

### 5.1. `call(thisArg, arg1, arg2, ...)` — аргументи переліком

```js
introduce.call(personX, "Hi", "!"); // Hi, I am Maria!
introduce.call(personY, "Hello", "."); // Hello, I am Ivan.
```

### 5.2. `apply(thisArg, [args])` — аргументи масивом

```js
introduce.apply(personX, ["Good day", "!"]); // Good day, I am Maria!
```

Різниця `call`/`apply` — лише у формі передачі аргументів. Історичне застосування `apply` — виклик з масивом аргументів довільної довжини (до появи spread):

```js
console.log(Math.max.apply(null, [3, 1, 4, 1, 5])); // 5
console.log(Math.max(...[3, 1, 4, 1, 5])); // 5 — сучасний еквівалент
```

### 5.3. `bind(thisArg, ...args)` — нова функція з прив'язаним this

`bind()` не викликає функцію, а повертає **нову**, у якій `this` (і, за бажанням, частина аргументів) зафіксовані назавжди:

```js
const introduceAsMaria = introduce.bind(personX);
introduceAsMaria("Hi", "!"); // Hi, I am Maria!

// часткове застосування (partial application):
const greetAsMaria = introduce.bind(personX, "Hey");
greetAsMaria("!!!"); // Hey, I am Maria!!! — thisArg і перший аргумент зафіксовані

// повторний call()/bind() уже прив'язаний this не змінює:
const alreadyBound = introduce.bind(personX);
alreadyBound.call(personY, "Hi", "?"); // Hi, I am Maria? — все одно Maria
```

Саме `bind()` найчастіше рятує «втрачений» `this` з розділу 4.2:

```js
const safeIncrement = counterObj.increment.bind(counterObj);
console.log(safeIncrement()); // 2 — тепер безпечно передавати як колбек
```

У sloppy mode `thisArg`, що дорівнює `null`/`undefined`, замінюється на `globalThis`, а примітиви «загортаються» в об'єкти; у strict mode `this` дорівнює саме переданому значенню:

```js
function showThisType() {
  return typeof this;
}
function showThisTypeStrict() {
  "use strict";
  return typeof this;
}
console.log(showThisType.call(42), showThisTypeStrict.call(42)); // object number
```

## 6. new binding — виклик через `new Fn()`

При виклику з `new` рушій (спрощено):

1. створює новий порожній об'єкт;
2. встановлює його `[[Prototype]]` = `Fn.prototype` ([prototypal-inheritance.md](prototypal-inheritance.md));
3. викликає `Fn` з `this` = цей об'єкт;
4. якщо `Fn` явно не повернула **інший об'єкт** — повертає створений.

```js
function Cat(name) {
  console.log(this); // Cat {} — щойно створений порожній об'єкт
  this.name = name;
}

const cat1 = new Cat("Whiskers");
console.log(cat1.name); // Whiskers
console.log(cat1 instanceof Cat); // true
```

Якщо конструктор явно повертає об'єкт — повертається саме він, а створений `this` відкидається. Повернений примітив ігнорується:

```js
function WeirdConstructor() {
  this.value = "will not be used";
  return { value: "an explicitly returned object wins" };
}
console.log(new WeirdConstructor().value); // an explicitly returned object wins

function ReturnsPrimitive() {
  this.value = "will be used";
  return "this string is ignored";
}
console.log(new ReturnsPrimitive().value); // will be used
```

Конструктор класу працює за тим самим new binding:

```js
class Dog {
  constructor(name) {
    this.name = name; // this === новий екземпляр Dog
  }
}
console.log(new Dog("Rex").name); // Rex
```

Що буде, якщо викликати функцію-конструктор **без** `new`:

```js
function Bird(name) {
  this.name = name; // звичайний виклик → default binding
}
Bird("Polly"); // sloppy mode: this === globalThis
console.log(globalThis.name); // Polly — властивість «втекла» на глобальний об'єкт!
delete globalThis.name;

function StrictBird(name) {
  "use strict";
  this.name = name; // this === undefined
}
try {
  StrictBird("Polly");
} catch (err) {
  console.log(err.message); // Cannot set properties of undefined (setting 'name')
}
```

Клас без `new` викликати взагалі не можна — рушій захищає від цієї пастки:

```js
try {
  Dog("Rex");
} catch (err) {
  console.log(err.message); // Class constructor Dog cannot be invoked without 'new'
}
```

## 7. Стрілкові функції — лексичний this

Стрілкова функція **не має власного** `this`: вона бере `this` з найближчого звичайного оточення, де її **написано** — так само, як змінну по scope chain. Жодне з чотирьох правил на неї не діє: `call`/`apply`/`bind` не змінюють її `this`, а `new` кидає помилку.

```js
const arrowThis = () => this;
console.log(arrowThis() === module.exports); // true — this верхнього рівня CommonJS-файлу
console.log(arrowThis.call({ other: true }) === module.exports); // true — call не допоміг

const arrowConstructor = () => {};
try {
  new arrowConstructor();
} catch (err) {
  console.log(err.message); // arrowConstructor is not a constructor
}
```

(На верхньому рівні ES-модуля `this` — `undefined`, у класичному браузерному скрипті — `window`; розділ 11.)

### 7.1. Головне застосування: this у вкладених колбеках

До стрілок звичайна функція всередині методу мала **свій** `this` (default binding, бо її викликає `setTimeout`, а не об'єкт) і втрачала зв'язок з об'єктом:

```js
const timer = {
  label: "timer label",
  startBroken() {
    setTimeout(function () {
      console.log(this.label); // undefined — this тут об'єкт Timeout, а не timer
    }, 20);
  },
  startFixed() {
    setTimeout(() => {
      console.log(this.label); // timer label — стрілка взяла this зі startFixed()
    }, 30);
  },
  startLegacy() {
    const self = this; // до ES2015: «зберегти» this у змінну (self/that/_this)
    setTimeout(function () {
      console.log(self.label); // timer label — через замикання на self
    }, 40);
  },
};
timer.startBroken();
timer.startFixed();
timer.startLegacy();
```

### 7.2. Коли стрілки шкодять: методи об'єктів

Стрілка як метод візьме `this` з оточення, де **визначено об'єкт** (зазвичай верхній рівень модуля), а не з виклику `obj.method()`:

```js
const brokenByArrow = {
  name: "I am broken",
  greet: () => {
    console.log(this.name); // this — з верхнього рівня файлу, а не brokenByArrow
  },
};
brokenByArrow.greet(); // undefined — у CommonJS this === module.exports ({}); в ES-модулі — TypeError
```

Правило: для методів, яким потрібен `this === сам об'єкт`, використовуй звичайний синтаксис методу (`method() {}`), а не стрілку.

## 8. this у класах

Тіло класу **завжди** в strict mode, тому «відірваний» метод отримує `this === undefined`, а не `globalThis`:

```js
class Wallet {
  #balance = 0; // приватне поле
  constructor(owner) {
    this.owner = owner; // new binding
  }
  deposit(amount) {
    this.#balance += amount; // this — екземпляр, якщо викликано як wallet.deposit()
    return this.#balance;
  }
}

const wallet = new Wallet("Nastia");
console.log(wallet.deposit(100)); // 100

const depositDetached = wallet.deposit;
try {
  depositDetached(50);
} catch (err) {
  console.log(err.message); // Cannot read properties of undefined (reading '#balance')
}
```

(Якби метод викликали з **іншим** об'єктом — `depositDetached.call({}, 50)`, — повідомлення було б «Cannot read private member #balance from an object whose class did not declare it».)

### 8.1. Class field зі стрілкою — «автоприв'язаний» метод

Для методів, які точно передаватимуться як колбеки (обробники подій), оголошують **поле класу** зі стрілковою функцією. Поля ініціалізуються для кожного екземпляра, тож стрілка захоплює `this` саме цього екземпляра:

```js
class Button {
  label = "Click me";

  handleClickUnsafe() {
    return this?.label; // залежить від способу виклику
  }

  handleClickSafe = () => {
    return this.label; // this назавжди === екземпляр
  };
}

const button = new Button();
const unsafeCallback = button.handleClickUnsafe;
const safeCallback = button.handleClickSafe;
console.log(unsafeCallback()); // undefined — this втрачено (strict: undefined)
console.log(safeCallback()); // Click me
```

Ціна — окрема функція в кожному екземплярі замість однієї на прототипі ([prototypal-inheritance.md](prototypal-inheritance.md), розділ 10).

## 9. Пріоритет правил

new > explicit (`bind`) > implicit (`obj.method()`) > default; стрілки — поза системою.

```js
function showPriorityThis() {
  return this.label;
}
const objForPriority = { label: "object", showPriorityThis };

// explicit перемагає implicit:
objForPriority.bound = showPriorityThis.bind({ label: "bound via bind()" });
console.log(objForPriority.bound()); // bound via bind() — хоча виклик через крапку

// new перемагає bind:
function BoundConstructor(value) {
  this.value = value;
}
const HardBound = BoundConstructor.bind({ value: "ignored" });
const instanceFromBound = new HardBound("new object wins");
console.log(instanceFromBound.value); // new object wins
```

## 10. globalThis — універсальне ім'я глобального об'єкта (ES2020)

Раніше кожне середовище мало свою назву: `window`/`self` у браузері, `global` у Node.js, `this` на верхньому рівні старих скриптів. `globalThis` — одне стандартне ім'я для всіх середовищ:

```js
console.log(typeof globalThis); // object
console.log(globalThis === global); // true — у Node
```

## 11. this на верхньому рівні — залежить від середовища

| Середовище | `this` на верхньому рівні |
|---|---|
| ES-модуль (`import`/`export`, `.mjs`, `<script type="module">`) | `undefined` |
| Node.js CommonJS (`.cjs` або `.js` без `"type": "module"`) | `module.exports` (спочатку `{}`) |
| Класичний браузерний `<script>` | `window` (`globalThis`) |

```js
console.log(this === module.exports); // true — цей файл виконується як CommonJS
```

## 12. Алгоритм «який тут this»

1. Стрілкова функція? → шукай `this` у найближчій звичайній функції / на верхньому рівні **навколо** неї (лексично).
2. Викликана через `new`? → новий об'єкт.
3. Через `call`/`apply` або це результат `bind`? → перший аргумент (але `new` переможе навіть `bind`).
4. Викликана як `obj.method()`? → `obj` — те, що безпосередньо перед крапкою в момент виклику.
5. Просто `fn()`? → `undefined` у strict mode, `globalThis` — поза ним.
6. Колбек, який викликає чужий код (`setTimeout`, `addEventListener`, бібліотека)? → `this` вирішує той код; не покладайся на нього — використовуй стрілку або `bind`.

## Підсумок

- `this` визначається способом виклику функції, а не місцем її оголошення.
- Пріоритет правил: new > explicit (`call`/`apply`/`bind`) > implicit (`obj.method()`) > default (`fn()`).
- Default binding: `undefined` у strict mode, `globalThis` — поза ним; тіла класів і ES-модулі завжди strict.
- Implicit binding: `this` — об'єкт безпосередньо перед крапкою в момент виклику; «відірваний» метод втрачає цей зв'язок.
- Переданий колбеком метод отримує `this` від того, хто його викликає: `Timeout` у Node-`setTimeout`, `window` у браузерному, DOM-елемент в `addEventListener`.
- `call` викликає одразу з аргументами переліком, `apply` — масивом, `bind` повертає нову функцію з назавжди зафіксованим `this`.
- new binding: новий об'єкт з прототипом `Fn.prototype`; явно повернений об'єкт заміщує його, примітив ігнорується.
- Стрілки не мають власного `this`: беруть його лексично, `call`/`apply`/`bind` на них не діють, `new` — `TypeError`.
- Стрілки — для вкладених колбеків; для методів об'єкта, яким потрібен `this`, — звичайний синтаксис методу.
- Class field зі стрілкою — метод, прив'язаний до екземпляра, ціною окремої функції на кожен екземпляр.
- `this` на верхньому рівні: `undefined` в ES-модулі, `module.exports` у CommonJS, `window` у класичному скрипті.
