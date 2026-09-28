# Constructor — патерн «шаблон для створення об'єктів через new»

## 1. Що таке Constructor

Constructor — найбазовіший спосіб створення об'єктів одного «виду»: функція/клас-шаблон, який викликають з `new`, і він ініціалізує новий об'єкт (`this`) власними даними та отримує спільні методи через прототип.

Це основа, на якій стоять інші породжуючі патерни: Factory — вирішує, який конструктор викликати ([factory.md](factory.md)); Builder — збирає аргументи для конструктора ([builder.md](builder.md)); Prototype — клонує замість виклику конструктора ([prototype.md](prototype.md)); Singleton — обмежує конструктор одним екземпляром ([singleton.md](singleton.md)); DI — передає залежності в конструктор ([dependency-injection.md](dependency-injection.md)).

## 2. Constructor-функція (докласовий спосіб)

```js
function Person(name, age) {
  // `this` — щойно створений порожній об'єкт (детально — common/this.md)
  this.name = name;
  this.age = age;
}

// методи кладуть у prototype, щоб вони були одні на всіх екземплярів
Person.prototype.greet = function () {
  return `Hello, I'm ${this.name}`;
};

const olya = new Person("Olya", 20);
const ivan = new Person("Ivan", 25);

console.log(olya.greet()); // Hello, I'm Olya
console.log(olya.greet === ivan.greet); // true — один метод у пам'яті
console.log(olya instanceof Person); // true
console.log(olya.constructor === Person); // true
console.log(Object.getPrototypeOf(olya) === Person.prototype); // true
// (прототипний ланцюжок — common/prototypal-inheritance.md)
```

Конвенція: конструктори називають з великої літери — це сигнал «викликай з `new`».

## 3. Що саме робить `new` (4 кроки)

```js
// new Person("Olya", 20) робить приблизно так:
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype); // 1. новий об'єкт з правильним прототипом
  const result = Constructor.apply(obj, args); // 2. виклик конструктора з this = obj
  // 3. якщо конструктор повернув об'єкт — беремо його; інакше obj
  return result !== null && (typeof result === "object" || typeof result === "function")
    ? result
    : obj; // 4. повертаємо результат
}

const manual = myNew(Person, "Maria", 30);
console.log(manual.greet()); // Hello, I'm Maria
console.log(manual instanceof Person); // true
```

## 4. return у конструкторі

```js
function ReturnsObject() {
  this.a = 1;
  return { b: 2 }; // об'єкт перебиває this
}
function ReturnsPrimitive() {
  this.a = 1;
  return 42; // примітив ігнорується
}

console.log(new ReturnsObject()); // { b: 2 }
console.log(new ReturnsPrimitive()); // ReturnsPrimitive { a: 1 }
```

Це і використовує Singleton (конструктор повертає наявний екземпляр).

## 5. Пастка: забули new

```js
function Careless(name) {
  this.name = name;
}

// у sloppy-режимі `this` = globalThis: властивість "витікає" в глобальний
// простір, а результат undefined:
const broken = Careless("Olya");
console.log(broken); // undefined
console.log(globalThis.name); // Olya — забруднили глобальний об'єкт!
delete globalThis.name;

// захист 1: new.target (undefined, якщо викликали без new)
function Safe(name) {
  if (!new.target) return new Safe(name);
  this.name = name;
}
console.log(Safe("Olya").name); // Olya — працює і без new
console.log(new Safe("Ivan").name); // Ivan
```

Захист 2: у strict-режимі `this` = `undefined` і буде `TypeError`. Захист 3: `class` — без `new` викликати заборонено (розділ 6).

## 6. class — сучасний синтаксис

```js
class User {
  // поля класу — ініціалізуються перед тілом конструктора
  role = "user";
  #password; // приватне поле (детально — common/data-structures/Object/Object.md)

  static count = 0; // статична властивість

  constructor(name, password) {
    this.name = name;
    this.#password = password;
    User.count++;
  }

