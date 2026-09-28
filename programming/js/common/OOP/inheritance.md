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
