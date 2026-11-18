# Prototype — патерн «клонування замість створення»

## 1. Що таке Prototype

Prototype — породжуючий патерн, за яким новий об'єкт створюється не через конструктор «з нуля», а шляхом копіювання (клонування) вже наявного об'єкта — «прототипу». Замість «збери об'єкт з параметрів» ти кажеш «зроби такий самий, як цей, і підправ потрібне».

Коли це корисно: створення об'єкта дороге (важкі обчислення, запити до БД, розбір великого конфігу) — клонувати готовий дешевше, ніж збирати заново; об'єкт має багато налаштувань, а потрібні варіанти відрізняються лише кількома полями (шаблони: «типовий користувач», «типовий документ»); потрібно відокремити код від конкретних класів: клієнт лише викликає `clone()` і не знає, який клас під капотом.

## 2. Не плутай: патерн Prototype ≠ prototype chain у JavaScript

У JS слово «prototype» означає дві різні речі: 1) прототипне наслідування — механізм мови, коли об'єкт делегує пошук властивостей іншому об'єкту (детально — `common/prototypal-inheritance.md`); 2) патерн Prototype — клонування: результат є незалежною копією.

Ключова різниця: `Object.create(proto)` → новий об'єкт делегує до `proto`: зміна `proto` одразу видна в «нащадку» (живий зв'язок); клон (копія) → повністю окремий об'єкт: зміна оригіналу його не зачіпає.

```js
const template = { theme: "dark", fontSize: 14 };

const delegating = Object.create(template);
template.fontSize = 20;
console.log(delegating.fontSize); // 20 — бачить зміну (делегування, не клон)
console.log(Object.hasOwn(delegating, "fontSize")); // false — власних полів нема

const copied = { ...template };
template.fontSize = 99;
console.log(copied.fontSize); // 20 — копія зафіксувала значення на момент клонування
console.log(Object.hasOwn(copied, "fontSize")); // true — це власне поле
```

## 3. Чотири способи клонувати в JS — і чому вони не однакові

```js
const original = {
  name: "Template",
  tags: ["a", "b"],
  meta: { version: 1 },
  createdAt: new Date("2026-01-01T00:00:00Z"),
  greet() {
    return `Hello from ${this.name}`;
  },
};

// 3.1. Shallow copy: spread / Object.assign
// копіюється один рівень; вкладені об'єкти й масиви — посиланнями
const shallow = { ...original };
shallow.meta.version = 2; // змінили вкладений об'єкт клона...
console.log(original.meta.version); // 2 — ...і змінився оригінал (спільне посилання)
original.meta.version = 1; // повертаємо для наступних прикладів

// 3.2. JSON.parse(JSON.stringify(...)) — "глибока" копія з втратами
const viaJson = JSON.parse(JSON.stringify(original));
console.log(typeof viaJson.greet); // "undefined" — функції зникли
console.log(typeof viaJson.createdAt); // "string" — Date став рядком
// також губляться undefined-поля, Map/Set, символи; кругові посилання
// призводять до помилки

// 3.3. structuredClone() — сучасна глибока копія (Node 17+, браузери)
const { greet, ...cloneable } = original; // функцію прибираємо: її структурне клонування не вміє
const deep = structuredClone(cloneable);
deep.meta.version = 5;
console.log(original.meta.version); // 1 — оригінал не зачеплено
console.log(deep.createdAt instanceof Date); // true — Date збережено
// обмеження: кидає помилку на функціях, а екземпляр класу стає
// звичайним об'єктом — прототип (методи) губиться (розділ 5)

try {
  structuredClone(original); // містить метод greet
} catch (err) {
  console.log("structuredClone on a function:", err.name); // DataCloneError
}

// 3.4. Власний метод clone() — повний контроль (розділ 4)
```

## 4. Класична реалізація: клас із методом clone()

```js
class Document {
  constructor(title, author, sections = [], settings = { font: "serif", margin: 2 }) {
    this.title = title;
    this.author = author;
    this.sections = sections;
    this.settings = settings;
  }

  clone() {
    // кожен вкладений об'єкт копіюємо явно — так клон не ділить з
    // оригіналом жодного змінного стану
    return new Document(
      this.title,
      this.author,
      this.sections.map((s) => ({ ...s })),
      { ...this.settings },
    );
  }

  describe() {
    return `${this.title} (${this.author}), sections: ${this.sections.length}, font: ${this.settings.font}`;
  }
}

const contract = new Document("Contract", "Legal dept.", [{ heading: "Subject" }, { heading: "Price" }]);
const contractForClientA = contract.clone();
contractForClientA.title = "Contract — Client A";
contractForClientA.settings.font = "sans";
contractForClientA.sections.push({ heading: "Additional terms" });

console.log(contract.describe()); // оригінал не змінився
console.log(contractForClientA.describe()); // клон має власні зміни
console.log(contractForClientA instanceof Document); // true — методи збережено
console.log(contractForClientA === contract); // false
```