  checkPassword(input) {
    return this.#password === input;
  }

  greet() {
    return `Hello, I'm ${this.name} (${this.role})`;
  }
}

const u = new User("Olya", "secret");
console.log(u.greet()); // Hello, I'm Olya (user)
console.log(u.checkPassword("secret")); // true
console.log(u.password); // undefined — приватне поле недоступне зовні
console.log(User.count); // 1

try {
  User("Olya", "x"); // без new
} catch (err) {
  console.log(err.name + ":", err.message);
  // TypeError: Class constructor User cannot be invoked without 'new'
}

// class — це "синтаксичний цукор" над конструкторами й прототипами:
console.log(typeof User); // function
console.log(Object.hasOwn(u, "greet")); // false — метод на User.prototype, не на екземплярі
console.log(Object.hasOwn(User.prototype, "greet")); // true
```

## 7. Методи: в конструкторі vs на прототипі

```js
class WithOwnMethod {
  constructor() {
    this.hello = () => "hello"; // ❌ нова функція на кожен екземпляр
  }
  hi() {
    return "hello"; // ✅ одна функція на прототипі
  }
}

const w1 = new WithOwnMethod();
const w2 = new WithOwnMethod();
console.log(w1.hello === w2.hello); // false — дублювання в пам'яті
console.log(w1.hi === w2.hi); // true
```

Виняток: arrow-функція як поле зберігає `this` (колбеки), ціною пам'яті. Детально про `this`-пастки — `common/this.md`.

## 8. Наслідування: extends і super()

```js
class Admin extends User {
  constructor(name, password, level) {
    // у похідному класі super() обов'язково перед першим використанням this
    super(name, password);
    this.level = level;
    this.role = "admin";
  }

  greet() {
    return `${super.greet()}, level ${this.level}`;
  }
}

const admin = new Admin("Maria", "pass", 3);
console.log(admin.greet()); // Hello, I'm Maria (admin), level 3
console.log(admin instanceof User); // true
console.log(User.count); // 2 — конструктор батька теж відпрацював

class BrokenAdmin extends User {
  constructor(name) {
    try {
      this.level = 1; // ❌ this ще не створено — його створює батьківський конструктор
    } catch (err) {
      console.log(err.name + ":", err.message);
    }
    super(name, "x");
  }
}
new BrokenAdmin("Test");
// ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
```

Якщо у похідного класу конструктора немає — JS додає автоматично: `constructor(...args) { super(...args); }`.

## 9. new.target у класах: абстрактний клас

```js
class Shape {
  constructor() {
    if (new.target === Shape) {
      throw new TypeError("Shape is abstract — create a subclass");
    }
  }
  area() {
    throw new Error("area() is not implemented");
  }
}

class Circle extends Shape {
  constructor(r) {
    super();
    this.r = r;
  }
  area() {
    return +(Math.PI * this.r ** 2).toFixed(2);
  }
}

try {
  new Shape();
} catch (err) {
  console.log(err.message); // Shape is abstract — create a subclass
}
console.log(new Circle(2).area()); // 12.57
```

## 10. Валідація і значення за замовчуванням

```js
class Product {
  // options-об'єкт з деструктуризацією — читабельніше за позиційні аргументи
  constructor({ name, price = 0, tags = [] } = {}) {
    if (!name) throw new Error("name is required");
    if (price < 0) throw new RangeError("price cannot be negative");
    this.name = name;
    this.price = price;
    this.tags = [...tags]; // копія, щоб не ділити масив із зовнішнім кодом
  }
}

