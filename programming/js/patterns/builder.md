# Builder — патерн «покрокова побудова складного об'єкта»

## 1. Що таке Builder

Builder — породжуючий патерн, який відокремлює побудову складного об'єкта від його представлення. Замість одного конструктора з десятком параметрів об'єкт збирається покроково читабельними викликами, а фінальний метод `build()` повертає готовий результат.

Коли це корисно:

- багато параметрів, більшість з яких необов'язкові;
- потрібно валідувати всю комбінацію полів перед створенням;
- той самий процес збирання має давати різні представлення (HTML-запит, SQL-запит, тестові дані);
- об'єкт після створення має бути незмінним (immutable), а збирається він поетапно.

Порівняння з сусідніми патернами (детально — [factory.md](factory.md)): Factory — «який тип створити?» (один виклик, готовий об'єкт); Builder — «як зібрати складний об'єкт?» (багато кроків).

## 2. Проблема: «telescoping constructor» та позиційні аргументи

```js
// ❌ Що таке `true, false, null, 3000`? Без відкритого класу — незрозуміло.
class HttpRequestBad {
  constructor(url, method, headers, body, timeout, retries, cache, json) {
    this.url = url;
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.timeout = timeout;
    this.retries = retries;
    this.cache = cache;
    this.json = json;
  }
}

const bad = new HttpRequestBad("/api/users", "POST", null, null, 3000, 0, false, true);
console.log(bad.timeout); // 3000 — але з виклику це не видно; легко переплутати порядок
```

Друга спроба — options-об'єкт — краще, але: валідація «все або нічого» залишається на конструкторі; складні залежності між полями (`body` не можна з `GET`) не виражені; немає покрокової логіки (додати заголовок за умовою).

## 3. Класичний Builder: ланцюжок викликів (fluent interface)

```js
class HttpRequest {
  // конструктор приймає готові, перевірені дані від білдера
  constructor({ url, method, headers, body, timeout, retries }) {
    this.url = url;
    this.method = method;
    this.headers = Object.freeze({ ...headers });
    this.body = body;
    this.timeout = timeout;
    this.retries = retries;
    Object.freeze(this); // після build() запит незмінний
  }

  describe() {
    const bodyPart = this.body === undefined ? "no body" : `body: ${JSON.stringify(this.body)}`;
    return `${this.method} ${this.url} (timeout ${this.timeout}ms, retries ${this.retries}, ${bodyPart})`;
  }
}

class HttpRequestBuilder {
  #url;
  #method = "GET"; // значення за замовчуванням живуть у білдері
  #headers = {};
  #body;
  #timeout = 5000;
  #retries = 0;

  constructor(url) {
    this.#url = url;
  }

  // кожен "сеттер" повертає this — це і дає ланцюжок .a().b().c()
  method(method) {
    this.#method = method.toUpperCase();
    return this;
  }

  header(name, value) {
    this.#headers[name] = value;
    return this;
  }

  json(data) {
    this.#body = data;
    this.#headers["Content-Type"] = "application/json";
    return this;
  }

  timeout(ms) {
    this.#timeout = ms;
    return this;
  }

  retries(count) {
    this.#retries = count;
    return this;
  }

  build() {
    // уся валідація — в одному місці, перед створенням об'єкта
    if (!this.#url) throw new Error("url is required");
    if (this.#body !== undefined && this.#method === "GET") {
      throw new Error("a GET request cannot have a body");
    }
    if (this.#retries < 0) throw new Error("retries cannot be negative");

    return new HttpRequest({
      url: this.#url,
      method: this.#method,
      headers: this.#headers,
      body: this.#body,
      timeout: this.#timeout,
      retries: this.#retries,
    });
  }
}

const request = new HttpRequestBuilder("/api/users")
  .method("post")
  .json({ name: "Olya" })
  .header("Authorization", "Bearer token")
  .timeout(3000)
  .retries(2)
  .build();

console.log(request.describe());
// POST /api/users (timeout 3000ms, retries 2, body: {"name":"Olya"})
console.log(request.headers);
// { 'Content-Type': 'application/json', Authorization: 'Bearer token' }

// порівняйте з розділом 2: кожен параметр названий, порядок неважливий,
// непотрібні пропущені взагалі:
console.log(new HttpRequestBuilder("/api/health").build().describe());
// GET /api/health (timeout 5000ms, retries 0, no body)
```

## 4. Валідація в build() та незмінність результату

```js
try {
  new HttpRequestBuilder("/api/users").json({ a: 1 }).build(); // GET + тіло
} catch (err) {
  console.log("Error:", err.message); // a GET request cannot have a body
}

// результат заморожений: випадково змінити готовий запит неможливо
request.timeout = 1;
console.log(request.timeout); // 3000 — у sloppy-режимі присвоєння мовчки ігнорується
// (у strict mode це кинуло б TypeError)
console.log(Object.isFrozen(request)); // true
// (Object.freeze детально — common/data-structures/Object/Object.md;
// він поверхневий: headers ми заморозили окремо)
```

## 5. Підводний камінь: білдер мутує себе — його не можна перевикористовувати

```js
const base = new HttpRequestBuilder("/api/items").header("X-App", "demo");
const r1 = base.method("post").json({ id: 1 }).build();
const r2 = base.method("put").build(); // ❌ тіло від r1 "просочилось"
console.log(r2.describe());
// PUT /api/items (timeout 5000ms, retries 0, body: {"id":1})
```

Варіанти виправлення:

а) один білдер — одна збірка (створювати новий для кожного об'єкта);
б) `reset()` у кінці `build()`;
в) імутабельний білдер: кожен метод повертає новий білдер (розділ 6).

