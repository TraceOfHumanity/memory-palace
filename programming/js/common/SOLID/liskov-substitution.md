# SOLID: L — Liskov Substitution Principle (принцип підстановки Лісков)

## 0. Формулювання

> Об'єкти підтипу мають бути **взаємозамінні** з об'єктами базового типу без порушення коректності програми.

Не достатньо, щоб підклас мав ті самі методи (це TypeScript перевірить сам). Підклас має **поводитися** так, як очікує код, написаний для базового типу:

- не посилювати передумови (не вимагати від аргументів більше, ніж батько);
- не послаблювати постумови (не повертати менше, ніж обіцяє батько);
- не порушувати інваріанти батька;
- не кидати нових, неочікуваних винятків.

## 1. Класичне порушення: квадрат як нащадок прямокутника

З погляду геометрії квадрат **є** прямокутником. Але в коді прямокутник обіцяє: «ширину й висоту можна змінювати **незалежно**». Квадрат цю обіцянку порушує:

```ts
class MutableRectangle {
  constructor(
    protected width: number,
    protected height: number,
  ) {}
  setWidth(width: number): void {
    this.width = width;
  }
  setHeight(height: number): void {
    this.height = height;
  }
  getArea(): number {
    return this.width * this.height;
  }
}

class MutableSquare extends MutableRectangle {
  constructor(side: number) {
    super(side, side);
  }
  override setWidth(width: number): void {
    this.width = width;
    this.height = width; // щоб лишитися квадратом, змінюємо обидві сторони
  }
  override setHeight(height: number): void {
    this.width = height;
    this.height = height;
  }
}

// код, написаний для прямокутника, з цілком розумним очікуванням:
function stretchToFiveByFour(rect: MutableRectangle): number {
  rect.setWidth(5);
  rect.setHeight(4);
  return rect.getArea(); // очікуємо 20
}

console.log(stretchToFiveByFour(new MutableRectangle(1, 1))); // 20
console.log(stretchToFiveByFour(new MutableSquare(1))); // 16 — підстановка зламала програму
```

TypeScript тут мовчить: типи збігаються ідеально. LSP — про **поведінковий** контракт, який компілятор перевірити не може.

## 2. Виправлення: спільна абстракція без обіцянки, яку хтось не виконає

Прибираємо з базового типу те, що не всі нащадки можуть гарантувати. Фігури незмінні, а спільне в них лише «вміє обчислити площу»:

```ts
abstract class Shape {
  abstract getArea(): number;
}

class Rectangle extends Shape {
  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    super();
  }
  getArea(): number {
    return this.width * this.height;
  }
  withWidth(width: number): Rectangle {
    return new Rectangle(width, this.height); // нова фігура замість мутації
  }
}

class Square extends Shape {
  constructor(private readonly side: number) {
    super();
  }
  getArea(): number {
    return this.side * this.side;
  }
}

const totalArea = (shapes: Shape[]) => shapes.reduce((sum, shape) => sum + shape.getArea(), 0);

const rectangle = new Rectangle(10, 20);
const square = new Square(10);
console.log(rectangle.getArea(), square.getArea()); // 200 100
console.log(totalArea([rectangle, square])); // 300 — будь-яка фігура підставляється без сюрпризів
console.log(rectangle.withWidth(5).getArea()); // 100
```

> [!note] Зміни відносно попередньої версії
> Попередній приклад (незалежні `Rectangle` і `Square` від `abstract class Shape`) був уже виправленим варіантом, але без порушення, від якого він захищає, тож не пояснював принципу. Додано класичний контрприклад із мутабельним прямокутником.

## 3. Інші типові порушення

Нащадок, що кидає виняток там, де батько працював:

```ts
class Bird {
  fly(): string {
    return "flying";
  }
}
class Penguin extends Bird {
  override fly(): string {
    throw new Error("Penguins cannot fly"); // новий виняток — код для Bird до цього не готовий
  }
}

const birds: Bird[] = [new Bird(), new Penguin()];
for (const bird of birds) {
  try {
    console.log(bird.fly()); // flying
  } catch (err) {
    console.log("broken substitution:", (err as Error).message); // broken substitution: Penguins cannot fly
  }
}
```

Виправлення — ієрархія, що відповідає реальним можливостям: `Bird` без `fly()`, а політ — в окремому інтерфейсі `FlyingBird`, який реалізують лише ті, хто справді літає (це вже [interface-segregation.md](interface-segregation.md)).

Інші ознаки порушення LSP:

- перевизначений метод, що нічого не робить (порожнє тіло) там, де батько мав ефект;
- `if (x instanceof ConcreteSubclass)` у коді, що працює з базовим типом, — «латка» для нащадка, що поводиться інакше.

## Підсумок

- LSP: підтип має бути взаємозамінним з базовим типом — не лише за сигнатурами, а й за поведінкою.
- Підклас не може посилювати передумови, послаблювати постумови, ламати інваріанти батька чи кидати нові винятки.
- Класичний контрприклад — мутабельний квадрат як нащадок прямокутника: `setWidth(5); setHeight(4)` дає 16 замість 20.
- TypeScript порушень LSP не помічає — вони поведінкові.
- Рішення — базова абстракція, що обіцяє лише те, що виконують **усі** нащадки; незмінні об'єкти знімають багато таких конфліктів.
- `instanceof`-перевірки на конкретний підклас у «загальному» коді — сигнал порушення. Пов'язане: [inheritance.md](../OOP/inheritance.md).
