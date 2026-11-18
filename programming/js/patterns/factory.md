# Factory — патерни «фабрика»: Simple Factory, Factory Method, Abstract Factory

## 1. Що таке Factory і навіщо вона

Factory — це сімейство породжуючих патернів, ідея яких одна: відокремити логіку створення об'єкта від коду, що його використовує. Клієнт не пише `new КонкретнийКлас(...)` — він просить фабрику «дай мені об'єкт такого-то виду», а яку саме реалізацію створити і як її налаштувати, вирішує фабрика.

Навіщо: клієнтський код не залежить від конкретних класів (легко замінити чи додати новий вид); складна ініціалізація живе в одному місці, а не розмазана копіпастою по всьому проєкту; фабрика може повертати різні типи, кешувати, перевикористовувати об'єкти — конструктор через `new` так не вміє (завжди створює новий екземпляр саме свого класу).

Під назвою «Factory» ховаються три різні речі — розберемо кожну.

## 2. Проблема: код, що залежить від конкретних класів

```js
class EmailNotification {
  constructor(to) {
    this.to = to;
  }
  send(text) {
    return `Email → ${this.to}: ${text}`;
  }
}
class SmsNotification {
  constructor(to) {
    this.to = to;
  }
  send(text) {
    return `SMS → ${this.to}: ${text}`;
  }
}
class PushNotification {
  constructor(to) {
    this.to = to;
  }
  send(text) {
    return `Push → ${this.to}: ${text}`;
  }
}

// ❌ Клієнт знає про всі класи і сам вибирає, який створити. Кожне
// нове місце, де потрібне сповіщення, дублює цей if/else; додавання
// нового каналу означає правку в усіх таких місцях.
function notifyBad(channel, to, text) {
  let notification;
  if (channel === "email") notification = new EmailNotification(to);
  else if (channel === "sms") notification = new SmsNotification(to);
  else if (channel === "push") notification = new PushNotification(to);
  else throw new Error(`Unknown channel: ${channel}`);
  return notification.send(text);
}
console.log(notifyBad("sms", "+380501112233", "Hello"));
```

## 3. Simple Factory — одна функція, що створює об'єкти

Найпростіший і найчастіший у JS варіант — звичайна функція, що ховає вибір класу. (Строго кажучи, це не «офіційний» патерн із книги GoF, а ідіома, але саме її люди зазвичай мають на увазі.)

```js
function createNotification(channel, to) {
  switch (channel) {
    case "email":
      return new EmailNotification(to);
    case "sms":
      return new SmsNotification(to);
    case "push":
      return new PushNotification(to);
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

console.log(createNotification("email", "a@b.com").send("Hello"));
console.log(createNotification("push", "device-42").send("Hello"));
// тепер вибір класу — в одному місці. Клієнту потрібне лише send()
```

## 4. Фабрика без switch: реєстр конструкторів (Open/Closed)

`switch` у фабриці змушує правити саму фабрику при кожному новому виді. Реєстр дозволяє додавати види ззовні, не чіпаючи код фабрики (принцип відкритості/закритості — SOLID, `common/SOLID/`).

```js
const notificationRegistry = new Map([
  ["email", EmailNotification],
  ["sms", SmsNotification],
  ["push", PushNotification],
]);

function createFromRegistry(channel, ...args) {
  const NotificationClass = notificationRegistry.get(channel);
  if (!NotificationClass) throw new Error(`Unknown channel: ${channel}`);
  return new NotificationClass(...args);
}

// новий канал додається без змін у createFromRegistry:
class TelegramNotification {
  constructor(to) {
    this.to = to;
  }
  send(text) {
    return `Telegram → ${this.to}: ${text}`;
  }
}
notificationRegistry.set("telegram", TelegramNotification);
console.log(createFromRegistry("telegram", "@alex").send("Hello"));
```

## 5. Factory Method — фабричний метод у підкласах

