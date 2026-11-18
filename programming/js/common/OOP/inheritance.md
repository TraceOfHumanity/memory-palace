# ООП: наслідування — повторне використання поведінки через `extends`

## 0. Загальна ідея

Наслідування дозволяє створити клас на основі іншого: нащадок отримує поля й методи батька і може додати свої або перевизначити батьківські. Відношення має бути «**є**» (is-a): собака **є** твариною, книга **є** товаром. У JavaScript `extends` — синтаксис над ланцюжком прототипів ([prototypal-inheritance.md](../prototypal-inheritance.md)); TypeScript додає до нього перевірку типів.

## 1. Базовий приклад

```ts
class Animal {
  constructor(public name: string) {} // public-параметр одразу створює поле this.name

  move(distance: number): string {
    return `${this.name} moved ${distance}m.`;
  }
}

class Dog extends Animal {
  constructor(name: string = "Dog") {
    super(name); // спершу батьківський конструктор — лише потім доступний this
  }

  bark(): string {
    return `${this.name}: Woof!`;
  }
}

const myDog = new Dog("Buddy");
console.log(myDog.name); // Buddy
console.log(myDog instanceof Dog, myDog instanceof Animal); // true true
console.log(myDog.move(10)); // Buddy moved 10m. — успадкований метод
console.log(myDog.bark()); // Buddy: Woof! — власний метод
console.log(new Dog().name); // Dog — значення параметра за замовчуванням
```

Якщо нащадок не додає власної логіки в конструктор, конструктор можна взагалі не писати — він успадкується автоматично.

## 2. Перевизначення методів і `super.method()`

Нащадок може замінити метод батька, а через `super.method()` — викликати батьківську версію і доповнити її:

```ts
class Product {
  constructor(
    public id: string,
    public price: number,
    public description: string,
  ) {}

  display(): string {
    return `Product ID: ${this.id}, Price: ${this.price}, Description: ${this.description}`;
  }
}

class Book extends Product {
  constructor(
    id: string,
    price: number,
    description: string,
    public author: string,
  ) {
    super(id, price, description);
  }

  override display(): string {
    return `${super.display()}, Author: ${this.author}`;
  }
}

class ElectronicProduct extends Product {
  constructor(
    id: string,
    price: number,
    description: string,
    public brand: string,
  ) {
    super(id, price, description);
  }

  override display(): string {
    return `${super.display()}, Brand: ${this.brand}`;
  }
}

const myBook = new Book("B-1", 10, "A book about dogs", "John Doe");
const myLaptop = new ElectronicProduct("E-1", 1200, "A 14-inch laptop", "Lenovo");
console.log(myBook.display()); // Product ID: B-1, Price: 10, Description: A book about dogs, Author: John Doe
console.log(myLaptop.display()); // Product ID: E-1, Price: 1200, Description: A 14-inch laptop, Brand: Lenovo
```

Ключове слово `override` (TS 4.3+) явно позначає перевизначення. З прапорцем `noImplicitOverride` компілятор вимагає його всюди — і помітить, якщо метод батька перейменували, а нащадок «перевизначає» те, чого вже немає:

```ts
// class Magazine extends Product { override show() { return ""; } } // ❌ This member cannot have an 'override' modifier because it is not declared in the base class 'Product'.
```

## 3. Поліморфізм: код працює з батьківським типом

Масив `Product[]` може містити будь-яких нащадків, і `display()` викличе правильну версію для кожного — рішення приймається під час виконання, за фактичним об'єктом:

```ts
const cart: Product[] = [myBook, myLaptop, new Product("P-1", 5, "A pen")];
for (const item of cart) {
  console.log(item.display());
}
// Product ID: B-1, Price: 10, Description: A book about dogs, Author: John Doe
// Product ID: E-1, Price: 1200, Description: A 14-inch laptop, Brand: Lenovo
// Product ID: P-1, Price: 5, Description: A pen
```

Через тип `Product` доступне лише те, що оголошено в `Product`; специфічні поля нащадка потребують звуження:

```ts
// cart[0].author; // ❌ Property 'author' does not exist on type 'Product'.
const first = cart[0];
if (first instanceof Book) {
  console.log(first.author); // John Doe — після instanceof TS знає, що це Book
}
```

## 4. `protected` — доступ для нащадків, але не ззовні

```ts
class Counter {
  protected count = 0;
  increment(): number {
    return ++this.count;
  }
}

class ResettableCounter extends Counter {
  reset(): void {
    this.count = 0; // нащадок має доступ до protected
  }
}

const counter = new ResettableCounter();
counter.increment();
counter.increment();
counter.reset();
console.log(counter.increment()); // 1
// counter.count; // ❌ Property 'count' is protected and only accessible within class 'Counter' and its subclasses.
```

