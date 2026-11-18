# SOLID: S — Single Responsibility Principle (принцип єдиної відповідальності)

## 0. Формулювання

> Клас повинен мати лише **одну причину для змін**.

«Одна відповідальність» — це не «один метод» і не «одна дія». Ідеться про те, що клас обслуговує **одного «замовника» вимог**: якщо зміну в класі можуть ініціювати різні люди з різних причин (редактор хоче змінити правила публікації, дизайнер — розмітку, DevOps — сховище), ці частини варто розділити.

## 1. Порушення: один клас — дані, збереження і відображення

```ts
class BlogPostGodClass {
  constructor(
    public title: string,
    public content: string,
  ) {}

  update(title: string, content: string): void {
    this.title = title;
    this.content = content;
  }

  saveToDatabase(): string {
    return `INSERT INTO posts VALUES ('${this.title}', '${this.content}')`; // причина змін №2: сховище
  }

  renderHTML(): string {
    return `<h1>${this.title}</h1><p>${this.content}</p>`; // причина змін №3: подання
  }
}

const godPost = new BlogPostGodClass("Hello", "First post");
console.log(godPost.renderHTML()); // <h1>Hello</h1><p>First post</p>
```

Проблеми:

- перехід з SQL на інше сховище змушує редагувати клас поста — і ризикувати зламати рендеринг;
- додати JSON-подання для API — знову той самий клас;
- тестувати рендеринг неможливо без коду, що знає про базу даних.

## 2. Виправлення: кожна причина змін — окремий клас

```ts
class BlogPost {
  constructor(
    private title: string,
    private content: string,
  ) {}

  update(title: string, content: string): void {
    if (title.trim() === "") throw new Error("Title cannot be empty"); // правила самого поста
    this.title = title;
    this.content = content;
  }

  getPost(): { title: string; content: string } {
    return { title: this.title, content: this.content };
  }
}

// відповідальність: подання поста в HTML
class BlogPostHtmlView {
  render(post: BlogPost): string {
    const { title, content } = post.getPost();
    return `<h1>${title}</h1><p>${content}</p>`;
  }
}

// відповідальність: подання поста для API
class BlogPostJsonView {
  render(post: BlogPost): string {
    return JSON.stringify(post.getPost());
  }
}

// відповідальність: збереження (тут — пам'ять замість справжньої БД)
class BlogPostRepository {
  private storage: Array<{ title: string; content: string }> = [];
  save(post: BlogPost): number {
    this.storage.push(post.getPost());
    return this.storage.length;
  }
}

const post = new BlogPost("Hello", "First post");
post.update("Hello, SOLID", "Updated post");

console.log(new BlogPostHtmlView().render(post)); // <h1>Hello, SOLID</h1><p>Updated post</p>
console.log(new BlogPostJsonView().render(post)); // {"title":"Hello, SOLID","content":"Updated post"}
console.log(new BlogPostRepository().save(post)); // 1
```

Тепер нове подання (RSS, Markdown) — це **новий** клас, а `BlogPost`, репозиторій і наявні подання не змінюються.

> [!note] Зміни відносно попередньої версії
> Раніше `BlogPost` мав метод `createPost()`, що друкував пост у консоль, — тобто сам клас даних усе ще займався поданням. А `BlogPostDisplay` тримав пост у полі з назвою `posts` (множина) і двічі викликав `getPost()`. Тут подання повністю винесено в окремі класи.

## 3. Як не перестаратися

SRP не означає «по одному методу на клас». Ознаки, що розділяти **варто**:

- у класі є методи, які використовують різні, не пов'язані між собою поля;
- зміни в класі регулярно приходять з різних причин;
- важко дати класу назву без «And»/«Manager»/«Utils».

Якщо дві речі змінюються **завжди разом** — розділення лише додасть непотрібних файлів.

## Підсумок

- SRP: клас має одну причину для змін — обслуговує одного «замовника» вимог.
- Типове порушення — клас, що одночасно тримає дані, зберігає їх і відображає.
- Розділення за причинами змін дає змогу додавати нове подання чи сховище, не чіпаючи решти, і тестувати частини окремо.
- Критерій — причини змін, а не кількість методів; те, що завжди змінюється разом, розділяти не треба.
- Пов'язані принципи: [open-closed.md](open-closed.md), [interface-segregation.md](interface-segregation.md); інкапсуляція правил усередині класу — [encapsulation.md](../OOP/encapsulation.md).

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Сформулюйте принцип єдиної відповідальності.

**2.** Чому клас, що одночасно рахує знижку, зберігає в БД і шле лист, порушує SRP?

**3.** Який простий тест на порушення SRP?

**4.** Розділіть: яка функція чиста, а яка має побічний ефект?

