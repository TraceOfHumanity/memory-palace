# ООП: інкапсуляція — стан змінюється лише через методи, що зберігають правила

## 0. Загальна ідея

Інкапсуляція — приховування внутрішнього стану об'єкта і надання доступу до нього лише через методи, які гарантують **інваріанти** (правила, що мають бути істинними завжди). Для банківського рахунку інваріант — «баланс ніколи не від'ємний». Якщо будь-хто може напряму написати `account.balance = -500`, інваріант нічого не вартий.

## 1. Рахунок із приватним станом

```ts
class BankAccount {
  private _balance: number;

  constructor(initialBalance: number) {
    if (initialBalance < 0) throw new RangeError("Initial balance cannot be negative");
    this._balance = initialBalance;
  }

  // getter без setter — баланс можна читати, але не присвоювати
  get balance(): number {
    return this._balance;
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    this._balance += amount;
  }

  withdraw(amount: number): void {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    if (amount > this._balance) throw new Error("Insufficient funds");
    this._balance -= amount;
  }
}

const account = new BankAccount(100);
account.deposit(50);
account.withdraw(30);
console.log(account.balance); // 120

try {
  account.withdraw(1000);
} catch (err) {
  console.log((err as Error).message); // Insufficient funds
}
console.log(account.balance); // 120 — невдала операція стан не зіпсувала
```

Спроби обійти методи зупиняє компілятор:

```ts
// account._balance = -500; // ❌ Property '_balance' is private and only accessible within class 'BankAccount'.
// account.balance = -500; // ❌ Cannot assign to 'balance' because it is a read-only property.
```

> [!note] Зміна відносно попередньої версії
> Раніше невалідні операції лише друкували повідомлення (`console.log("Insufficient funds")`) і тихо поверталися — викликач не мав способу дізнатися, що операція не відбулася. Тепер вони кидають помилку, а `withdraw` ще й перевіряє від'ємну суму: `withdraw(-100)` раніше **збільшував** баланс.

## 2. `private` у TS — лише на етапі компіляції

Модифікатори `private`/`protected`/`public` — частина системи типів і **повністю стираються** при компіляції. У рантаймі `_balance` — звичайна властивість, і JS-код (або TS через `as any` чи дужкову нотацію) легко її змінить:

```ts
const hacked = new BankAccount(100);
hacked["_balance"] = -500; // дужкова нотація — свідома «лазівка» TS для private
console.log(hacked.balance); // -500 — інваріант зламано
console.log(Object.keys(hacked)); // [ '_balance' ] — властивість видно в рантаймі
```

## 3. `#private` — справжня приватність у рантаймі

Поля з `#` (ES2022) — приватні на рівні самої мови: доступ ззовні класу — синтаксична помилка, і жодних «лазівок» немає. Їх не видно в `Object.keys`, `JSON.stringify` чи через дужкову нотацію:

```ts
class SafeBankAccount {
  #balance: number;

  constructor(initialBalance: number) {
    this.#balance = initialBalance;
  }

  get balance(): number {
    return this.#balance;
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    this.#balance += amount;
  }
}

const safe = new SafeBankAccount(100);
safe.deposit(25);
console.log(safe.balance); // 125
console.log(Object.keys(safe), JSON.stringify(safe)); // [] {}
console.log((safe as any)["#balance"]); // undefined — це вже зовсім інша, звичайна властивість
```

| | `private` (TS) | `#private` (JS) |
|---|---|---|
| Коли діє | лише під час компіляції | у рантаймі |
| Обхід | `obj["x"]`, `as any`, чистий JS | неможливий |
| Видно в `Object.keys`/`JSON` | так | ні |
| Доступ до чужого екземпляра того ж класу | так | так |

Альтернатива без класів — замикання ([closures.md](../closures.md), розділ 4).

## 4. Інкапсуляція — це не «getter і setter на кожне поле»

Пара `getX()`/`setX(value)` без жодної логіки не приховує нічого — це те саме публічне поле, лише довше. Цінність у методах, що виражають **операції предметної області** і перевіряють правила: `deposit`, `withdraw`, а не `setBalance`.

## Підсумок

- Інкапсуляція захищає інваріанти: стан змінюється лише через методи, які перевіряють правила.
- Getter без setter робить властивість доступною лише для читання.
- Невалідна операція має явно повідомляти про провал (кинути помилку), а не мовчки нічого не робити.
- TS-модифікатор `private` діє лише під час компіляції і стирається; `obj["x"]` чи чистий JS його обходять.
- `#private` — справжня рантайм-приватність: не видно ззовні, не серіалізується, не обходиться.
- Сенс — у методах предметної області, а не в механічних getter/setter для кожного поля.

## Задачі для закріплення

21 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чи можна змінити приватне поле `#balance` ззовні?

```js
(() => { class A { #balance = 10; get() { return this.#balance; } } const a = new A(); a.balance = 999; return [a.get(), Object.keys(a)]; })()
```

**2.** Що станеться при зверненні до `#private` поза класом (SyntaxError на етапі розбору)?

```js
(() => { try { eval('class A { #p = 1; } new A().#p'); } catch (e) { return e.name; } })()
```

**3.** Чи видно `#private` у `JSON.stringify` та `Object.keys`?

```js
(() => { class A { #s = 1; pub = 2; } const a = new A(); return [JSON.stringify(a), Object.keys(a), Object.getOwnPropertyNames(a)]; })()
```

**4.** Чи є `private` у TypeScript справжньою приватністю в рантаймі? (емуляція: поле з `_`)

```js
(() => { class A { constructor() { this._secret = 1; } } return new A()._secret; })()
```

**5.** Як перевірити наявність приватного поля через `#x in obj`?

```js
(() => { class A { #x = 1; static has(o) { return #x in o; } } return [A.has(new A()), A.has({})]; })()
```