## 5. Пастка: structuredClone губить прототип (методи)

```js
const brokenClone = structuredClone(contract);
console.log(brokenClone instanceof Document); // false
console.log(typeof brokenClone.describe); // "undefined" — методів немає
console.log(brokenClone.title); // "Contract" — дані на місці

// виправлення, якщо хочеться і глибокої копії, і методів: клонуємо
// дані, а прототип відновлюємо вручну
const restored = Object.setPrototypeOf(structuredClone(contract), Document.prototype);
console.log(restored.describe()); // працює
```

`Object.setPrototypeOf` повільний і не рекомендований для гарячого коду (детально `common/data-structures/Object/Object.md`) — надійніше писати явний `clone()` (розділ 4).

## 6. Реєстр прототипів (Prototype registry)

Часте доповнення до патерна: зберігати готові «зразки» під іменами і видавати їхні клони — клієнт не знає, як зразок будується.

```js
class PrototypeRegistry {
  #prototypes = new Map();

  register(name, prototype) {
    this.#prototypes.set(name, prototype);
  }

  create(name, overrides = {}) {
    const prototype = this.#prototypes.get(name);
    if (!prototype) throw new Error(`Unknown template: ${name}`);
    const copy = prototype.clone();
    return Object.assign(copy, overrides); // "клонуй і підправ потрібне"
  }
}

const registry = new PrototypeRegistry();
registry.register("invoice", new Document("Invoice", "Accounting", [{ heading: "Line items" }]));
registry.register("report", new Document("Report", "Analytics", [{ heading: "Findings" }]));

const invoice1 = registry.create("invoice", { title: "Invoice #1" });
const invoice2 = registry.create("invoice", { title: "Invoice #2" });
invoice1.sections.push({ heading: "Discount" });

console.log(invoice1.describe()); // sections: 2
console.log(invoice2.describe()); // sections: 1 — зміна invoice1 не вплинула
console.log(registry.create("report").describe());
```

## 7. Клонування складних даних: Map, Set, кругові посилання

`structuredClone` підтримує `Map`, `Set`, `Date`, `RegExp`, типізовані масиви і навіть кругові посилання — те, на чому JSON падає:

```js
const tree = { name: "root", children: new Map([["a", { size: 1 }]]) };
tree.self = tree; // кругове посилання

const treeClone = structuredClone(tree);
console.log(treeClone.self === treeClone); // true — циклічну структуру збережено
console.log(treeClone.children instanceof Map); // true

try {
  JSON.stringify(tree);
} catch (err) {
  console.log("JSON.stringify on a cycle:", err.name); // TypeError
}
```

## 8. Продуктивність та доречність

- Глибоке клонування само по собі не безкоштовне: структуру потрібно обійти повністю. Воно вигідне лише коли побудова об'єкта заново дорожча за копіювання (розбір файлів, запити, важкі обчислення).
- Для незмінних (immutable) даних клон часто взагалі не потрібен: якщо ніхто не мутує об'єкт, його можна безпечно ділити за посиланням.
- У UI/стані застосунку (React тощо) замість глибокого клону зазвичай створюють нову версію лише зміненої гілки (structural sharing) — дешевше й зберігає ідентичність незмінених частин.

## Підсумок

- Prototype створює новий об'єкт клонуванням наявного, а не конструюванням з нуля — корисно, коли створення дороге або потрібні варіації «шаблону».
- Не плутати з prototype chain: `Object.create(proto)` дає живе делегування (зміни `proto` видно в нащадку), клон — незалежну копію (зміни оригіналу не видно).
- `spread`/`Object.assign` — shallow: вкладені об'єкти лишаються спільними, зміна клона псує оригінал.
- `JSON.parse(JSON.stringify())` — глибока, але з втратами: зникають функції, `undefined`, символи; `Date` стає рядком; `Map`/`Set` ламаються; кругові посилання дають помилку.
- `structuredClone` — сучасна глибока копія (`Date`, `Map`, `Set`, цикли), але кидає `DataCloneError` на функціях і губить прототип: екземпляр класу стає звичайним об'єктом без методів.
- Найнадійніший варіант для власних класів — явний метод `clone()`, який копіює кожен змінний вкладений об'єкт і зберігає клас.
- Реєстр прототипів дає іменовані «зразки»: `create(name, overrides)` = клонуй і підправ потрібне.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `Object.create(proto)` та хто є прототипом?

