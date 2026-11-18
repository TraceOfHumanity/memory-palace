# Прототипне наслідування vs class/extends

## 1. Головна ідея: в основі — один механізм

На відміну від Java/C# (де клас — окрема, самостійна концепція), у JavaScript уся система наслідування побудована на **одному** механізмі: кожен об'єкт має внутрішнє посилання на інший об'єкт — свій **прототип** (`[[Prototype]]`). Коли рушій шукає властивість, якої немає на самому об'єкті, він іде «вгору» по **ланцюжку прототипів** (prototype chain), доки не знайде її або не дійде до `null`. `class`/`extends` (ES2015) — синтаксис над **цим самим** механізмом (з кількома додатковими гарантіями — розділ 6), а не окрема система класів.

```js
const animalProto = {
  speak() {
    return `${this.name} makes a sound`;
  },
};

const dog = Object.create(animalProto); // dog.[[Prototype]] === animalProto
dog.name = "Rex";
console.log(dog.speak()); // Rex makes a sound — метод не на dog, а на animalProto
console.log(Object.hasOwn(dog, "speak")); // false — не власна властивість
console.log(Object.getPrototypeOf(dog) === animalProto); // true
```

## 2. `[[Prototype]]` vs `__proto__` vs `.prototype` — три різні речі

| | Що це | Де існує |
|---|---|---|
| `[[Prototype]]` | внутрішній слот, посилання на прототип | у **кожного** об'єкта; напряму недоступний, читається через `Object.getPrototypeOf()` |
| `__proto__` | застарілий (legacy) геттер/сеттер до `[[Prototype]]` | успадковується з `Object.prototype` |
| `.prototype` | звичайна властивість — об'єкт, який **стане** `[[Prototype]]` екземплярів, створених через `new` | лише на функціях-конструкторах і класах |

```js
function Animal(name) {
  this.name = name;
}
console.log(typeof Animal.prototype); // object — властивість самої функції
console.log(Animal.prototype.constructor === Animal); // true — кругове посилання за замовчуванням

const cat = new Animal("Whiskers");
console.log(Object.getPrototypeOf(cat) === Animal.prototype); // true — ось і зв'язок
console.log(cat.__proto__ === Animal.prototype); // true — те саме, застарілим способом
console.log(cat.prototype); // undefined — .prototype є лише у функцій, не в екземплярів
```

Не кожна функція має `.prototype`: у стрілок і методів об'єкта його немає, тому їх не можна викликати з `new`.

```js
const arrow = () => {};
console.log(arrow.prototype); // undefined
```

## 3. Як працює пошук властивості по ланцюжку

```js
Animal.prototype.eat = function () {
  return `${this.name} eats`;
};

console.log(cat.eat()); // Whiskers eats
```

Покроково для `cat.eat()`:

1. рушій перевіряє, чи є `eat` **власною** властивістю `cat` → немає;
2. піднімається до `Object.getPrototypeOf(cat)`, тобто `Animal.prototype` → є, викликає з `this === cat`;
3. якби не було й там — пішов би до `Object.prototype`, а потім до `null` (кінець ланцюжка).

```js
console.log(Object.getPrototypeOf(Animal.prototype) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype)); // null — кінець ланцюжка

// toString знайдеться аж на Object.prototype:
console.log(cat.toString()); // [object Object]
```

## 4. Shadowing — власна властивість затінює однойменну з прототипу

Якщо додати властивість з тим самим ім'ям на сам екземпляр, рушій знайде її **першою** і вище не піде. Прототип при цьому не змінюється:

```js
cat.eat = function () {
  return `${this.name} eats in a SPECIAL way`;
};
console.log(cat.eat()); // Whiskers eats in a SPECIAL way — власна властивість перемогла
delete cat.eat;
console.log(cat.eat()); // Whiskers eats — знову з прототипу
```

## 5. Способи реалізувати наслідування (історично)

### 5.1. `Object.create()` — найпряміший спосіб

```js
const vehicleProto = {
  init(type) {
    this.type = type;
    return this;
  },
  describe() {
    return `This is a ${this.type}`;
  },
};
const car = Object.create(vehicleProto).init("car");
console.log(car.describe()); // This is a car
```

### 5.2. Функція-конструктор + `.prototype` (ES5)

