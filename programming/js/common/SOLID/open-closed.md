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

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Сформулюйте принцип відкритості/закритості.

**2.** Чому `switch` за типом, що росте, порушує OCP?

**3.** Що поверне `switch`-версія розрахунку знижки?

```js
(() => { const disc = (t, s) => { switch (t) { case 'vip': return s * 0.8; case 'regular': return s * 0.95; default: return s; } }; return [disc('vip', 100), disc('regular', 100), disc('new', 100)]; })()
```

**4.** Перепишіть через таблицю стратегій без `switch`.

```js
const rules = { vip: (s) => s * 0.8, regular: (s) => s * 0.95 }; const disc = (t, s) => (rules[t] ?? ((x) => x))(s)
```

### Рівень 2. Деталі й поведінка

**5.** Додайте новий тип `student` без зміни функції `disc`.

```js
const rules = { vip: (s) => s * 0.8 }; const disc = (t, s) => (rules[t] ?? ((x) => x))(s); rules.student = (s) => s * 0.9
```

**6.** Зробіть розширюваний конвеєр: `pipeline(...steps)` застосовує кроки, не змінюючи сам конвеєр.

```js
const pipeline = (...f) => (x) => f.reduce((v, g) => g(v), x)
```

**7.** Реалізуйте реєстр обробників: `register(type, fn)` та `handle(type, data)`.

```js
const handlers = new Map(); const register = (t, f) => handlers.set(t, f); const handle = (t, d) => handlers.has(t) ? handlers.get(t)(d) : 'unknown ' + t
```

**8.** Складіть розширювану валідацію: `validate(value, ...rules)` повертає список помилок.

```js
const validate = (v, ...r) => r.map(f => f(v)).filter(Boolean)
```

### Рівень 3. Нюанси та пастки

**9.** Створіть клас-фабрику форматерів: базовий `Formatter` і нащадки `Json`, `Csv` без змін базового.

```js
class Formatter { format(d) { throw new Error('abstract'); } } class Json extends Formatter { format(d) { return JSON.stringify(d); } } class Csv extends Formatter { format(d) { return d.join(','); } }
```

**10.** Додайте новий формат, лише розширивши (`Pipe`), а тоді користуйтеся `render(fmt, data)`.

```js
class F { format() {} } class Pipe extends F { format(d) { return d.join('|'); } } const render = (f, d) => f.format(d)
```

**11.** Коли `switch` залишається нормальним варіантом?

**12.** Які техніки допомагають дотримуватись OCP?

### Рівень 4. Практика

**13.** Чи можна повністю дотриматись OCP?

**14.** Що таке «закритий для модифікації»?

**15.** Реалізуйте систему знижок через масив правил (кожне правило: умова + дія).

```js
const rules = [{ when: (o) => o.total > 100, apply: (o) => o.total * 0.9 }, { when: (o) => o.vip, apply: (o) => o.total * 0.85 }]; const price = (o) => rules.reduce((t, r) => r.when({ ...o, total: t }) ? r.apply({ ...o, total: t }) : t, o.total)
```

### Відповіді

1. Програмні сутності відкриті для розширення, але закриті для модифікації: нову поведінку додають новим кодом, не редагуючи наявного
2. Кожен новий тип змушує редагувати той самий `switch` у багатьох місцях, що ризикує зламати вже перевірену логіку
3. `[80, 95, 100]`
4. Виклик `[disc('vip', 100), disc('regular', 100), disc('new', 100)]` → `[80, 95, 100]`
5. Виклик `[disc('student', 100), disc('vip', 100), disc('other', 100)]` → `[90, 80, 100]`
6. Виклик `[pipeline(x => x + 1, x => x * 2)(3), pipeline(x => x + 1, x => x * 2, x => x - 5)(3)]` → `[8, 3]`
7. Виклик `(() => { register('a', d => d + 1); register('b', d => d * 2); return [handle('a', 5), handle('b', 5), handle('c', 5)]; })()` → `[6, 10, 'unknown c']`
8. Виклик `(() => { const min = (n) => (v) => v.length < n && 'min ' + n; const noSpace = (v) => /\s/.test(v) && 'no spaces'; return [validate('ab c', min(5), noSpace), validate('abcdef', min(5), noSpace)]; })()` → `[['min 5', 'no spaces'], []]`
9. Виклик `[new Json().format([1, 2]), new Csv().format([1, 2])]` → `['[1,2]', '1,2']`
10. Виклик `render(new Pipe(), [1, 2, 3])` → `'1|2|3'`
11. Коли набір варіантів скінченний і стабільний (наприклад, дні тижня), або код локальний і рідко змінюється; надмірна абстракція шкодить читабельності
12. Поліморфізм, стратегії, декоратори, плагіни/реєстри, композиція функцій
13. Ні: передбачити всі напрямки змін неможливо; абстракції вводять там, де зміна вже трапилась або дуже ймовірна
14. Існуючий, протестований код не редагується при додаванні нової можливості; змінюється лише конфігурація чи додається новий модуль
15. Виклик `[price({ total: 200, vip: false }), price({ total: 50, vip: true }), price({ total: 200, vip: true })]` → `[180, 42.5, 153]`
