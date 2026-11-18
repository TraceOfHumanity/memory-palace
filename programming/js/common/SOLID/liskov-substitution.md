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

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Сформулюйте принцип підстановки Барбари Лісков.

**2.** Чому `Square extends Rectangle` порушує LSP?

**3.** Покажіть, як порушення LSP ламає код клієнта.

```js
(() => { class R { constructor(w, h) { this.w = w; this.h = h; } setW(w) { this.w = w; } setH(h) { this.h = h; } area() { return this.w * this.h; } } class S extends R { setW(w) { this.w = this.h = w; } setH(h) { this.w = this.h = h; } } const grow = (r) => { r.setW(5); r.setH(2); return r.area(); }; return [grow(new R(1, 1)), grow(new S(1, 1))]; })()
```

**4.** Виправте: спільна абстракція `Shape` без `setW/setH`, а окремі `Rect` та `Square`.

```js
class Shape { area() { throw new Error('abstract'); } } class Rect extends Shape { constructor(w, h) { super(); this.w = w; this.h = h; } area() { return this.w * this.h; } } class Square extends Shape { constructor(a) { super(); this.a = a; } area() { return this.a ** 2; } }
```

### Рівень 2. Деталі й поведінка

**5.** Що порушує LSP: нащадок кидає виняток, якого не було в базовому?

```js
(() => { class Bird { fly() { return 'fly'; } } class Penguin extends Bird { fly() { throw new Error('cannot fly'); } } const move = (b) => b.fly(); try { return [move(new Bird()), move(new Penguin())]; } catch (e) { return e.message; } })()
```

**6.** Виправте проблему Penguin: розділіть `Bird` і `FlyingBird`.

```js
class Bird { move() { return 'walk'; } } class FlyingBird extends Bird { move() { return 'fly'; } } class Penguin extends Bird {} const run = (b) => b.move()
```

**7.** Чи порушує LSP нащадок, що посилює передумови?

```js
(() => { class Base { set(n) { this.n = n; return 'ok'; } } class Strict extends Base { set(n) { if (n < 0) throw new RangeError('non-negative'); return super.set(n); } } const use = (o) => o.set(-1); try { return [use(new Base()), use(new Strict())]; } catch (e) { return e.name; } })()
```

**8.** Чи порушує LSP нащадок, що повертає інший тип?

```js
(() => { class A { size() { return 3; } } class B extends A { size() { return '3'; } } const sum = (o) => o.size() + 1; return [sum(new A()), sum(new B())]; })()
```

### Рівень 3. Нюанси та пастки

**9.** Які правила контрактів описує LSP?

**10.** Як швидко помітити порушення LSP?

**11.** Чому композиція іноді безпечніша за наслідування з погляду LSP?

**12.** Напишіть `ReadOnlyList`, що не наслідує змінюваний `List`, а лише читає.

```js
class ReadOnlyList { #a; constructor(a) { this.#a = [...a]; } get(i) { return this.#a[i]; } get size() { return this.#a.length; } }
```

### Рівень 4. Практика

**13.** Як перевірити заміну на практиці: один тестовий набір для кожного нащадка?

```js
(() => { class A { total(x) { return x + 1; } } class B extends A { total(x) { return x + 1; } } const contract = (C) => new C().total(1) === 2; return [A, B].map(contract); })()
```

**14.** Що таке коваріантність повернень і контраваріантність параметрів?

**15.** Напишіть `Stack` і `LimitedStack`, що додає `limit` без порушення контракту `push` (повертає `false` замість винятку).

```js
class Stack { #a = []; push(x) { this.#a.push(x); return true; } get size() { return this.#a.length; } } class Limited extends Stack { constructor(n) { super(); this.n = n; } push(x) { return this.size >= this.n ? false : super.push(x); } }
```

### Відповіді

1. Об'єкти підкласу мають бути взаємозамінними з об'єктами базового класу без порушення коректності програми
2. Квадрат змінює очікуване від прямокутника правило незалежності сторін: після `setWidth` клієнт очікує незмінну висоту, а квадрат її змінює
3. `[10, 4]`
4. Виклик `[new Rect(5, 2).area(), new Square(3).area()]` → `[10, 9]`
5. `'cannot fly'`
6. Виклик `[run(new FlyingBird()), run(new Penguin()), run(new Bird())]` → `['fly', 'walk', 'walk']`
7. `'RangeError'`
8. `[4, '31']`
9. Передумови в нащадку не можна посилювати, післяумови — послаблювати; інваріанти базового класу зберігаються; нові винятки не додаються
10. Клієнтський код перевіряє тип (`instanceof`) перед викликом, нащадок кидає `not implemented`, або метод нащадка тихо нічого не робить
11. Об'єкт не обіцяє бути підтипом, тож не береться на себе весь контракт базового типу; використовується лише потрібна поведінка
12. Виклик `(() => { const l = new ReadOnlyList([1, 2, 3]); return [l.get(1), l.size, typeof l.push]; })()` → `[2, 3, 'undefined']`
13. `[true, true]`
14. Нащадок може повертати вужчий тип і приймати ширший тип параметра, не ламаючи клієнта
15. Виклик `(() => { const s = new Limited(2); return [s.push(1), s.push(2), s.push(3), s.size]; })()` → `[true, true, false, 2]`
