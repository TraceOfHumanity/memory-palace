# Composite — патерн «дерево, де група поводиться як один об'єкт»

## 1. Що таке Composite

Composite — структурний патерн: об'єкти складаються в дерево, і клієнт працює з окремим елементом (Leaf, «листок») та з групою елементів (Composite, «вузол») однаково — через спільний інтерфейс.

Учасники: `Component` — спільний інтерфейс (тут: `getSize()`, `print()`); `Leaf` — простий елемент без дітей (файл); `Composite` — має дітей (папка) і делегує їм виклики, агрегуючи результат.

Коли це корисно: ієрархії «частина-ціле» — файлова система, меню, UI-компоненти, організаційна структура, DOM, AST, категорії товарів; клієнт не хоче розрізняти «один» і «багато» (`if`/`else` за типом).

## 2. Проблема: клієнт мусить розрізняти файл і папку

```js
// ❌ Без патерна кожне місце коду перевіряє тип і сам обходить дерево:
function totalSizeBad(node) {
  if (node.children) {
    let sum = 0;
    for (const child of node.children) sum += totalSizeBad(child);
    return sum;
  }
  return node.size;
}
console.log(totalSizeBad({ children: [{ size: 10 }, { children: [{ size: 5 }, { size: 7 }] }] })); // 22
```

Працює, але логіка «як обійти» розмазана по всьому коду, а нові операції (друк, пошук, права) вимагають нових перевірок типу.

## 3. Класична реалізація: файлова система

```js
class FileNode {
  constructor(name, size) {
    this.name = name;
    this.size = size;
  }

  getSize() {
    return this.size;
  }

  print(indent = 0) {
    console.log(`${"  ".repeat(indent)}📄 ${this.name} (${this.size} KB)`);
  }
}

class Folder {
  #children = [];

  constructor(name) {
    this.name = name;
  }

  add(...nodes) {
    this.#children.push(...nodes);
    return this; // для ланцюжка викликів
  }

  remove(node) {
    const i = this.#children.indexOf(node);
    if (i !== -1) this.#children.splice(i, 1);
  }

  getSize() {
    // делегуємо дітям — рекурсія природно збирає суму
    return this.#children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent = 0) {
    console.log(`${"  ".repeat(indent)}📁 ${this.name} (${this.getSize()} KB)`);
    for (const child of this.#children) child.print(indent + 1);
  }

  // Composite зручно робить ітерабельним (common/data-structures/iterator/iterator.md)
  *[Symbol.iterator]() {
    for (const child of this.#children) {
      yield child;
      if (child instanceof Folder) yield* child;
    }
  }
}

const root = new Folder("project").add(
  new FileNode("README.md", 4),
  new Folder("src").add(
    new FileNode("index.js", 12),
    new FileNode("utils.js", 8),
    new Folder("lib").add(new FileNode("core.js", 30)),
  ),
  new Folder("docs").add(new FileNode("guide.md", 20)),
);

root.print();
// 📁 project (74 KB)
//   📄 README.md (4 KB)
//   📁 src (50 KB)
//     📄 index.js (12 KB)
//     📄 utils.js (8 KB)
//     📁 lib (30 KB)
//       📄 core.js (30 KB)
//   📁 docs (20 KB)
//     📄 guide.md (20 KB)

console.log(root.getSize()); // 74 — папка і файл відповідають на getSize() однаково

// клієнт не розрізняє листок і вузол:
const parts = [new FileNode("a.txt", 1), new Folder("empty")];
console.log(parts.map((p) => p.getSize())); // [ 1, 0 ]
```

## 4. Обхід дерева через ітератор

```js
const names = [...root].map((n) => n.name);
console.log(names);
// [ 'README.md', 'src', 'index.js', 'utils.js', 'lib', 'core.js', 'docs', 'guide.md' ]

// пошук через generator без збору всього дерева в масив (ліниво):
function* findFiles(folder, predicate) {
  for (const node of folder) {
    if (node instanceof FileNode && predicate(node)) yield node;
  }
}
console.log([...findFiles(root, (f) => f.name.endsWith(".js"))].map((f) => f.name));
// [ 'index.js', 'utils.js', 'core.js' ]
```

## 5. Composite з даних: прості об'єкти + рекурсія

У JS часто обходяться без класів: дерево — це вкладені об'єкти, а операції — рекурсивні функції (JSON-меню, конфіги, AST):