## 5. Коли наслідування — погана ідея

- **Глибокі ієрархії** (4–5 рівнів) важко змінювати: правка в базовому класі зачіпає всіх нащадків («крихкий базовий клас»).
- **Наслідування заради повторного використання коду**, без відношення «є», створює дивні зв'язки: `class Car extends Engine` — машина **має** двигун, а не **є** двигуном.
- **Нащадок, що порушує очікування від батька**, ламає код, який працює з батьківським типом, — це принцип Liskov ([liskov-substitution.md](../SOLID/liskov-substitution.md)).

Альтернатива — **композиція**: об'єкт містить інші об'єкти й делегує їм роботу («has-a»). Поширене правило — «composition over inheritance»: наслідування лише для справжнього «is-a», в інших випадках — композиція (див. також міксини в [prototypal-inheritance.md](../prototypal-inheritance.md), розділ 11).

```ts
class Engine {
  start(): string {
    return "engine started";
  }
}
class Car {
  private engine = new Engine(); // Car МАЄ Engine — композиція
  drive(): string {
    return `${this.engine.start()}, driving`;
  }
}
console.log(new Car().drive()); // engine started, driving
```

## Підсумок

- `extends` створює клас-нащадок, що успадковує поля й методи батька; у TS це синтаксис над ланцюжком прототипів плюс перевірка типів.
- У конструкторі нащадка `super(...)` викликається до першого звернення до `this`.
- Перевизначений метод може викликати батьківську версію через `super.method()`; `override` (+ `noImplicitOverride`) захищає від перевизначення неіснуючого методу.
- Поліморфізм: через батьківський тип викликається версія методу фактичного об'єкта; специфічні члени нащадка потребують звуження (`instanceof`).
- `protected` — доступ у класі та нащадках, але не ззовні.
- Наслідування — лише для відношення «is-a» і неглибоких ієрархій; для «has-a» — композиція.

## Задачі для закріплення

23 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне успадкований метод у нащадка?

```js
(() => { class A { hi() { return 'hi'; } } class B extends A {} return new B().hi(); })()
```

**2.** Що дасть `super.method()` у перевизначеному методі?

```js
(() => { class A { hi() { return 'A'; } } class B extends A { hi() { return super.hi() + 'B'; } } return new B().hi(); })()
```

**3.** Що станеться, якщо не викликати `super()` у конструкторі нащадка?

```js
(() => { class A {} class B extends A { constructor() { } } try { new B(); } catch (e) { return e.name + ': ' + e.message; } })()
```

**4.** Чи можна використати `this` до `super()`?

```js
(() => { class A {} class B extends A { constructor() { try { this.x = 1; } catch (e) { globalThis.__e = e.message; } super(); } } new B(); return globalThis.__e; })()
```

**5.** Що поверне `instanceof` для ланцюжка?

```js
(() => { class A {} class B extends A {} class C extends B {} const c = new C(); return [c instanceof A, c instanceof B, c instanceof C, new A() instanceof C]; })()
```

**6.** Що поверне поліморфний масив об'єктів?

```js
(() => { class Animal { speak() { return '...'; } } class Dog extends Animal { speak() { return 'woof'; } } class Cat extends Animal { speak() { return 'meow'; } } return [new Animal(), new Dog(), new Cat()].map(a => a.speak()); })()
```

### Рівень 2. Деталі й поведінка

**7.** Що поверне `constructor.name` у ланцюжку?

```js
(() => { class A {} class B extends A {} const b = new B(); return [b.constructor.name, Object.getPrototypeOf(B).name, Object.getPrototypeOf(b.constructor.prototype).constructor.name]; })()
```

**8.** Чи успадковуються статичні члени?

```js
(() => { class A { static kind = 'base'; static make() { return new this(); } } class B extends A {} return [B.kind, B.make() instanceof B]; })()
```

**9.** Що дасть доступ до `super` у статичному методі?

```js
(() => { class A { static who() { return 'A'; } } class B extends A { static who() { return super.who() + 'B'; } } return B.who(); })()
```

**10.** Що станеться при перевизначенні поля у нащадку та методу, що читає його в батьківському конструкторі?

```js
(() => { class A { constructor() { this.init = this.name(); } name() { return 'A'; } } class B extends A { name() { return 'B'; } } return new B().init; })()
```

