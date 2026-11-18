# SOLID: I — Interface Segregation Principle (принцип розділення інтерфейсів)

## 0. Формулювання

> Клієнти не повинні залежати від методів, якими вони не користуються.

Краще кілька вузьких інтерфейсів, кожен під конкретну роль, ніж один «товстий» (fat interface), який змушує реалізації мати зайві методи-заглушки.

## 1. Порушення: один інтерфейс на всі пристрої

```ts
interface MultiFunctionDevice {
  print(document: string): string;
  scan(document: string): string;
  fax(document: string): string;
}

class BasicPrinter implements MultiFunctionDevice {
  print(document: string): string {
    return `Printing: ${document}`;
  }
  scan(): string {
    throw new Error("BasicPrinter cannot scan"); // заглушка — метод не має сенсу
  }
  fax(): string {
    throw new Error("BasicPrinter cannot fax"); // ще одна заглушка
  }
}

function scanAll(devices: MultiFunctionDevice[]): void {
  for (const device of devices) {
    try {
      console.log(device.scan("report.pdf"));
    } catch (err) {
      console.log((err as Error).message); // BasicPrinter cannot scan
    }
  }
}
scanAll([new BasicPrinter()]);
```

Наслідки:

- `BasicPrinter` змушений реалізовувати методи, які лише кидають помилки, — це ще й порушення [liskov-substitution.md](liskov-substitution.md);
- типи брешуть: компілятор дозволяє викликати `scan` у принтера, а падає лише під час виконання;
- зміна сигнатури `fax()` зачепить усі класи, навіть ті, що факсом не користуються.

## 2. Виправлення: інтерфейс на кожну роль

```ts
interface Printer {
  print(document: string): string;
}

interface Scanner {
  scan(document: string): string;
}

interface Fax {
  fax(document: string): string;
}

class AllInOnePrinter implements Printer, Scanner, Fax {
  print(document: string): string {
    return `Printing: ${document}`;
  }
  scan(document: string): string {
    return `Scanning: ${document}`;
  }
  fax(document: string): string {
    return `Faxing: ${document}`;
  }
}

class PrinterOnly implements Printer {
  print(document: string): string {
    return `Printing: ${document}`;
  }
}

class ScannerOnly implements Scanner {
  scan(document: string): string {
    return `Scanning: ${document}`;
  }
}
```

Кожна функція тепер вимагає **лише** ту роль, яка їй потрібна, — і приймає будь-який пристрій, що цю роль має:

```ts
function printAll(printers: Printer[], document: string): void {
  for (const printer of printers) {
    console.log(printer.print(document));
  }
}

function scanWith(scanner: Scanner, document: string): string {
  return scanner.scan(document);
}

const allInOne = new AllInOnePrinter();
printAll([allInOne, new PrinterOnly()], "invoice.pdf");
// Printing: invoice.pdf
// Printing: invoice.pdf
console.log(scanWith(new ScannerOnly(), "passport.jpg")); // Scanning: passport.jpg
console.log(scanWith(allInOne, "contract.pdf")); // Scanning: contract.pdf
console.log(allInOne.fax("letter.pdf")); // Faxing: letter.pdf
```

Помилку, яка в розділі 1 траплялася лише в рантаймі, тепер ловить компілятор:

```ts
// scanWith(new PrinterOnly(), "photo.jpg"); // ❌ Property 'scan' is missing in type 'PrinterOnly' but required in type 'Scanner'.
```

## 3. Комбінування ролей

Якщо функції потрібні кілька ролей одночасно — їх поєднують intersection-типом, а не створюють новий «товстий» інтерфейс ([union-and-intersection-types.md](../../typescript/union-and-intersection-types.md)):

```ts
function copy(device: Printer & Scanner, document: string): string {
  return device.print(device.scan(document));
}
console.log(copy(allInOne, "page.pdf")); // Printing: Scanning: page.pdf
```

## 4. ISP у TypeScript без інтерфейсів

Функція може оголосити мінімальну потрібну форму прямо в параметрі — навіть `Pick` від великого типу. Це той самий принцип: залежати лише від того, що використовуєш.

```ts
type User = { id: number; name: string; email: string; passwordHash: string };

function greeting(user: Pick<User, "name">): string {
  return `Hello, ${user.name}!`; // функції не потрібні email чи passwordHash
}
console.log(greeting({ name: "Olena" })); // Hello, Olena! — у тестах досить передати одне поле
```

## Підсумок

- ISP: клієнт не повинен залежати від методів, якими не користується.
- «Товстий» інтерфейс змушує реалізації мати заглушки (часто — що кидають помилки), робить типи брехливими і зв'язує незалежні класи.
- Рішення — вузькі інтерфейси під ролі (`Printer`, `Scanner`, `Fax`); клас реалізує стільки, скільки справді вміє.
- Функції вимагають мінімальну потрібну роль; кілька ролей поєднуються через `A & B`.
- У TS принцип працює й без `interface`: мінімальна форма параметра або `Pick<T, ...>`.
- Пов'язані принципи: [single-responsibility.md](single-responsibility.md), [dependency-inversion.md](dependency-inversion.md).

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Сформулюйте принцип розділення інтерфейсів.