console.log(new Product({ name: "Book", price: 100 }));
// Product { name: 'Book', price: 100, tags: [] }
try {
  new Product({ price: 5 });
} catch (err) {
  console.log(err.message); // name is required
}
```

Конструктор має створювати валідний об'єкт або кидати помилку — напівготових екземплярів бути не повинно. Для багатьох опцій і складної валідації див. Builder ([builder.md](builder.md)).

## 11. Обмеження конструкторів

Конструктор не може бути `async`: він завжди повертає об'єкт, а не `Promise`. Рішення — статичний async-метод-фабрика:

```js
class Connection {
  constructor(handle) {
    this.handle = handle; // конструктор приймає вже отримане значення
  }
  static async create() {
    const handle = await Promise.resolve("connection-1"); // асинхронна ініціалізація
    return new Connection(handle);
  }
}
Connection.create().then((c) => console.log(c.handle)); // connection-1
// (детально — patterns/factory.md, розділ про async-фабрики)
```

Перевантаження за типами немає: один конструктор на клас. Варіанти «створити з рядка / з масиву» — статичні фабричні методи:

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static fromString(s) {
    const [x, y] = s.split(",").map(Number);
    return new Point(x, y);
  }
  static fromArray([x, y]) {
    return new Point(x, y);
  }
}
console.log(Point.fromString("3,4")); // Point { x: 3, y: 4 }
console.log(Point.fromArray([5, 6])); // Point { x: 5, y: 6 }
```

Важка робота (запити, файли) в конструкторі — погана ідея: складно тестувати і обробляти помилки. Конструктор лише присвоює.

Виклик перевизначуваного методу з конструктора батька — пастка:

```js
class Base {
  constructor() {
    console.log(this.describe()); // викличеться метод підкласу
  }
  describe() {
    return "Base";
  }
}
class Derived extends Base {
  value = "ready";
  describe() {
    return `Derived, value = ${this.value}`; // поле підкласу ще не ініціалізоване
  }
}
new Derived(); // Derived, value = undefined
```

## 12. Reflect.construct та вбудовані конструктори

```js
// Reflect.construct — програмний виклик `new` (з можливістю задати new.target)
console.log(Reflect.construct(Person, ["Olya", 20]).greet()); // Hello, I'm Olya
// Використовується в Proxy-пастці construct (common/data-structures/Proxy/Proxy.md).

// вбудовані конструктори працюють за тим самим принципом:
//   new Map(), new Set(), new Date(), new Error(), new Array(3)
// але обгортки примітивів new String("a"), new Number(1), new Boolean(false)
// створюють об'єкти і майже завжди є помилкою (common/type-coercion.md):
console.log(typeof new String("a")); // object
console.log(typeof String(1)); // string — без new це просто перетворення
console.log(new Boolean(false) ? "truthy" : "falsy"); // truthy — об'єкт завжди truthy
```

## Підсумок

- Constructor — функція/клас, що викликається з `new` і ініціалізує новий об'єкт (`this`); спільні методи лежать на `prototype`.
- `new` робить 4 кроки: створити об'єкт із прототипом `Constructor.prototype`, викликати конструктор з `this` = цей об'єкт, взяти повернений об'єкт (примітиви ігноруються), інакше — створений об'єкт.
- `return` об'єкта з конструктора перебиває `this` (на цьому будується Singleton), примітив ігнорується.
- Забутий `new` у функції-конструкторі «витікає» у `globalThis`; захист — `new.target`, strict mode або `class` (без `new` кидає `TypeError`).
- `class` — синтаксичний цукор над конструктор-функціями та прототипами; додає приватні поля (`#`), `static`, `extends`/`super`.
- У похідному класі `super()` — до використання `this`; без явного конструктора JS додає `constructor(...args) { super(...args) }`.
- `new.target` дозволяє робити абстрактні класи.
- Методи на прототипі економлять пам'ять; методи в конструкторі (arrow-поля) дублюються на кожен екземпляр.
- Конструктор має або створити валідний об'єкт, або кинути помилку; він не може бути `async` і не перевантажується — для цього статичні фабричні методи (`fromString`, `create`).
- Не викликайте з конструктора перевизначувані методи: поля підкласу ще не ініціалізовані.
- Не використовуйте `new String`/`Number`/`Boolean` — це об'єкти-обгортки.