Класичний GoF-патерн: базовий клас описує алгоритм, у якому є крок «створи продукт», але сам не знає, який саме продукт; цей крок (фабричний метод) перевизначають підкласи.

```js
class Dialog {
  // "шаблонний" метод: алгоритм відомий, кнопку створює підклас
  render() {
    const button = this.createButton(); // ← фабричний метод
    return `Dialog with a button: ${button.render()}`;
  }
  createButton() {
    throw new Error("createButton() must be implemented in a subclass");
  }
}

class WindowsButton {
  render() {
    return "[Windows button]";
  }
}
class WebButton {
  render() {
    return "<button>Web button</button>";
  }
}

class WindowsDialog extends Dialog {
  createButton() {
    return new WindowsButton();
  }
}
class WebDialog extends Dialog {
  createButton() {
    return new WebButton();
  }
}

console.log(new WindowsDialog().render());
console.log(new WebDialog().render());
// Dialog.render() не залежить від конкретної кнопки — його не треба
// змінювати, коли з'являється новий вид діалогу (детально
// прототипне наслідування й extends — common/prototypal-inheritance.md)
```

Різниця з Simple Factory: там вибір робить функція за параметром, тут вибір робить підклас через перевизначення методу.

## 6. Abstract Factory — фабрика цілих «сімейств» пов'язаних об'єктів

Коли треба створювати не один об'єкт, а набір узгоджених між собою об'єктів (кнопка + чекбокс + меню однієї теми), і гарантувати, що вони не змішаються з елементами іншої теми.

```js
class LightButton {
  render() {
    return "light button";
  }
}
class LightCheckbox {
  render() {
    return "light checkbox";
  }
}
class DarkButton {
  render() {
    return "dark button";
  }
}
class DarkCheckbox {
  render() {
    return "dark checkbox";
  }
}

const lightThemeFactory = {
  createButton: () => new LightButton(),
  createCheckbox: () => new LightCheckbox(),
};
const darkThemeFactory = {
  createButton: () => new DarkButton(),
  createCheckbox: () => new DarkCheckbox(),
};

function renderForm(themeFactory) {
  // клієнт працює з інтерфейсом фабрики й не знає про Light/Dark
  const button = themeFactory.createButton();
  const checkbox = themeFactory.createCheckbox();
  return `${button.render()} + ${checkbox.render()}`;
}

console.log(renderForm(lightThemeFactory)); // light button + light checkbox
console.log(renderForm(darkThemeFactory)); // dark button + dark checkbox
// змінити тему цілого інтерфейсу = передати іншу фабрику
```

## 7. Фабрична функція як заміна класу: приватний стан через замикання

У JS «фабрика» часто — просто функція, що повертає об'єкт. Вона не потребує `new`, не має проблем із втратою `this` (`common/this.md`) і може ховати стан у замиканні (`common/closures.md`):

```js
function createCounter(start = 0) {
  let count = start; // приватне: ззовні недоступне

  return {
    increment: () => ++count,
    current: () => count,
  };
}

const c1 = createCounter();
const c2 = createCounter(10);
c1.increment();
c1.increment();
console.log(c1.current(), c2.current()); // 2 10 — незалежні екземпляри
console.log(c1.count); // undefined — стан справді прихований
```

Компроміс проти `class`: кожен об'єкт має власні копії методів (у `class` вони спільні на прототипі — економія пам'яті, детально `common/prototypal-inheritance.md`, розділ 10), і немає `instanceof`.

## 8. Фабрика повертає щось, чого конструктор не може

Кешування/перевикористання екземплярів: `new` завжди створює новий об'єкт; фабрика може віддати вже наявний (це перегукується з Singleton і Flyweight — [singleton.md](singleton.md)).

```js
const colorCache = new Map();
function getColor(hex) {
  if (!colorCache.has(hex)) {
    colorCache.set(hex, Object.freeze({ hex }));
  }
  return colorCache.get(hex);
}
console.log(getColor("#ff0000") === getColor("#ff0000")); // true — один об'єкт
```