**2.** Чому «жирний» інтерфейс `Machine { print, scan, fax }` проблемний для простого принтера?

**3.** Покажіть, що відбувається, коли клас реалізує невикористовувані методи.

```js
(() => { class OldPrinter { print() { return 'p'; } scan() { throw new Error('not supported'); } } const o = new OldPrinter(); try { return [o.print(), o.scan()]; } catch (e) { return e.message; } })()
```

**4.** Розділіть на ролі `Printer`, `Scanner` і складіть багатофункціональний пристрій композицією.

```js
const printer = { print: (d) => 'print ' + d }; const scanner = { scan: () => 'scanned' }; const mfp = { ...printer, ...scanner }
```

### Рівень 2. Деталі й поведінка

**5.** Напишіть `canPrint(device)` через duck typing замість великого інтерфейсу.

```js
const canPrint = (d) => typeof d.print === 'function'
```

**6.** Створіть ролі `Readable` і `Writable` та клас, що реалізує обидві (через міксин).

```js
const Readable = (B) => class extends B { read() { return 'r'; } }; const Writable = (B) => class extends B { write() { return 'w'; } }; class File extends Writable(Readable(Object)) {}
```

**7.** Напишіть `describe(obj, ...methods)`, що перевіряє, чи об'єкт має лише потрібні для клієнта методи.

```js
const has = (o, ...m) => m.every(k => typeof o[k] === 'function')
```

**8.** Функція-клієнт отримує лише потрібне: `sendReport(emailer)` вимагає тільки `send`.

```js
const sendReport = (e, r) => e.send(r); const fake = { send: (r) => 'sent:' + r }
```

### Рівень 3. Нюанси та пастки

**9.** Як ISP пов'язаний із TypeScript `Pick`/`Omit`?

**10.** Чи завжди дроблення інтерфейсів корисне?

**11.** Яка різниця між ISP та SRP?

**12.** Складіть роль `Logger` і `Metrics` окремо та об'єднайте `Service` лише з тим, що потрібно.

```js
const logger = { log: (m) => 'log:' + m }; const metrics = { inc: (k) => 'inc:' + k }; const mkService = (deps) => ({ run: () => [deps.log?.('run'), deps.inc?.('runs')] })
```

### Рівень 4. Практика

**13.** Напишіть адаптер, що перетворює «жирний» об'єкт на вузьку роль.

```js
const asReader = (o) => ({ read: () => o.read() }); const fat = { read: () => 'data', write() {}, delete() {} }
```

**14.** Що поверне перевірка контракту за наявністю методів для різних пристроїв?

```js
(() => { const dev = [{ print() {}, scan() {} }, { print() {} }, { scan() {} }]; return dev.map(d => ['print', 'scan'].filter(m => typeof d[m] === 'function')); })()
```

**15.** Як розділити «жирний» об'єкт на дві ролі через деструктуризацію?

```js
(() => { const fat = { read: 1, write: 2, del: 3 }; const { read, ...rest } = fat; return [{ read }, rest]; })()
```

### Відповіді

1. Клієнти не повинні залежати від методів, яких вони не використовують; краще кілька вузьких інтерфейсів, ніж один великий
2. Принтер змушений реалізовувати `scan` і `fax` заглушками чи винятками, що порушує LSP і створює залежність від зайвих методів
3. `'not supported'`
4. Виклик `[mfp.print('x'), mfp.scan(), Object.keys(printer), Object.keys(mfp)]` → `['print x', 'scanned', ['print'], ['print', 'scan']]`
5. Виклик `[canPrint({ print() {} }), canPrint({ scan() {} })]` → `[true, false]`
6. Виклик `(() => { const f = new File(); return [f.read(), f.write()]; })()` → `['r', 'w']`
7. Виклик `[has({ a() {}, b() {} }, 'a'), has({ a() {} }, 'a', 'b')]` → `[true, false]`
8. Виклик `sendReport(fake, 'Q1')` → `'sent:Q1'`
9. Можна виводити вузький тип із великого: `Pick<Big, 'a' | 'b'>`; функція приймає лише потрібну частину, а не весь інтерфейс
10. Ні: надмірно дрібні інтерфейси ускладнюють розуміння; ділять за ролями клієнтів, а не за кожним методом
11. SRP — про причини змін класу, ISP — про залежності клієнтів від методів інтерфейсу; вони доповнюють одне одного
12. Виклик `[mkService({ ...logger, ...metrics }).run(), mkService(logger).run()]` → `[['log:run', 'inc:runs'], ['log:run', undefined]]`
13. Виклик `(() => { const r = asReader(fat); return [r.read(), Object.keys(r)]; })()` → `['data', ['read']]`
14. `[['print', 'scan'], ['print'], ['scan']]`
15. `[{ read: 1 }, { write: 2, del: 3 }]`
