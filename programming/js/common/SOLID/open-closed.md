# SOLID: O — Open/Closed Principle (принцип відкритості/закритості)

## 0. Формулювання

> Програмні сутності мають бути **відкриті для розширення**, але **закриті для змін**.

Нову поведінку додають **новим кодом** (новий клас, нова функція), а не редагуванням уже працюючого й протестованого. Технічно це досягається через абстракцію: код залежить від інтерфейсу, а нові варіанти — це нові реалізації цього інтерфейсу ([abstraction.md](../OOP/abstraction.md)).

## 1. Порушення: `switch` за типом, який росте з кожною вимогою

```ts
type CustomerKind = "regular" | "premium";

function calculateDiscountBad(kind: CustomerKind): number {
  switch (kind) {
    case "regular":
      return 0;
    case "premium":
      return 10;
  }
}

console.log(calculateDiscountBad("premium")); // 10
```

Щоб додати VIP-клієнта, доведеться **змінити** цю функцію — і кожне інше місце в коді, де є такий самий `switch` за типом клієнта. Кожна правка — ризик зламати вже працюючі гілки.

## 2. Виправлення: кожен тип клієнта — окрема реалізація

```ts
interface Customer {
  getDiscount(): number;
}

class RegularCustomer implements Customer {
  getDiscount(): number {
    return 0;
  }
}

class PremiumCustomer implements Customer {
  getDiscount(): number {
    return 10;
  }
}

class DiscountCalculator {
  calculate(customer: Customer, price: number): number {
    return price - (price * customer.getDiscount()) / 100; // не знає про конкретні типи клієнтів
  }
}

const calculator = new DiscountCalculator();
console.log(calculator.calculate(new RegularCustomer(), 200)); // 200
console.log(calculator.calculate(new PremiumCustomer(), 200)); // 180
```

Новий тип клієнта — **новий клас**; `DiscountCalculator` і наявні клієнти не змінюються:

```ts
class VipCustomer implements Customer {
  getDiscount(): number {
    return 25;
  }
}
console.log(calculator.calculate(new VipCustomer(), 200)); // 150
```

> [!note] Зміни відносно попередньої версії
> Виправлено назви `Costumer` → `Customer` («costume» — костюм). Клас `Discount` перейменовано на `DiscountCalculator` і додано реальне обчислення ціни — раніше він лише повертав `customer.getDiscount()` і нічого не додавав. Також додано приклад порушення принципу, без якого незрозуміло, від чого він захищає.

## 3. Функціональний варіант — без класів

Та сама ідея в JS/TS часто виражається простіше — через об'єкт-реєстр або передачу функції:

```ts
const discountByKind: Record<string, number> = { regular: 0, premium: 10 };
discountByKind.vip = 25; // розширення — новий запис, а не зміна функції

const priceWithDiscount = (kind: string, price: number) => price - (price * (discountByKind[kind] ?? 0)) / 100;
console.log(priceWithDiscount("vip", 200)); // 150
```

## 4. Коли `switch` — нормально

OCP стосується місць, які **справді** розширюються. Якщо набір варіантів закритий і стабільний (дні тижня, HTTP-методи), `switch` за discriminated union — чистіший вибір. TS ще й перевіряє повноту: якщо додати варіант до union і забути гілку, компілятор помітить:

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.r ** 2;
    case "square":
      return shape.side ** 2;
    default:
      return assertNever(shape); // якщо з'явиться новий kind без гілки — помилка компіляції тут
  }
}
console.log(area({ kind: "square", side: 3 })); // 9
```

Вибір між ними: часто додаються **нові типи** — поліморфізм (класи/реєстр); часто додаються **нові операції** над фіксованим набором типів — `switch` за union.

## Підсумок

- OCP: нову поведінку додають новим кодом, а не зміною вже працюючого.
- Типове порушення — `switch`/`if` за типом, який доводиться редагувати при кожному новому варіанті.
- Рішення — залежати від абстракції (`interface Customer`) і додавати нові реалізації; у JS часто достатньо реєстру або переданої функції.
- Для закритого, стабільного набору варіантів `switch` за discriminated union з перевіркою `never` — нормальний і безпечний вибір.
- Пов'язані принципи: [liskov-substitution.md](liskov-substitution.md) (нові реалізації мають поводитися очікувано), [dependency-inversion.md](dependency-inversion.md).