**6.** Чи успадковує нащадок доступ до `#private` батька?

```js
(() => { class A { #p = 1; get() { return this.#p; } } class B extends A { read() { try { return eval('this.#p'); } catch (e) { return e.name; } } } return [new B().get(), new B().read()]; })()
```

### Рівень 2. Деталі й поведінка

**7.** Чи працюють приватні методи `#m()`?

```js
(() => { class A { #m() { return 'secret'; } call() { return this.#m(); } } const a = new A(); return [a.call(), typeof a.m]; })()
```

**8.** Що поверне `#static` поле?

```js
(() => { class A { static #count = 0; static inc() { return ++A.#count; } } A.inc(); return A.inc(); })()
```

**9.** Що станеться, якщо викликати метод із `#private` на чужому об'єкті?

```js
(() => { class A { #p = 1; get() { return this.#p; } } try { A.prototype.get.call({}); } catch (e) { return e.name; } })()
```

**10.** Як приховати стан через замикання без `#`?

```js
(() => { const makeAcc = (b) => ({ dep: (n) => (b += n), get: () => b }); const a = makeAcc(5); a.dep(5); return [a.get(), a.b]; })()
```

**11.** Чи захищає `Object.freeze` від зміни публічних полів?

```js
(() => { 'use strict'; const o = Object.freeze({ n: 1 }); try { o.n = 2; } catch (e) { return [e.name, o.n]; } })()
```

**12.** Чи можна змінити поле, визначене через `Object.defineProperty` із `writable: false`?

```js
(() => { 'use strict'; const o = {}; Object.defineProperty(o, 'id', { value: 7, writable: false, enumerable: true }); try { o.id = 8; } catch (e) { return [e.name, o.id]; } })()
```

### Рівень 3. Нюанси та пастки

**13.** Що дає getter без setter при присвоєнні (strict)?

```js
(() => { 'use strict'; const o = { get v() { return 1; } }; try { o.v = 5; } catch (e) { return e.name + ': ' + e.message; } })()
```

**14.** Як валідувати значення в setter?

```js
(() => { class T { #c = 0; set c(v) { if (typeof v !== 'number') throw new TypeError('number'); this.#c = v; } get c() { return this.#c; } } const t = new T(); t.c = 5; try { t.c = 'x'; } catch (e) { return [t.c, e.message]; } })()
```

**15.** Напишіть клас `Account` з `#balance`, `deposit`, `withdraw` (не дозволяє мінус), `balance` (getter).

```js
class Account { #b = 0; deposit(n) { if (n <= 0) throw new RangeError('positive'); this.#b += n; return this; } withdraw(n) { if (n > this.#b) throw new Error('insufficient'); this.#b -= n; return this; } get balance() { return this.#b; } }
```

**16.** Напишіть `Counter` з приватним `#n` та методом `inc()`, що повертає `this` (ланцюжок).

```js
class Counter { #n = 0; inc() { this.#n++; return this; } get value() { return this.#n; } }
```

**17.** Напишіть незмінну `Point` (`Object.freeze(this)` у конструкторі) із методом `with`.

```js
class Point { constructor(x, y) { this.x = x; this.y = y; Object.freeze(this); } withX(x) { return new Point(x, this.y); } }
```

**18.** Напишіть `Stack` з приватним масивом і методами `push/pop/peek/size`.

```js
class Stack { #a = []; push(x) { this.#a.push(x); return this; } pop() { return this.#a.pop(); } peek() { return this.#a.at(-1); } get size() { return this.#a.length; } }
```

### Рівень 4. Практика

**19.** Напишіть `Temperature` із getter/setter у кельвінах із перевіркою нуля.

```js
class Temp { #k = 0; set c(v) { if (v < -273.15) throw new RangeError('below absolute zero'); this.#k = v + 273.15; } get c() { return this.#k - 273.15; } get k() { return this.#k; } }
```

**20.** Чому «getter і setter на кожне поле» — не інкапсуляція?

**21.** Чим `private` у TypeScript відрізняється від `#private`?

### Відповіді

1. `[10, ['balance']]`
2. `'SyntaxError'`
3. `['{"pub":2}', ['pub'], ['pub']]`
4. `1`
5. `[true, false]`
6. `[1, 'SyntaxError']`
7. `['secret', 'undefined']`
8. `2`
9. `'TypeError'`
10. `[10, undefined]`
11. `['TypeError', 1]`
12. `['TypeError', 7]`
13. `'TypeError: Cannot set property v of #<Object> which has only a getter'`
14. `[5, 'number']`
15. Виклик `(() => { const a = new Account().deposit(100).withdraw(30); let e; try { a.withdraw(500); } catch (x) { e = x.message; } return [a.balance, e, Object.keys(a)]; })()` → `[70, 'insufficient', []]`
16. Виклик `new Counter().inc().inc().inc().value` → `3`
17. Виклик `(() => { const p = new Point(1, 2); const q = p.withX(5); return [p.x, q.x, Object.isFrozen(p)]; })()` → `[1, 5, true]`
18. Виклик `(() => { const s = new Stack().push(1).push(2).push(3); s.pop(); return [s.peek(), s.size]; })()` → `[2, 2]`
19. Виклик `(() => { const t = new Temp(); t.c = 25; let e; try { t.c = -300; } catch (x) { e = x.name; } return [t.c, +t.k.toFixed(2), e]; })()` → `[25, 298.15, 'RangeError']`
20. Це лише обгортка над відкритим станом: інваріанти не захищені. Інкапсуляція — це методи, що виражають операції предметної області й охороняють коректність стану
21. `private` перевіряється лише компілятором і зникає в JS; `#private` — справжня приватність рантайму, недоступна ззовні навіть через `any`