Асинхронне створення: конструктор не може бути `async` (не може повернути `Promise`), тому для об'єктів, яким потрібна асинхронна ініціалізація (з'єднання, читання файлу), використовують статичну фабрику.

```js
class Connection {
  constructor(id) {
    this.id = id;
  }

  static async create(id) {
    await new Promise((resolve) => setTimeout(resolve, 10)); // "підключення"
    return new Connection(id);
  }
}
```

Повернення залежно від вхідних даних: один вхід — різні типи виходу. Клієнт працює з однаковим інтерфейсом.

```js
function parserFor(filename) {
  if (filename.endsWith(".json")) return { parse: (t) => JSON.parse(t) };
  if (filename.endsWith(".csv")) return { parse: (t) => t.split("\n").map((r) => r.split(",")) };
  throw new Error(`No parser for ${filename}`);
}
console.log(parserFor("data.csv").parse("a,b\n1,2"));

(async () => {
  const conn = await Connection.create("db-1");
  console.log("Async factory created:", conn.id);
})();
```

## 9. Поширені помилки та надмірне ускладнення

- Фабрика заради фабрики: якщо є один клас і одна конфігурація, звичайний `new` простіший і чесніший — не додавай шар без потреби.
- Фабрика-«комбайн» з десятками параметрів і гілок — сигнал, що пора розбити її на кілька спеціалізованих (або перейти на Builder, коли головна складність — у поетапній збірці одного об'єкта, а не у виборі виду).
- Змішування вибору й побічних ефектів: фабрика має створювати об'єкти, а не робити запити в мережу чи писати логи.

## 10. Зв'язок з NestJS

У Nest фабричний підхід вбудований у DI: provider з `useFactory` (`node/nest/providers-and-dependency-injection.md`, розділ 7.3) — це фабрика, якій контейнер сам передає залежності (`inject: [...]`), і яка може бути асинхронною. Ручний Simple Factory тут потрібен рідше, бо вибір реалізації (`useClass` залежно від середовища) і створення значень контейнер бере на себе.

## Підсумок

- Factory відокремлює створення об'єкта від його використання: клієнт просить «дай об'єкт виду X» і не залежить від конкретних класів та деталей ініціалізації.
- Simple Factory — функція з вибором класу (`switch` або реєстр конструкторів); реєстр краще, бо нові види додаються без правки фабрики (open/closed).
- Factory Method — базовий клас має крок «створи продукт», а підкласи перевизначають його; вибір робить підклас, не параметр.
- Abstract Factory — створює ціле сімейство узгоджених об'єктів (темна/світла тема); зміна сімейства = передача іншої фабрики.
- У JS фабрика часто просто функція, що повертає об'єкт: без `new`, без проблем із `this`, приватний стан у замиканні (ціна — власні копії методів і немає `instanceof`).
- Фабрика вміє те, чого не вміє `new`: кешувати/перевикористовувати екземпляри, повертати різні типи, створювати асинхронно (статичний `async create`, бо конструктор не може бути `async`).
- Не ускладнюй: для одного класу без варіацій достатньо `new`; у Nest роль фабрики виконує provider з `useFactory`.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Реалізуйте Simple Factory: `createShape(type, ...args)`.

```js
class Circle { constructor(r) { this.r = r; } area() { return +(Math.PI * this.r ** 2).toFixed(2); } } class Rect { constructor(w, h) { this.w = w; this.h = h; } area() { return this.w * this.h; } } const createShape = (t, ...a) => { const m = { circle: Circle, rect: Rect }; if (!m[t]) throw new Error('unknown ' + t); return new m[t](...a); }
```

**2.** Реєстр фабрик: `register(type, fn)` без зміни коду.

```js
const reg = new Map(); const register = (t, f) => reg.set(t, f); const create = (t, ...a) => reg.get(t)(...a)
```

**3.** Factory Method: базовий клас із абстрактним `create`.

```js
class Dialog { render() { return this.create().draw(); } create() { throw new Error('abstract'); } } class WinBtn { draw() { return 'win'; } } class MacBtn { draw() { return 'mac'; } } class WinDialog extends Dialog { create() { return new WinBtn(); } } class MacDialog extends Dialog { create() { return new MacBtn(); } }
```

### Рівень 2. Деталі й поведінка

**4.** Abstract Factory: сімейства об'єктів (темна/світла тема).

```js
const dark = { button: () => 'dark-btn', input: () => 'dark-input' }; const light = { button: () => 'light-btn', input: () => 'light-input' }; const ui = (f) => [f.button(), f.input()]
```

**5.** Фабрика функцій: `makeAdder(n)`.

```js
const makeAdder = (n) => (x) => x + n
```

**6.** Фабрика з пулом: повторне використання об'єктів.

```js
const pool = () => { const free = []; let made = 0; return { get: () => free.pop() ?? { id: ++made }, release: (o) => free.push(o), get made() { return made; } }; }
```

### Рівень 3. Нюанси та пастки

**7.** Фабрика парсерів за розширенням файлу.

```js
const parsers = { json: JSON.parse, csv: (s) => s.split(',') }; const parse = (name, s) => parsers[name.split('.').pop()](s)
```

**8.** Фабрика з валідацією аргументів та замороженим результатом.

```js
const makeUser = (n, a) => { if (!n) throw new Error('name'); return Object.freeze({ n, a: a ?? 0 }); }
```

**9.** Статичні фабричні методи класу: `Money.usd`, `Money.eur`.

```js
class Money { constructor(a, c) { this.a = a; this.c = c; } static usd(a) { return new Money(a, 'USD'); } static eur(a) { return new Money(a, 'EUR'); } toString() { return `${this.a} ${this.c}`; } }
```

### Рівень 4. Практика

**10.** Фабрика обробників помилок за кодом.

```js
class NotFound extends Error { constructor() { super('nf'); this.status = 404; } } class Forbidden extends Error { constructor() { super('fb'); this.status = 403; } } const err = (c) => new ({ 404: NotFound, 403: Forbidden }[c] ?? Error)()
```

**11.** Чим Factory Method відрізняється від Abstract Factory?

**12.** Яку проблему вирішує Factory?

### Відповіді

1. Виклик `(() => { let e; try { createShape('x'); } catch (x) { e = x.message; } return [createShape('circle', 1).area(), createShape('rect', 2, 3).area(), e]; })()` → `[3.14, 6, 'unknown x']`
2. Виклик `(() => { register('num', x => x * 2); register('str', s => s + '!'); return [create('num', 4), create('str', 'hi')]; })()` → `[8, 'hi!']`
3. Виклик `[new WinDialog().render(), new MacDialog().render()]` → `['win', 'mac']`
4. Виклик `[ui(dark), ui(light)]` → `[['dark-btn', 'dark-input'], ['light-btn', 'light-input']]`
5. Виклик `[makeAdder(5)(10), makeAdder(-1)(1)]` → `[15, 0]`
6. Виклик `(() => { const p = pool(); const a = p.get(); p.release(a); const b = p.get(); return [a === b, p.made]; })()` → `[true, 1]`
7. Виклик `[parse('a.json', '[1,2]'), parse('b.csv', 'x,y')]` → `[[1, 2], ['x', 'y']]`
8. Виклик `(() => { const u = makeUser('A'); u.a = 5; return [u, Object.isFrozen(u)]; })()` → `[{ n: 'A', a: 0 }, true]`
9. Виклик `[String(Money.usd(5)), String(Money.eur(7))]` → `['5 USD', '7 EUR']`
10. Виклик `[err(404).status, err(403).message, err(500) instanceof Error]` → `[404, 'fb', true]`
11. Factory Method — метод, що створює один продукт і перевизначається в підкласах; Abstract Factory — інтерфейс для створення цілих сімейств пов'язаних об'єктів
12. Ізолює код від конкретних класів: клієнт просить об'єкт за ім'ям або контрактом, а створення зосереджене в одному місці
