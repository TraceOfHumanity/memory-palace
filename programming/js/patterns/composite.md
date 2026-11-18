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

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Реалізуйте Composite: `File` і `Dir` із спільним методом `size()`.

```js
class File { constructor(n, s) { this.n = n; this.s = s; } size() { return this.s; } } class Dir { constructor(n, c = []) { this.n = n; this.c = c; } add(x) { this.c.push(x); return this; } size() { return this.c.reduce((a, x) => a + x.size(), 0); } }
```

**2.** Додайте `print(depth)` із відступами для дерева.

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } print(d = 0) { return ['  '.repeat(d) + this.n, ...this.c.flatMap(x => x.print(d + 1))]; } }
```

**3.** Підрахуйте кількість листків.

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } leaves() { return this.c.length ? this.c.reduce((a, x) => a + x.leaves(), 0) : 1; } }
```

**4.** Знайдіть вузол за ім'ям.

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } find(n) { if (this.n === n) return this; for (const x of this.c) { const r = x.find(n); if (r) return r; } return null; } }
```

### Рівень 2. Деталі й поведінка

**5.** Обчисліть глибину дерева.

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } depth() { return 1 + Math.max(0, ...this.c.map(x => x.depth())); } }
```

**6.** Реалізуйте меню з підменю: `total()` рахує ціни страв.

```js
class Item { constructor(p) { this.p = p; } price() { return this.p; } } class Menu { constructor(items) { this.i = items; } price() { return this.i.reduce((a, x) => a + x.price(), 0); } }
```

**7.** Додайте `remove(child)`.

```js
class N { constructor(n) { this.n = n; this.c = []; } add(x) { this.c.push(x); return this; } remove(x) { this.c = this.c.filter(y => y !== x); return this; } }
```

**8.** Реалізуйте ітератор по дереву (генератор, обхід у глибину).

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } *[Symbol.iterator]() { yield this.n; for (const x of this.c) yield* x; } }
```

### Рівень 3. Нюанси та пастки

**9.** Обхід у ширину.

```js
class N { constructor(n, c = []) { this.n = n; this.c = c; } bfs() { const q = [this], r = []; while (q.length) { const x = q.shift(); r.push(x.n); q.push(...x.c); } return r; } }
```

**10.** Реалізуйте композит команд: `Macro.run()` виконує вкладені команди по черзі.

```js
class Cmd { constructor(f) { this.f = f; } run(log) { log.push(this.f); } } class Macro { constructor(c) { this.c = c; } run(log) { this.c.forEach(x => x.run(log)); } }
```

**11.** Побудуйте дерево з плоского списку `{id, parent}`.

```js
const tree = (rows) => { const m = new Map(rows.map(r => [r.id, { ...r, children: [] }])); const roots = []; for (const n of m.values()) (n.parent == null ? roots : m.get(n.parent).children).push(n); return roots; }
```

**12.** Яку проблему вирішує Composite?

### Рівень 4. Практика

**13.** Що таке листок і композит?

**14.** Чи потрібні в листка методи `add/remove`?

### Відповіді

1. Виклик `new Dir('root', [new File('a', 10), new Dir('d', [new File('b', 5), new File('c', 7)])]).size()` → `22`
2. Виклик `new N('root', [new N('a', [new N('a1')]), new N('b')]).print()` → `['root', '  a', '    a1', '  b']`
3. Виклик `new N('r', [new N('a', [new N('x'), new N('y')]), new N('b')]).leaves()` → `3`
4. Виклик `(() => { const t = new N('r', [new N('a', [new N('x')]), new N('b')]); return [t.find('x')?.n, t.find('zzz')]; })()` → `['x', null]`
5. Виклик `new N('r', [new N('a', [new N('x', [new N('y')])]), new N('b')]).depth()` → `4`
6. Виклик `new Menu([new Item(5), new Menu([new Item(3), new Item(4)]), new Item(1)]).price()` → `13`
7. Виклик `(() => { const a = new N('a'), b = new N('b'); const r = new N('r').add(a).add(b); r.remove(a); return r.c.map(x => x.n); })()` → `['b']`
8. Виклик `[...new N('r', [new N('a', [new N('a1')]), new N('b')])]` → `['r', 'a', 'a1', 'b']`
9. Виклик `new N('r', [new N('a', [new N('a1')]), new N('b', [new N('b1')])]).bfs()` → `['r', 'a', 'b', 'a1', 'b1']`
10. Виклик `(() => { const log = []; new Macro([new Cmd('a'), new Macro([new Cmd('b'), new Cmd('c')]), new Cmd('d')]).run(log); return log; })()` → `['a', 'b', 'c', 'd']`
11. Виклик `JSON.stringify(tree([{ id: 1 }, { id: 2, parent: 1 }, { id: 3, parent: 1 }, { id: 4, parent: 2 }]))` → `'[{"id":1,"children":[{"id":2,"parent":1,"children":[{"id":4,"parent":2,"children":[]}]},{"id":3,"parent":1,"children":[]}]}]'`
12. Дає змогу однаково працювати з окремим об'єктом і з групою (деревом) об'єктів через спільний інтерфейс
13. Листок — елемент без нащадків, який виконує роботу сам; композит містить нащадків і делегує їм виклики
14. Залежить від варіанта: «прозорий» — інтерфейс однаковий і в листка кидає виняток; «безпечний» — `add/remove` лише в композита