**11.** Що поверне поле, ініціалізоване у нащадку, якщо батьківський конструктор читає його?

```js
(() => { class A { constructor() { this.seen = this.f; } } class B extends A { f = 'set'; } return new B().seen; })()
```

**12.** Як наслідувати від `Array`?

```js
(() => { class Stack extends Array { top() { return this[this.length - 1]; } } const s = new Stack(); s.push(1, 2, 3); return [s.top(), s.length, s instanceof Array, Array.isArray(s)]; })()
```

### Рівень 3. Нюанси та пастки

**13.** Що поверне `map` для нащадка `Array` (Symbol.species)?

```js
(() => { class MyArr extends Array {} const m = MyArr.from([1, 2, 3]).map(x => x * 2); return [m instanceof MyArr, m.length]; })()
```

**14.** Як наслідувати `Error`?

```js
(() => { class AppError extends Error { constructor(m, code) { super(m); this.name = 'AppError'; this.code = code; } } const e = new AppError('boom', 42); return [e instanceof Error, e.name, e.message, e.code, String(e)]; })()
```

**15.** Що робить абстрактний метод із `new.target`?

```js
(() => { class A { constructor() { if (new.target === A) throw new Error('abstract'); } } class B extends A {} try { new A(); } catch (e) { return [e.message, new B() instanceof A]; } })()
```

**16.** Що дасть композиція замість наслідування?

```js
(() => { class Engine { start() { return 'vroom'; } } class Car { constructor() { this.engine = new Engine(); } start() { return this.engine.start(); } } return new Car().start(); })()
```

**17.** Чому `Square extends Rectangle` — класична проблема?

```js
(() => { class Rect { constructor(w, h) { this.w = w; this.h = h; } setW(w) { this.w = w; } area() { return this.w * this.h; } } class Square extends Rect { setW(w) { this.w = w; this.h = w; } } const r = new Rect(2, 5); r.setW(3); const s = new Square(2, 2); s.setW(3); return [r.area(), s.area()]; })()
```

**18.** Що дає глибокий ланцюжок наслідування для довжини пошуку методу?

```js
(() => { class A { m() { return 'A.m'; } } class B extends A {} class C extends B {} class D extends C {} const d = new D(); let n = 0; for (let p = Object.getPrototypeOf(d); p; p = Object.getPrototypeOf(p)) n++; return [d.m(), n]; })()
```

### Рівень 4. Практика

**19.** Коли наслідування — погана ідея?

**20.** Що таке крихкий базовий клас?

**21.** Чим `protected` відрізняється від `private` у TypeScript?

**22.** Напишіть `Shape` → `Circle`, `Square` з `area()`, `describe()` у базовому через `this.area()`.

```js
class Shape { describe() { return this.constructor.name + ' ' + this.area().toFixed(2); } } class Circle extends Shape { constructor(r) { super(); this.r = r; } area() { return Math.PI * this.r ** 2; } } class Square extends Shape { constructor(a) { super(); this.a = a; } area() { return this.a ** 2; } }
```

**23.** Напишіть `Logger` → `TimestampLogger` (перевизначення `format`).

```js
class Logger { format(m) { return m; } log(m) { return this.format(m); } } class Ts extends Logger { format(m) { return '[ts] ' + super.format(m); } }
```

### Відповіді

1. `'hi'`
2. `'AB'`
3. `'ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor'`
4. `'Must call super constructor in derived class before accessing 'this' or returning from derived constructor'`
5. `[true, true, true, false]`
6. `['...', 'woof', 'meow']`
7. `['B', 'A', 'A']`
8. `['base', true]`
9. `'AB'`
10. `'B'`
11. `undefined`
12. `[3, 3, true, true]`
13. `[true, 3]`
14. `[true, 'AppError', 'boom', 42, 'AppError: boom']`
15. `['abstract', true]`
16. `'vroom'`
17. `[15, 9]`
18. `['A.m', 5]`
19. Коли зв'язок не «є різновидом» (is-a), а лише потрібен повторний код; коли нащадок змінює або відхиляє поведінку батька; коли ієрархія глибока й крихка. Тоді краще композиція
20. Зміна в батьківському класі непомітно ламає нащадків, що залежать від його внутрішніх деталей
21. `protected` доступний у класі та його нащадках, `private` — лише в самому класі; обидва перевіряються лише компілятором
22. Виклик `[new Circle(1).describe(), new Square(3).describe()]` → `['Circle 3.14', 'Square 9.00']`
23. Виклик `[new Logger().log('x'), new Ts().log('x')]` → `['x', '[ts] x']`
