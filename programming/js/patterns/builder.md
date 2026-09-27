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
