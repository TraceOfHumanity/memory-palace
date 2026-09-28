# ООП: абстракція — працювати з «що вміє», а не «як влаштовано»

## 0. Загальна ідея

Абстракція — виділення **суттєвого** інтерфейсу об'єкта і приховування деталей реалізації. Код, що використовує об'єкт, знає лише, **що** той уміє (`area()`, `perimeter()`), а не **як** саме це обчислюється. Завдяки цьому можна додавати нові реалізації, не змінюючи код, який ними користується.

У TypeScript абстракцію виражають двома засобами:

- `interface` — лише контракт (сигнатури), без жодного коду; повністю зникає після компіляції;
- `abstract class` — контракт плюс, за потреби, спільна реалізація; існує в рантаймі як звичайний клас.

## 1. Інтерфейс як контракт

```ts
interface Shape {
  area(): number;
  perimeter(): number;
}

class Circle implements Shape {
  constructor(private radius: number) {}

  area(): number {
    return Math.PI * this.radius ** 2;
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius;
  }
}

class Rectangle implements Shape {
  constructor(
    private width: number,
    private height: number,
  ) {}

  area(): number {
    return this.width * this.height;
  }

  perimeter(): number {
    return 2 * (this.width + this.height);
  }
}
```

`implements Shape` змушує клас мати **всі** методи контракту — інакше помилка компіляції:

```ts
// class Triangle implements Shape { area() { return 0; } } // ❌ Class 'Triangle' incorrectly implements interface 'Shape'.
```

## 2. Код, що залежить лише від абстракції

Функція нижче нічого не знає про кола й прямокутники — лише про `Shape`. Нова фігура (трикутник, еліпс) запрацює з нею без жодних змін:

```ts
function calculateTotalArea(shapes: Shape[]): number {
  return shapes.reduce((sum, shape) => sum + shape.area(), 0);
}

const circle = new Circle(5);
const rectangle = new Rectangle(4, 6);

console.log(circle.area().toFixed(2)); // 78.54
console.log(rectangle.area()); // 24
console.log(calculateTotalArea([circle, rectangle]).toFixed(2)); // 102.54
```

> [!note] Виправлення відносно попередньої версії
> Раніше `calculateTotalArea` приймала **одну** фігуру (`shapes: Shape`) і просто повертала її площу — назва обіцяла суму, а функція її не рахувала. Тепер вона приймає масив і підсумовує.

Деталі реалізації справді приховані — `radius` недоступний ззовні (про модифікатори доступу — [encapsulation.md](encapsulation.md)):

```ts
// circle.radius; // ❌ Property 'radius' is private and only accessible within class 'Circle'.
```

## 3. Структурна типізація: `implements` не обов'язковий

TypeScript перевіряє **форму** об'єкта, а не його «родовід». Будь-який об'єкт з методами `area()` і `perimeter()` — уже `Shape`, навіть без `implements` і без класу:

```ts
const square = {
  side: 3,
  area() {
    return this.side ** 2;
  },
  perimeter() {
    return 4 * this.side;
  },
};
console.log(calculateTotalArea([square, rectangle])); // 33
```

`implements` потрібен для того, щоб помилку в реалізації показало **в самому класі**, а не десь у місці використання.

## 4. Абстрактний клас — контракт плюс спільний код

Якщо реалізації мають спільну поведінку, її виносять в `abstract class`. Абстрактні методи обов'язково реалізує нащадок, а звичайні він успадковує готовими:

```ts
abstract class BaseShape implements Shape {
  abstract area(): number;
  abstract perimeter(): number;

  describe(): string {
    // спільний код — працює через абстрактні методи, не знаючи конкретної фігури
    return `${this.constructor.name}: area=${this.area().toFixed(1)}, perimeter=${this.perimeter().toFixed(1)}`;
  }
}

class Square extends BaseShape {
  constructor(private side: number) {
    super();
  }
  area(): number {
    return this.side ** 2;
  }
  perimeter(): number {
    return 4 * this.side;
  }
}

console.log(new Square(2).describe()); // Square: area=4.0, perimeter=8.0
// new BaseShape(); // ❌ Cannot create an instance of an abstract class.
```

## 5. interface vs abstract class

| | `interface` | `abstract class` |
|---|---|---|
| Реалізація методів | немає | може бути |
| Поля зі значеннями, конструктор | ні | так |
| Скільки можна «підключити» | `implements A, B, C` — скільки завгодно | `extends` — лише один |
| Існує в рантаймі | ні (стирається) | так (звичайний клас) |
| `instanceof` | неможливий | можливий |

Практичне правило: контракт — `interface`; спільний код для кількох реалізацій — `abstract class`, який цей інтерфейс реалізує. Детальніше про `interface` і `type` — [interface-vs-type.md](../../typescript/interface-vs-type.md).

## Підсумок

- Абстракція — працювати з об'єктом через його суттєвий інтерфейс, не знаючи деталей реалізації.
- `interface` описує контракт без коду; `implements` перевіряє, що клас його повністю виконує.
- Код, що приймає абстракцію (`Shape[]`), працює з будь-якою новою реалізацією без змін — основа принципів Open/Closed і Dependency Inversion ([open-closed.md](../SOLID/open-closed.md), [dependency-inversion.md](../SOLID/dependency-inversion.md)).
- Типізація в TS структурна: об'єкт потрібної форми підходить і без `implements`.
- `abstract class` поєднує контракт і спільний код; його не можна інстанціювати, а наслідуватись можна лише від одного.