```js
function Vehicle(type) {
  this.type = type;
}
Vehicle.prototype.describe = function () {
  return `This is a ${this.type}`;
};

function Car(type, wheels) {
  Vehicle.call(this, type); // «успадкування» власних полів: батьківський конструктор з поточним this
  this.wheels = wheels;
}
// ключовий рядок — підміна прототипу:
Car.prototype = Object.create(Vehicle.prototype);
Car.prototype.constructor = Car; // відновлюємо constructor після підміни

Car.prototype.honk = function () {
  return `${this.type} honks!`;
};

const myCar = new Car("sedan", 4);
console.log(myCar.describe()); // This is a sedan — з Vehicle.prototype
console.log(myCar.honk()); // sedan honks! — власний метод Car.prototype
console.log(myCar instanceof Car); // true
console.log(myCar instanceof Vehicle); // true — ланцюжок працює
```

Чому `Object.create(Vehicle.prototype)`, а не `new Vehicle()`: `new Vehicle()` виконав би конструктор (побічні ефекти, зайві поля на прототипі), а `Object.create()` лише створює об'єкт із потрібним прототипом, не запускаючи жодного коду.

### 5.3. `Object.setPrototypeOf()` — зміна прототипу вже існуючого об'єкта

Детально — [Object.md](data-structures/Object/Object.md). Для наслідування це рідко правильний вибір: зміна прототипу існуючого об'єкта ламає внутрішні оптимізації рушія (MDN прямо попереджає про це). `Object.create()` кращий, коли прототип відомий заздалегідь.

### 5.4. `class`/`extends` (ES2015) — сучасний синтаксис

Той самий результат, що в 5.2, але без ручної роботи з `prototype`/`call()` — розділ 6.

## 6. class/extends — синтаксис над прототипами

```js
class VehicleClass {
  constructor(type) {
    this.type = type;
  }
  describe() {
    return `This is a ${this.type}`;
  }
}

class CarClass extends VehicleClass {
  constructor(type, wheels) {
    super(type); // аналог Vehicle.call(this, type) з 5.2
    this.wheels = wheels;
  }
  honk() {
    return `${this.type} honks!`;
  }
}

const myCarClass = new CarClass("hatchback", 4);
console.log(myCarClass.describe()); // This is a hatchback — той самий пошук по прототипу
console.log(myCarClass.honk()); // hatchback honks!
```

Доказ, що це той самий механізм:

```js
console.log(typeof CarClass); // function — клас і є функцією
console.log(Object.getPrototypeOf(myCarClass) === CarClass.prototype); // true
console.log(Object.getPrototypeOf(CarClass.prototype) === VehicleClass.prototype); // true — ланцюжок, побудований extends
console.log(Object.getPrototypeOf(CarClass) === VehicleClass); // true — навіть функція-клас має прототипний зв'язок (так успадковуються static-методи)
```

> [!note] «Лише цукор» — майже, але не повністю
> Механізм пошуку властивостей той самий, але `class` дає речі, яких у ES5-конструктора немає: клас не можна викликати без `new` (`TypeError`), тіло класу завжди в strict mode, методи non-enumerable (розділ 8), є приватні поля `#x`, а при `extends` вбудованих типів (`Array`, `Error`) екземпляр створює саме батьківський конструктор — у ES5 так коректно успадкувати `Array` неможливо.

```js
try {
  CarClass("coupe", 2);
} catch (err) {
  console.log(err.message); // Class constructor CarClass cannot be invoked without 'new'
}
```

## 7. `super` — дві різні речі

### а) `super(...)` у конструкторі — виклик батьківського конструктора

У похідному класі `this` **не існує**, доки не викликано `super()` — у цьому ключова відмінність від ES5-конструкторів:

```js
class Broken extends VehicleClass {
  constructor(type) {
    this.type = type; // ще до super()
    super(type);
  }
}
try {
  new Broken("test");
} catch (err) {
  console.log(err.message); // Must call super constructor in derived class before accessing 'this' or returning from derived constructor
}
```

### б) `super.method()` у звичайному методі — версія методу з прототипу батька

```js
class Base {
  describe() {
    return "base description";
  }
}
class Derived extends Base {
  describe() {
    return `${super.describe()} + extra description`; // явно викликаємо версію з Base.prototype
  }
}
console.log(new Derived().describe()); // base description + extra description
```

## 8. Методи класу — non-enumerable

Усі методи, оголошені в тілі `class`, автоматично non-enumerable — щоб `for...in` / `Object.keys()` на екземплярі не «засмічувались» методами з прототипу:

```js
console.log(Object.keys(myCarClass)); // [ 'type', 'wheels' ] — лише власні поля
console.log(Object.getOwnPropertyNames(CarClass.prototype)); // [ 'constructor', 'honk' ] — методи тут

const descriptor = Object.getOwnPropertyDescriptor(CarClass.prototype, "honk");
console.log(descriptor.enumerable); // false
```

А от методи, додані в ES5-стилі через присвоєння, — enumerable, і `for...in` їх бачить:

```js
const inheritedKeys = [];
for (const key in myCar) inheritedKeys.push(key);
console.log(inheritedKeys); // [ 'type', 'wheels', 'constructor', 'honk', 'describe' ]
```

(`constructor` потрапив сюди, бо в 5.2 ми відновили його звичайним присвоєнням; для «правильного» non-enumerable треба `Object.defineProperty`.)

## 9. `instanceof` перевіряє прототип, а не «ім'я класу»

`obj instanceof Constructor` перевіряє, чи є `Constructor.prototype` **десь у ланцюжку** прототипів `obj` — а не чи створено `obj` саме цим конструктором:

```js
console.log(myCarClass instanceof CarClass); // true
console.log(myCarClass instanceof VehicleClass); // true — VehicleClass.prototype теж у ланцюжку
console.log(myCarClass instanceof Object); // true — Object.prototype на верхівці ланцюжка

function FakeCar() {}
FakeCar.prototype = CarClass.prototype; // підмінили prototype вручну
console.log(new FakeCar() instanceof CarClass); // true — хоча код CarClass жодного разу не виконувався
```

(Поведінку `instanceof` можна перевизначити через `static [Symbol.hasInstance]` — [Symbol.md](data-structures/Symbol/Symbol.md).)

## 10. Методи прототипу vs поля екземпляра — пам'ять

Методи з тіла `class` (чи `Constructor.prototype.method`) — **одна** копія на прототипі, спільна для всіх екземплярів. «Метод» як class field зі стрілкою — **окрема** функція в кожному екземплярі:

```js
class WithPrototypeMethod {
  describe() {
    return "method on the prototype";
  }
}
class WithInstanceField {
  describe = () => "method as an own instance field";
}

const p1 = new WithPrototypeMethod();
const p2 = new WithPrototypeMethod();
console.log(p1.describe === p2.describe); // true — одна функція в пам'яті

const f1 = new WithInstanceField();
const f2 = new WithInstanceField();
console.log(f1.describe === f2.describe); // false — у кожного екземпляра своя функція
```

Компроміс: class field зі стрілкою дає «автоприв'язаний» `this` ([this.md](this.md), розділ 8.1), але коштує окремої функції на кожен екземпляр і не потрапляє на прототип (тому `super.describe()` у підкласі його не знайде).

## 11. Міксини — «множинне наслідування» через функції

`extends` приймає лише **один** клас, але можна емулювати множинне наслідування функціями, що приймають клас і повертають новий клас-обгортку:

```js
const CanFly = (Base) =>
  class extends Base {
    fly() {
      return `${this.name} flies`;
    }
  };
const CanSwim = (Base) =>
  class extends Base {
    swim() {
      return `${this.name} swims`;
    }
  };

class Creature {
  constructor(name) {
    this.name = name;
  }
}
class Duck extends CanSwim(CanFly(Creature)) {} // ланцюжок міксинів

const duck = new Duck("Quack");
console.log(duck.fly()); // Quack flies
console.log(duck.swim()); // Quack swims
```

`duck` успадковує через цілу послідовність прототипів:

```text
Duck.prototype → (CanSwim-клас).prototype → (CanFly-клас).prototype → Creature.prototype → Object.prototype
```

## 12. `Object.create(null)` — об'єкт поза ланцюжком

```js
const pureDictionary = Object.create(null);
pureDictionary.key = "value";
console.log(pureDictionary.toString); // undefined — навіть Object.prototype немає
console.log(pureDictionary.hasOwnProperty); // undefined — тому метод на ньому не викличеш
console.log(Object.hasOwn(pureDictionary, "key")); // true — статичний метод працює для будь-якого об'єкта
```

Такий об'єкт — безпечний словник: ключі на кшталт `"toString"` чи `"__proto__"` не конфліктують з успадкованими властивостями.

## 13. Прототипне vs класичне наслідування — ключова різниця