```js
(() => { const calc = (a, b) => a + b; let log = []; const save = (x) => { log.push(x); }; return [calc(1, 2), (save(3), log)]; })()
```

### Рівень 2. Деталі й поведінка

**5.** Розділіть клас на розрахунок і форматування: `total(items)` та `formatTotal(n)`.

```js
const total = (i) => i.reduce((s, x) => s + x.price * x.qty, 0); const formatTotal = (n) => n.toFixed(2) + ' UAH'
```

**6.** Відокремте валідацію від збереження: `validate(user)` та `save(repo, user)`.

```js
const validate = (u) => { const e = []; if (!u.name) e.push('name'); if (!/^\S+@\S+$/.test(u.email)) e.push('email'); return e; }; const save = (repo, u) => (repo.push(u), repo.length)
```

**7.** Складіть `OrderService`, що отримує залежності й лише оркеструє.

```js
class OrderService { constructor(pricer, store, mailer) { this.p = pricer; this.s = store; this.m = mailer; } place(o) { const t = this.p(o); this.s(o, t); return this.m(o, t); } }
```

**8.** Винесіть форматування звіту окремо від збору даних: `collect(rows)` та `render(stats)`.

```js
const collect = (r) => ({ count: r.length, sum: r.reduce((a, x) => a + x, 0) }); const render = (s) => `n=${s.count} sum=${s.sum}`
```

### Рівень 3. Нюанси та пастки

**9.** Відокремте логіку HTTP-відповіді від бізнес-логіки: `compute(x)` і `toResponse(result)`.

```js
const compute = (x) => x * 2; const toResponse = (r) => ({ status: 200, body: { result: r } })
```

**10.** Чим небезпечне надмірне дроблення за SRP?

**11.** Чи означає SRP, що клас має мати один метод?

**12.** Як SRP пов'язаний із тестуванням?

### Рівень 4. Практика

**13.** Що таке «actor» у визначенні SRP?

**14.** Рознесіть `User` на дані та `UserRepository` (in-memory).

```js
class User { constructor(id, name) { this.id = id; this.name = name; } } class UserRepo { #m = new Map(); add(u) { this.#m.set(u.id, u); return this; } get(id) { return this.#m.get(id); } get size() { return this.#m.size; } }
```

**15.** Відокремте логування від логіки: декоратор `withLog(fn, sink)`.

```js
const withLog = (fn, sink) => (...a) => { const r = fn(...a); sink.push(`${fn.name}(${a}) = ${r}`); return r; }
```

### Відповіді

1. У класу (модуля, функції) має бути лише одна причина для зміни: він відповідає за одну роль перед одним «актором»
2. У нього три причини для змін: бізнес-правила, схема сховища та формат повідомлень; зміна однієї частини ризикує зламати інші
3. Спробувати описати клас одним реченням без «і»/«та»; якщо не виходить — відповідальностей більше однієї
4. `[3, [3]]`
5. Виклик `formatTotal(total([{ price: 10, qty: 2 }, { price: 5.5, qty: 1 }]))` → `'25.50 UAH'`
6. Виклик `(() => { const repo = []; const u = { name: 'A', email: 'a@b.c' }; return [validate({}), validate(u), validate(u).length === 0 && save(repo, u)]; })()` → `[['name', 'email'], [], 1]`
7. Виклик `(() => { const calls = []; const svc = new OrderService(o => o.qty * 10, (o, t) => calls.push(['save', t]), (o, t) => (calls.push(['mail', t]), 'ok')); return [svc.place({ qty: 3 }), calls]; })()` → `['ok', [['save', 30], ['mail', 30]]]`
8. Виклик `render(collect([1, 2, 3]))` → `'n=3 sum=6'`
9. Виклик `toResponse(compute(21))` → `{ status: 200, body: { result: 42 } }`
10. З'являється безліч крихітних класів без зв'язності, складно орієнтуватись у коді; відповідальність слід ділити за причинами змін, а не за кількістю методів
11. Ні: методів може бути багато, якщо всі вони служать одній відповідальності та змінюються з однієї причини
12. Невеликі класи з однією роллю легше тестувати ізольовано, без складного налаштування зовнішніх залежностей
13. Група людей або система, яка вимагає змін (бухгалтерія, адміністратор, API-клієнт); модуль має обслуговувати одного актора
14. Виклик `(() => { const r = new UserRepo().add(new User(1, 'a')).add(new User(2, 'b')); return [r.get(2).name, r.size]; })()` → `['b', 2]`
15. Виклик `(() => { const sink = []; function add(a, b) { return a + b; } withLog(add, sink)(2, 3); return sink; })()` → `['add(2,3) = 5']`