```js
const menu = {
  label: "File",
  items: [
    { label: "New" },
    { label: "Open", items: [{ label: "From disk" }, { label: "From cloud" }] },
  ],
};

function countItems(node) {
  const children = node.items ?? [];
  return 1 + children.reduce((sum, child) => sum + countItems(child), 0);
}
console.log(countItems(menu)); // 5

function flatten(node, path = []) {
  const current = [...path, node.label];
  const children = node.items ?? [];
  return children.length ? children.flatMap((c) => flatten(c, current)) : [current.join(" → ")];
}
console.log(flatten(menu));
// [ 'File → New', 'File → Open → From disk', 'File → Open → From cloud' ]
```

## 6. Приклад: UI-компоненти (render для всіх однаково)

```js
class Text {
  constructor(value) {
    this.value = value;
  }
  render() {
    return this.value;
  }
}

class Box {
  #children;
  constructor(tag, ...children) {
    this.tag = tag;
    this.#children = children;
  }
  render() {
    return `<${this.tag}>${this.#children.map((c) => c.render()).join("")}</${this.tag}>`;
  }
}

const page = new Box("div", new Box("h1", new Text("Hello")), new Box("p", new Text("Composite in action")));
console.log(page.render());
// <div><h1>Hello</h1><p>Composite in action</p></div>
```

Так побудований DOM і компонентні дерева React/Vue: компонент містить компоненти, а render/mount викликається однаково.

## 7. Питання дизайну та пастки

Де оголошувати `add`/`remove`: у `Component` (максимальна прозорість — клієнт не розрізняє типи, але `Leaf` мусить реалізувати непотрібне `add` → кидає помилку) або лише в `Composite` (безпечніше: `Leaf` не має `add`, але клієнт мусить знати, з чим працює). Вище — другий варіант.

```js
class Leaf {
  add() {
    throw new Error("A leaf cannot have children");
  }
}
try {
  new Leaf().add();
} catch (err) {
  console.log(err.message); // A leaf cannot have children
}
```

Цикли: якщо додати папку саму в себе (або предка в нащадка), обхід піде у нескінченну рекурсію → `RangeError: Maximum call stack size exceeded`. Перевіряйте при `add()` або ведіть множину відвіданих вузлів.

```js
const loopy = new Folder("loopy");
loopy.add(loopy);
try {
  loopy.getSize();
} catch (err) {
  console.log(err.name); // RangeError
}
```

Глибока рекурсія: дуже глибоке дерево переповнить стек викликів. Для величезних дерев обходьте ітеративно зі своїм стеком, а не рекурсією. Приклад — сума листків через ітератор, який сам обходить дерево:

```js
console.log([...root].filter((n) => n instanceof FileNode).reduce((s, f) => s + f.getSize(), 0)); // 74
```

Загальний інтерфейс занадто широкий: якщо `Component` змушує `Leaf` підтримувати методи, які тому не мають сенсу, — інтерфейс варто звузити.

Кешування агрегатів: `getSize()` перераховується щоразу. Для великих дерев кешуйте і інвалідуйте при `add`/`remove` (Caching Proxy — [proxy.md](proxy.md)).

## 8. Зв'язок з іншими патернами та реальні приклади

- Decorator: та сама структура «обгортка над Component», але обгортає один об'єкт і додає поведінку ([decorator.md](decorator.md)); Composite обгортає багато дітей і агрегує результат;
- Iterator: обхід дерева (розділ 4);
- Builder: зручно збирати складні дерева ([builder.md](builder.md));
- Visitor: додає нові операції до дерева без зміни класів;
- реальні приклади: DOM (`Node` → `Element`/`Text`), React/Vue компоненти, AST у Babel/ESLint/TypeScript, файлові системи, Nest-модулі (модуль містить модулі — `node/nest/modules.md`), права доступу (група → групи → користувачі).

## Підсумок

- Composite будує дерево «частина-ціле»: окремий елемент (Leaf) і група (Composite) мають спільний інтерфейс, тому клієнт працює з ними однаково, без перевірок типу.
- Composite не рахує сам, а делегує дітям і агрегує (`getSize` = сума `getSize` дітей) — рекурсія природно відповідає структурі дерева.
- Зручно робити вузол ітерабельним (`Symbol.iterator` + `yield*`) для обходу, пошуку, фільтрації без окремого коду.
- В JS дерево часто є просто вкладеними об'єктами, а операції — рекурсивними функціями (`menu.items`) — класи не обов'язкові.
- Пастки: цикли (вузол усередині себе → `RangeError`), глибока рекурсія (переповнення стеку), надто широкий інтерфейс `Component`, повторне обчислення агрегатів без кешу.
- Вибір: `add`/`remove` лише в `Composite` — безпечніше; в `Component` — прозоріше, але `Leaf` мусить кидати помилку.
- Реальні приклади: DOM, компонентні дерева React/Vue, AST, файлові системи, меню, ієрархії модулів Nest.
