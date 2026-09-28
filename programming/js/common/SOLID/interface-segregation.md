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