```js
(() => { const proto = { hi() { return 'hi'; } }; const o = Object.create(proto); return [o.hi(), Object.getPrototypeOf(o) === proto, Object.keys(o)]; })()
```

**2.** Реалізуйте `clone()` через прототип (поверхнева копія).

```js
class Doc { constructor(t, tags) { this.t = t; this.tags = tags; } clone() { return Object.assign(Object.create(Object.getPrototypeOf(this)), this); } }
```

**3.** Додайте глибоке клонування через `structuredClone`.

```js
class Doc { constructor(t, tags) { this.t = t; this.tags = tags; } clone() { const c = Object.create(Object.getPrototypeOf(this)); return Object.assign(c, structuredClone({ ...this })); } }
```

### Рівень 2. Деталі й поведінка

**4.** Чи копіює `structuredClone` методи та прототип?

```js
(() => { class A { x = 1; m() {} } const c = structuredClone(new A()); return [c instanceof A, typeof c.m, c.x]; })()
```

**5.** Чим відрізняється spread від `Object.assign` при клонуванні геттерів?

```js
(() => { const o = { get v() { return 1; } }; const a = { ...o }; const b = Object.assign({}, o); return [Object.getOwnPropertyDescriptor(a, 'v').get === undefined, Object.getOwnPropertyDescriptor(b, 'v').get === undefined]; })()
```

**6.** Чи клонує `JSON.parse(JSON.stringify)` дату, `undefined`, `Map`?

```js
(() => { const o = { d: new Date(0), u: undefined, m: new Map([[1, 2]]), n: NaN }; return JSON.parse(JSON.stringify(o)); })()
```

### Рівень 3. Нюанси та пастки

**7.** Реєстр прототипів: клонування за ім'ям.

```js
const registry = new Map(); const reg = (n, p) => registry.set(n, p); const spawn = (n, over = {}) => ({ ...structuredClone(registry.get(n)), ...over })
```

**8.** Прототипне наслідування функцій: перевизначення методу в клоні.

```js
const base = { speak() { return 'generic'; } }; const dog = Object.create(base, { speak: { value() { return 'woof'; } } })
```

**9.** Що поверне `Object.getPrototypeOf` ланцюжка після `Object.setPrototypeOf`?

```js
(() => { const a = { n: 'a' }; const b = { m: 'b' }; Object.setPrototypeOf(b, a); return [b.n, Object.getPrototypeOf(b) === a]; })()
```

### Рівень 4. Практика

**10.** Глибока копія з урахуванням циклів (WeakMap).

```js
const deep = (o, seen = new WeakMap()) => { if (o === null || typeof o !== 'object') return o; if (seen.has(o)) return seen.get(o); const c = Array.isArray(o) ? [] : {}; seen.set(o, c); for (const k of Object.keys(o)) c[k] = deep(o[k], seen); return c; }
```

**11.** Яку проблему вирішує Prototype?

**12.** Чим глибока копія відрізняється від поверхневої?

### Відповіді

1. `['hi', true, []]`
2. Виклик `(() => { const a = new Doc('x', ['a']); const b = a.clone(); b.t = 'y'; b.tags.push('b'); return [a.t, b.t, a.tags, b instanceof Doc]; })()` → `['x', 'y', ['a', 'b'], true]`
3. Виклик `(() => { const a = new Doc('x', ['a']); const b = a.clone(); b.tags.push('b'); return [a.tags, b.tags, b instanceof Doc]; })()` → `[['a'], ['a', 'b'], true]`
4. `[false, 'undefined', 1]`
5. `[true, true]`
6. `{ d: '1970-01-01T00:00:00.000Z', m: {}, n: null }`
7. Виклик `(() => { reg('orc', { hp: 10, items: ['axe'] }); const a = spawn('orc'); const b = spawn('orc', { hp: 5 }); a.items.push('x'); return [a, b, registry.get('orc')]; })()` → `[{ hp: 10, items: ['axe', 'x'] }, { hp: 5, items: ['axe'] }, { hp: 10, items: ['axe'] }]`
8. Виклик `[base.speak(), dog.speak(), Object.getPrototypeOf(dog).speak()]` → `['generic', 'woof', 'generic']`
9. `['a', true]`
10. Виклик `(() => { const a = { n: 1 }; a.self = a; const c = deep(a); return [c !== a, c.self === c, c.n]; })()` → `[true, true, 1]`
11. Створення нових об'єктів копіюванням існуючого, коли створення «з нуля» дороге або складне
12. Поверхнева копіює лише верхній рівень (вкладені об'єкти спільні), глибока — рекурсивно всі рівні
