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
