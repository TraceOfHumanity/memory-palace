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

## Задачі для закріплення

18 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Опишіть абстрактний контракт `Shape` (метод `area`) і функцію `totalArea(shapes)`, що залежить лише від контракту.

```js
class Shape { area() { throw new Error('not implemented'); } } class Circle extends Shape { constructor(r) { super(); this.r = r; } area() { return Math.PI * this.r ** 2; } } class Rect extends Shape { constructor(w, h) { super(); this.w = w; this.h = h; } area() { return this.w * this.h; } } const totalArea = (s) => s.reduce((a, x) => a + x.area(), 0)
```

**2.** Що станеться при виклику абстрактного методу, що не реалізований у нащадку?

```js
(() => { class Base { run() { throw new Error('not implemented'); } } class Child extends Base {} try { new Child().run(); } catch (e) { return e.message; } })()
```

**3.** Як заборонити створення абстрактного класу через `new`?

```js
(() => { class Abstract { constructor() { if (new.target === Abstract) throw new TypeError('abstract'); } } class Impl extends Abstract {} try { new Abstract(); } catch (e) { return [e.name, new Impl() instanceof Abstract]; } })()
```

**4.** Що поверне `duck typing`: чи потрібен `extends` для виклику методу?

```js
(() => { const notifier = { send(m) { return 'sent ' + m; } }; const notify = (n, m) => n.send(m); return notify(notifier, 'hi'); })()
```

**5.** Чи можна підмінити залежність об'єктом-заглушкою (абстракція)?

```js
(() => { const real = { fetch: () => 'net' }; const stub = { fetch: () => 'stub' }; const svc = (api) => ({ get: () => api.fetch() }); return [svc(real).get(), svc(stub).get()]; })()
```

### Рівень 2. Деталі й поведінка

**6.** Чи перевіряє JS наявність методу інтерфейсу до виклику?

```js
(() => { const o = {}; try { o.send('x'); } catch (e) { return e.name; } })()
```

**7.** Як програмно перевірити, що об'єкт відповідає «інтерфейсу»?

```js
(() => { const impl = (o, ...m) => m.every(k => typeof o[k] === 'function'); return [impl({ a() {}, b() {} }, 'a', 'b'), impl({ a() {} }, 'a', 'b')]; })()
```

**8.** Що поверне поліморфний виклик через масив різних реалізацій?

```js
(() => { const a = [{ speak: () => 'woof' }, { speak: () => 'meow' }]; return a.map(x => x.speak()); })()
```

**9.** Чому абстракція зменшує зв'язність: що буде, якщо додати третю реалізацію?

```js
(() => { const render = (items) => items.map(i => i.draw()); const items = [{ draw: () => 'circle' }, { draw: () => 'square' }, { draw: () => 'triangle' }]; return render(items); })()
```

**10.** Чим абстрактний клас відрізняється від інтерфейсу (TypeScript)?

### Рівень 3. Нюанси та пастки

**11.** Коли краще інтерфейс, а коли абстрактний клас?

**12.** Що означає «залежати від абстракції, а не від реалізації»?

**13.** Що таке структурна типізація в TypeScript?

**14.** Чи обов'язковий `implements` у TypeScript?

**15.** Напишіть абстрактний `Storage` із шаблонним методом `save(k, v)` (викликає `validate` і `write`).

```js
class Storage { save(k, v) { this.validate(k); return this.write(k, v); } validate(k) { if (!k) throw new Error('empty key'); } write() { throw new Error('abstract'); } } class MemStorage extends Storage { m = new Map(); write(k, v) { this.m.set(k, v); return this.m.size; } }
```

### Рівень 4. Практика

**16.** Напишіть `makeLogger(sink)` — абстракція `sink.write(line)`; перевірте з двома реалізаціями.

```js
const makeLogger = (sink) => ({ info: (m) => sink.write('[info] ' + m) })
```

**17.** Напишіть `Comparable`-подібний контракт: `max(items)` приймає об'єкти з `compareTo`.

```js
const max = (a) => a.reduce((m, x) => x.compareTo(m) > 0 ? x : m); class Num { constructor(v) { this.v = v; } compareTo(o) { return this.v - o.v; } }
```

**18.** Напишіть фабрику, що повертає реалізацію за ім'ям (стратегія).

```js
const strategies = { add: (a, b) => a + b, mul: (a, b) => a * b }; const calc = (op, a, b) => strategies[op](a, b)
```

### Відповіді

1. Виклик `Math.round(totalArea([new Rect(2, 3), new Circle(1)]) * 100) / 100` → `9.14`
2. `'not implemented'`
3. `['TypeError', true]`
4. `'sent hi'`
5. `['net', 'stub']`
6. `'TypeError'`
7. `[true, false]`
8. `['woof', 'meow']`
9. `['circle', 'square', 'triangle']`
10. Інтерфейс описує лише форму й зникає після компіляції; абстрактний клас може містити реалізацію й стан, існує в рантаймі та підтримує `instanceof`
11. Інтерфейс — коли потрібен контракт без спільного коду або клас має виконувати кілька ролей; абстрактний клас — коли є спільна поведінка, яку наслідують
12. Код оперує інтерфейсом/контрактом (`send`, `area`), тож реалізації можна підміняти без змін клієнтського коду
13. Сумісність типів визначається формою (набором полів/методів), а не явним `implements`; об'єкт з потрібними членами підходить під інтерфейс
14. Ні, він лише змушує компілятор перевірити відповідність і дає раннє повідомлення про помилку; без нього працює структурна сумісність
15. Виклик `(() => { const s = new MemStorage(); let e; try { s.save('', 1); } catch (x) { e = x.message; } return [s.save('a', 1), s.save('b', 2), e]; })()` → `[1, 2, 'empty key']`
16. Виклик `(() => { const a = []; const logger1 = makeLogger({ write: (l) => a.push(l) }); logger1.info('x'); const logger2 = makeLogger({ write: (l) => l.toUpperCase() }); return [a, logger2.info('y')]; })()` → `[['[info] x'], '[INFO] Y']`
17. Виклик `max([new Num(3), new Num(9), new Num(5)]).v` → `9`
18. Виклик `[calc('add', 3, 4), calc('mul', 3, 4)]` → `[7, 12]`