## 6. Імутабельний білдер (кожен крок — новий об'єкт)

```js
class QueryBuilder {
  #state;

  constructor(state = { table: "", fields: ["*"], where: [], limit: null }) {
    this.#state = state;
  }

  // повертаємо новий білдер — попередній лишається без змін
  #with(patch) {
    return new QueryBuilder({ ...this.#state, ...patch });
  }

  from(table) {
    return this.#with({ table });
  }

  select(...fields) {
    return this.#with({ fields });
  }

  where(condition) {
    return this.#with({ where: [...this.#state.where, condition] });
  }

  limit(n) {
    return this.#with({ limit: n });
  }

  build() {
    const { table, fields, where, limit } = this.#state;
    if (!table) throw new Error("table is not specified");
    let sql = `SELECT ${fields.join(", ")} FROM ${table}`;
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    if (limit !== null) sql += ` LIMIT ${limit}`;
    return sql;
  }
}

const users = new QueryBuilder().from("users");
const adults = users.where("age >= 18");
const topAdults = adults.select("id", "name").limit(10);

console.log(users.build()); // SELECT * FROM users
console.log(adults.build()); // SELECT * FROM users WHERE age >= 18
console.log(topAdults.build()); // SELECT id, name FROM users WHERE age >= 18 LIMIT 10
// `users` і `adults` не постраждали — на відміну від розділу 5.
// Ціна: нові об'єкти на кожен крок (зазвичай неважливо для білдерів).
```