| Класичне (Java/C#) | Прототипне (JS) |
|---|---|
| Клас — «креслення», окрема сутність | Прототип — живий об'єкт у пам'яті |
| Структура фіксується при компіляції | Властивість шукається динамічно, під час виконання |
| Зміна класу не впливає на вже створені об'єкти | Зміна прототипу одразу видна **всім** об'єктам, що на нього посилаються — навіть створеним раніше |

```js
Vehicle.prototype.newMethod = function () {
  return "I appeared AFTER myCar was created!";
};
console.log(myCar.newMethod()); // I appeared AFTER myCar was created! — пошук у момент виклику
```

## Підсумок

- В основі всього — `[[Prototype]]`: посилання кожного об'єкта на інший об'єкт, по якому рушій шукає властивості, яких немає на самому об'єкті.
- `[[Prototype]]` (внутрішній слот) ≠ `__proto__` (застарілий аксесор до нього) ≠ `.prototype` (властивість функцій, що стане `[[Prototype]]` екземплярів `new`).
- Shadowing: власна властивість екземпляра перекриває однойменну з прототипу, не змінюючи прототип.
- `class`/`extends`/`super` будують той самий ланцюжок прототипів, що ES5-конструктори з `Object.create`, але додають гарантії: виклик лише з `new`, strict mode, non-enumerable методи, `#private`, коректне наслідування вбудованих типів.
- `super()` обов'язковий до першого звернення до `this` у похідному класі; `super.method()` викликає версію методу з прототипу батька.
- `instanceof` перевіряє наявність `Constructor.prototype` у ланцюжку, а не «справжнє походження» об'єкта.
- Методи на прототипі — одна спільна копія; class field зі стрілкою — окрема копія на кожен екземпляр.
- Множинного наслідування немає, але міксини (функції, що повертають клас-обгортку) емулюють його ланцюжком прототипів.
- Зміна прототипу одразу впливає на всі об'єкти, що на нього посилаються, — навіть створені раніше.

## Задачі для закріплення

38 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чим відрізняються `__proto__`, `[[Prototype]]` та `.prototype`?

```js
(() => { function F() {} const o = new F(); return [Object.getPrototypeOf(o) === F.prototype, o.__proto__ === F.prototype, typeof o.prototype, typeof F.prototype]; })()
```

**2.** Що поверне ланцюжок прототипів звичайного об'єкта?

```js
(() => { const o = {}; return [Object.getPrototypeOf(o) === Object.prototype, Object.getPrototypeOf(Object.prototype)]; })()
```

**3.** Як працює пошук властивості по ланцюжку?

```js
(() => { const a = { x: 1 }; const b = Object.create(a); const c = Object.create(b); c.y = 2; return [c.x, c.y, c.z, 'x' in c, c.hasOwnProperty('x')]; })()
```

**4.** Що дасть `Object.hasOwn` та `in` для успадкованої властивості?

```js
(() => { const p = { a: 1 }; const o = Object.create(p); o.b = 2; return [Object.hasOwn(o, 'a'), 'a' in o, Object.hasOwn(o, 'b')]; })()
```

**5.** Що поверне `for...in` по об'єкту із прототипом?

```js
(() => { const p = { a: 1 }; const o = Object.create(p); o.b = 2; const k = []; for (const x in o) k.push(x); return [k, Object.keys(o)]; })()
```

**6.** Що буде при запису у успадковану властивість (shadowing)?

```js
(() => { const p = { v: 1 }; const o = Object.create(p); o.v = 2; return [o.v, p.v, Object.hasOwn(o, 'v')]; })()
```

**7.** Що станеться при `delete` власної властивості, що затіняла прототипну?

```js
(() => { const p = { v: 1 }; const o = Object.create(p); o.v = 2; delete o.v; return o.v; })()
```

**8.** Що буде із записом, якщо у прототипі властивість лише для читання?

```js
(() => { 'use strict'; const p = Object.defineProperty({}, 'r', { value: 1, writable: false }); const o = Object.create(p); try { o.r = 2; } catch (e) { return e.name; } })()
```

**9.** Що буде із записом, якщо у прототипі є сетер?

```js
(() => { const p = { set v(x) { this._v = x; } }; const o = Object.create(p); o.v = 5; return [Object.hasOwn(o, 'v'), o._v, Object.hasOwn(p, '_v')]; })()
```

**10.** Чи ділять екземпляри методи з прототипу?

```js
(() => { function F() {} F.prototype.m = function () {}; const a = new F(), b = new F(); return [a.m === b.m, Object.hasOwn(a, 'm')]; })()
```

### Рівень 2. Деталі й поведінка

**11.** А методи, оголошені в конструкторі?

```js
(() => { function F() { this.m = function () {}; } const a = new F(), b = new F(); return a.m === b.m; })()
```

**12.** Що поверне `constructor` екземпляра?

```js
(() => { function F() {} const o = new F(); return [o.constructor === F, F.prototype.constructor === F]; })()
```

**13.** Що станеться з `constructor`, якщо замінити `F.prototype` об'єктом?

```js
(() => { function F() {} F.prototype = { m() {} }; const o = new F(); return [o.constructor === F, o.constructor === Object]; })()
```

**14.** Як відновити `constructor` після заміни прототипу?

```js
(() => { function F() {} F.prototype = { constructor: F, m() {} }; return new F().constructor === F; })()
```

**15.** Що поверне `instanceof` для різних ланцюжків?

```js
(() => { class A {} class B extends A {} const b = new B(); return [b instanceof B, b instanceof A, b instanceof Object, [] instanceof Object, Object.create(null) instanceof Object]; })()
```

**16.** Чи залежить `instanceof` від зміни прототипу після створення?

```js
(() => { function F() {} const o = new F(); F.prototype = {}; return o instanceof F; })()
```

**17.** Що поверне `isPrototypeOf`?

```js
(() => { const a = {}; const b = Object.create(a); return [a.isPrototypeOf(b), b.isPrototypeOf(a), Object.prototype.isPrototypeOf(b)]; })()
```

**18.** Що дасть `Object.setPrototypeOf` і `Object.getPrototypeOf`?

```js
(() => { const a = { who: 'a' }; const o = {}; Object.setPrototypeOf(o, a); return [o.who, Object.getPrototypeOf(o) === a]; })()
```

**19.** Що дасть `Object.create(null)`?

```js
(() => { const o = Object.create(null); o.k = 1; return [typeof o.toString, 'toString' in o, Object.getPrototypeOf(o), Object.keys(o)]; })()
```

**20.** Що станеться при `String(Object.create(null))`?

```js
(() => { try { return String(Object.create(null)); } catch (e) { return e.name + ': ' + e.message; } })()
```

### Рівень 3. Нюанси та пастки

**21.** Що дасть наслідування через `Object.create` з дескрипторами?

```js
(() => { const p = { hi() { return 'hi ' + this.n; } }; const o = Object.create(p, { n: { value: 'x', enumerable: true } }); return [o.hi(), Object.keys(o)]; })()
```

**22.** Що поверне наслідування функцій-конструкторів через `Parent.call(this)` та `Object.create`?

```js
(() => { function P(n) { this.n = n; } P.prototype.hi = function () { return 'hi ' + this.n; }; function C(n) { P.call(this, n); this.c = 1; } C.prototype = Object.create(P.prototype); C.prototype.constructor = C; const c = new C('z'); return [c.hi(), c instanceof P, c.c]; })()
```

**23.** Що поверне клас із `extends` та `super`?

```js
(() => { class A { hi() { return 'A'; } } class B extends A { hi() { return super.hi() + 'B'; } } return new B().hi(); })()
```

**24.** Чи класи — це синтаксичний цукор над прототипами?

```js
(() => { class A { m() {} } return [typeof A, A.prototype.m === new A().m, Object.getPrototypeOf(A) === Function.prototype]; })()
```

**25.** Чи методи класу enumerable?

```js
(() => { class A { m() {} } return [Object.keys(A.prototype), Object.getOwnPropertyNames(A.prototype), Object.keys(new A())]; })()
```

**26.** Що поверне `Object.getPrototypeOf(B) === A` для `class B extends A`?

```js
(() => { class A {} class B extends A {} return [Object.getPrototypeOf(B) === A, Object.getPrototypeOf(B.prototype) === A.prototype]; })()
```

**27.** Чи наслідуються статичні методи?

```js
(() => { class A { static s() { return 'static'; } } class B extends A {} return B.s(); })()
```

**28.** Що поверне `super` в об'єктному літералі?

```js
(() => { const p = { hi() { return 'p'; } }; const o = { __proto__: p, hi() { return super.hi() + 'o'; } }; return o.hi(); })()
```

**29.** Що дасть `__proto__` у літералі?

```js
(() => { const p = { v: 1 }; const o = { __proto__: p, w: 2 }; return [o.v, Object.keys(o)]; })()
```

**30.** Чому небезпечно писати `obj['__proto__'] = ...` з користувацьких ключів?

```js
(() => { const o = {}; o.__proto__ = { hacked: true }; return [o.hacked, Object.keys(o)]; })()
```

### Рівень 4. Практика

**31.** Що поверне JSON.parse із `__proto__`?

```js
(() => { const o = JSON.parse('{"__proto__": {"x": 1}}'); return [o.x, Object.hasOwn(o, '__proto__')]; })()
```

**32.** Як міксин додає методи?

```js
(() => { const Fly = (B) => class extends B { fly() { return 'fly'; } }; const Swim = (B) => class extends B { swim() { return 'swim'; } }; class Duck extends Swim(Fly(Object)) {} const d = new Duck(); return [d.fly(), d.swim()]; })()
```

**33.** Що поверне `Object.assign(Class.prototype, mixin)`?

```js
(() => { class A {} Object.assign(A.prototype, { hi() { return 'hi'; } }); return new A().hi(); })()
```

**34.** Напишіть `extend(Child, Parent)` для функцій-конструкторів.

```js
const extend = (C, P) => { C.prototype = Object.create(P.prototype); C.prototype.constructor = C; return C; }
```

**35.** Напишіть `chain(obj)` — масив імен конструкторів вгору по ланцюжку.

```js
const chain = (o) => { const r = []; for (let p = Object.getPrototypeOf(o); p; p = Object.getPrototypeOf(p)) r.push(p.constructor.name); return r; }
```

**36.** Напишіть `myInstanceOf(obj, Ctor)` без `instanceof`.

```js
const myInstanceOf = (o, C) => { for (let p = Object.getPrototypeOf(o); p; p = Object.getPrototypeOf(p)) if (p === C.prototype) return true; return false; }
```

**37.** Напишіть `myNew(Ctor, ...args)` без `new`.

```js
const myNew = (C, ...a) => { const o = Object.create(C.prototype); const r = C.apply(o, a); return r !== null && (typeof r === 'object' || typeof r === 'function') ? r : o; }
```

**38.** Напишіть `ownAndInherited(obj)` — усі ключі з рівня їх власника.

```js
const oi = (o) => { const r = []; for (let p = o; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) r.push(Object.keys(p)); return r; }
```

### Відповіді

1. `[true, true, 'undefined', 'object']`
2. `[true, null]`
3. `[1, 2, undefined, true, false]`
4. `[false, true, true]`
5. `[['b', 'a'], ['b']]`
6. `[2, 1, true]`
7. `1`
8. `'TypeError'`
9. `[false, 5, false]`
10. `[true, false]`
11. `false`
12. `[true, true]`
13. `[false, true]`
14. `true`
15. `[true, true, true, true, false]`
16. `false`
17. `[true, false, true]`
18. `['a', true]`
19. `['undefined', false, null, ['k']]`
20. `'TypeError: Cannot convert object to primitive value'`
21. `['hi x', ['n']]`
22. `['hi z', true, 1]`
23. `'AB'`
24. `['function', true, true]`
25. `[[], ['constructor', 'm'], []]`
26. `[true, true]`
27. `'static'`
28. `'po'`
29. `[1, ['w']]`
30. `[true, []]`
31. `[undefined, true]`
32. `['fly', 'swim']`
33. `'hi'`
34. Виклик `(() => { function P() {} P.prototype.p = () => 'p'; function C() {} extend(C, P); const c = new C(); return [c.p(), c instanceof P, c.constructor === C]; })()` → `['p', true, true]`
35. Виклик `(() => { class A {} class B extends A {} return chain(new B()); })()` → `['B', 'A', 'Object']`
36. Виклик `(() => { class A {} class B extends A {} return [myInstanceOf(new B(), A), myInstanceOf({}, A), myInstanceOf([], Object)]; })()` → `[true, false, true]`
37. Виклик `(() => { function P(n) { this.n = n; } P.prototype.hi = function () { return this.n; }; const p = myNew(P, 'z'); return [p.hi(), p instanceof P]; })()` → `['z', true]`
38. Виклик `(() => { const a = { x: 1 }; const b = Object.create(a); b.y = 2; return oi(b); })()` → `[['y'], ['x']]`