⚠️ У реальних проєктах SQL-значення не підставляють рядками — тільки параметризовані запити (захист від SQL-ін'єкцій). Тут — лише ілюстрація.

## 7. Director — готові рецепти збирання

У класичному описі GoF (Gang of Four) Director знає послідовність кроків, а Builder — як виконати кожен. У JS це часто просто функції-рецепти:

```js
const jsonPost = (builder, data) => builder.method("POST").json(data).timeout(3000);
const withRetries = (builder) => builder.retries(3);

const recipeRequest = withRetries(jsonPost(new HttpRequestBuilder("/api/orders"), { sku: 42 })).build();
console.log(recipeRequest.describe());
// POST /api/orders (timeout 3000ms, retries 3, body: {"sku":42})
```

## 8. Різні представлення з одного процесу (класичний сенс Builder)

Один і той самий набір кроків — різні виходи. Director не знає, який саме білдер йому передали:

```js
class HtmlReportBuilder {
  #parts = [];
  title(text) {
    this.#parts.push(`<h1>${text}</h1>`);
    return this;
  }
  line(text) {
    this.#parts.push(`<p>${text}</p>`);
    return this;
  }
  build() {
    return this.#parts.join("");
  }
}

class TextReportBuilder {
  #parts = [];
  title(text) {
    this.#parts.push(text.toUpperCase(), "=".repeat(text.length));
    return this;
  }
  line(text) {
    this.#parts.push(text);
    return this;
  }
  build() {
    return this.#parts.join("\n");
  }
}

function buildSalesReport(builder) {
  return builder.title("Sales").line("January: 100").line("February: 150").build();
}

console.log(buildSalesReport(new HtmlReportBuilder()));
// <h1>Sales</h1><p>January: 100</p><p>February: 150</p>
console.log(buildSalesReport(new TextReportBuilder()));
// SALES
// =====
// January: 100
// February: 150
```

## 9. Builder у реальному світі та альтернативи в JS

Де зустрічається:

- query builders: Knex, TypeORM QueryBuilder, Prisma-подібні API;
- NestJS: `DocumentBuilder` для Swagger (`new DocumentBuilder().setTitle(...).setVersion(...).build()`);
- `URL`/`URLSearchParams`, Array-методи з ланцюжками (схожий стиль);
- тестові дані (test data builders) — `userBuilder().admin().build()`.

Альтернативи, які часто достатні в JS:

- options-об'єкт з деструктуризацією і значеннями за замовчуванням: `function request({ url, method = "GET", timeout = 5000 } = {})` — для 3–6 необов'язкових параметрів це простіше, ніж білдер;
- `Object.assign`/spread для «клонуй і підправ» ([prototype.md](prototype.md));
- фабрична функція з валідацією ([factory.md](factory.md)).

Білдер виправданий, коли є: покрокова логіка, складна валідація комбінацій, багато представлень або потреба в незмінному результаті. Для 3 полів це over-engineering — не створюй білдер «про запас».

## Підсумок

- Builder збирає складний об'єкт покроково, а `build()` повертає готовий результат — на відміну від Factory («який тип?») він відповідає на «як зібрати?».
- Вирішує проблему telescoping constructor: іменовані кроки замість довгих позиційних списків аргументів.
- Fluent interface: кожен метод повертає `this`, тому працює ланцюжок `.a().b().c().build()`.
- Уся валідація — у `build()`: об'єкт не створюється у неконсистентному стані; результат зручно робити незмінним через `Object.freeze`.
- Пастка: мутабельний білдер зберігає стан між збірками — повторне використання «просочує» поля; рішення: новий білдер на кожну збірку, `reset()` або імутабельний білдер (кожен крок — новий об'єкт).
- Director — готові рецепти послідовності кроків; один процес може давати різні представлення (HTML/текст) через різні білдери.
- У JS для простих випадків вистачає options-об'єкта з деструктуризацією; білдер — для складної валідації, багатьох кроків і представлень (Knex, TypeORM QueryBuilder, Nest DocumentBuilder).

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Реалізуйте `QueryBuilder` із ланцюжком `select/from/where/limit` і методом `build()`.

```js
class QB { #s = '*'; #f = ''; #w = []; #l = null; select(...c) { this.#s = c.join(', '); return this; } from(t) { this.#f = t; return this; } where(c) { this.#w.push(c); return this; } limit(n) { this.#l = n; return this; } build() { let q = `SELECT ${this.#s} FROM ${this.#f}`; if (this.#w.length) q += ' WHERE ' + this.#w.join(' AND '); if (this.#l !== null) q += ` LIMIT ${this.#l}`; return q; } }
```

**2.** Додайте перевірку: `build()` без `from` кидає помилку.

```js
class QB { #f = null; from(t) { this.#f = t; return this; } build() { if (!this.#f) throw new Error('table required'); return 'SELECT * FROM ' + this.#f; } }
```

**3.** Напишіть незмінний builder: кожен метод повертає новий екземпляр.

```js
class Req { constructor(o = {}) { this.o = Object.freeze(o); } url(u) { return new Req({ ...this.o, url: u }); } header(k, v) { return new Req({ ...this.o, headers: { ...this.o.headers, [k]: v } }); } build() { return this.o; } }
```

**4.** Створіть builder об'єкта-конфігурації з `Object.assign` і значеннями за замовчуванням.

```js
const build = (o = {}) => Object.freeze({ port: 80, host: 'localhost', tls: false, ...o })
```

### Рівень 2. Деталі й поведінка

**5.** Створіть builder з вкладеним «director»: `Director.makeAdmin(builder)`.

```js
class UB { u = { roles: [] }; name(n) { this.u.name = n; return this; } role(r) { this.u.roles.push(r); return this; } build() { return this.u; } } const Director = { admin: (b) => b.name('root').role('admin').role('user').build() }
```

**6.** Реалізуйте `HtmlBuilder` для вкладених тегів.

```js
class H { constructor(t) { this.t = t; this.c = []; } add(x) { this.c.push(x); return this; } toString() { return `<${this.t}>${this.c.join('')}</${this.t}>`; } }
```

**7.** Додайте `reset()` і повторне використання builder.

```js
class B { #a = []; add(x) { this.#a.push(x); return this; } build() { const r = [...this.#a]; this.#a = []; return r; } }
```

**8.** Реалізуйте builder, що валідує тип аргументу в методі.

```js
class B { #n = 0; count(n) { if (!Number.isInteger(n) || n < 0) throw new RangeError('bad count'); this.#n = n; return this; } build() { return this.#n; } }
```

### Рівень 3. Нюанси та пастки

**9.** Побудуйте URL через builder: `host`, `path`, `query`.

```js
class UB { #h = ''; #p = '/'; #q = new URLSearchParams(); host(h) { this.#h = h; return this; } path(p) { this.#p = p; return this; } query(k, v) { this.#q.append(k, v); return this; } build() { const s = this.#q.toString(); return `https://${this.#h}${this.#p}${s ? '?' + s : ''}`; } }
```

**10.** Побудуйте SQL INSERT через builder із екрануванням лапок.

```js
class Ins { #t; #v = {}; into(t) { this.#t = t; return this; } set(k, v) { this.#v[k] = v; return this; } build() { const ks = Object.keys(this.#v); const vs = ks.map(k => typeof this.#v[k] === 'string' ? `'${this.#v[k].replace(/'/g, "''")}'` : this.#v[k]); return `INSERT INTO ${this.#t} (${ks.join(', ')}) VALUES (${vs.join(', ')})`; } }
```

**11.** Яку проблему вирішує Builder?

**12.** Чим Builder відрізняється від Factory?

### Рівень 4. Практика

**13.** Коли Builder зайвий у JavaScript?

**14.** Для чого метод `build()` у builder?

### Відповіді

1. Виклик `[new QB().select('id', 'name').from('users').where('age > 18').where('active = 1').limit(10).build(), new QB().from('t').build()]` → `['SELECT id, name FROM users WHERE age > 18 AND active = 1 LIMIT 10', 'SELECT * FROM t']`
2. Виклик `(() => { let e; try { new QB().build(); } catch (x) { e = x.message; } return [new QB().from('a').build(), e]; })()` → `['SELECT * FROM a', 'table required']`
3. Виклик `(() => { const base = new Req().url('/a'); const a = base.header('X', '1'); const b = base.header('Y', '2'); return [base.build(), a.build(), b.build()]; })()` → `[{ url: '/a' }, { url: '/a', headers: { X: '1' } }, { url: '/a', headers: { Y: '2' } }]`
4. Виклик `[build(), build({ port: 443, tls: true })]` → `[{ port: 80, host: 'localhost', tls: false }, { port: 443, host: 'localhost', tls: true }]`
5. Виклик `Director.admin(new UB())` → `{ roles: ['admin', 'user'], name: 'root' }`
6. Виклик `String(new H('ul').add(new H('li').add('a')).add(new H('li').add('b')))` → `'<ul><li>a</li><li>b</li></ul>'`
7. Виклик `(() => { const b = new B().add(1).add(2); return [b.build(), b.add(3).build(), b.build()]; })()` → `[[1, 2], [3], []]`
8. Виклик `(() => { let e; try { new B().count(-1); } catch (x) { e = x.name; } return [new B().count(5).build(), e]; })()` → `[5, 'RangeError']`
9. Виклик `new UB().host('a.com').path('/s').query('q', 'x y').query('p', 2).build()` → `'https://a.com/s?q=x+y&p=2'`
10. Виклик `new Ins().into('u').set('name', "O'Neil").set('age', 30).build()` → `'INSERT INTO u (name, age) VALUES ('O''Neil', 30)'`
11. Покрокове створення складного об'єкта з багатьма необов'язковими параметрами, замість конструктора з довгим списком аргументів і `undefined`
12. Factory створює об'єкт одним викликом залежно від типу; Builder збирає один складний об'єкт поступово, дозволяючи керувати кроками
13. Коли достатньо об'єкта-опцій із значеннями за замовчуванням (`{ ...defaults, ...opts }`); builder корисний за валідації між кроками та незмінності
14. Фіксує результат: перевіряє повноту даних і повертає готовий (часто незмінний) об'єкт
