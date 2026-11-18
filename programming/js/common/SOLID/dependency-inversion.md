# SOLID: D — Dependency Inversion Principle (принцип інверсії залежностей)

## 0. Формулювання

> 1. Модулі верхнього рівня не повинні залежати від модулів нижнього рівня. Обидва мають залежати від **абстракцій**.
> 2. Абстракції не повинні залежати від деталей. Деталі мають залежати від абстракцій.

Модуль «верхнього рівня» — бізнес-логіка (`UserService`: що означає «зберегти користувача»). Модуль «нижнього рівня» — технічна деталь (MySQL, MongoDB, HTTP-клієнт). «Інверсія» в тому, що інтерфейс `Database` визначається **потребами бізнес-логіки**, а конкретні бази під нього підлаштовуються — а не навпаки.

## 1. Порушення: сервіс сам створює конкретну залежність

```ts
class MySQLConnection {
  insert(table: string, row: object): string {
    return `MySQL INSERT INTO ${table}: ${JSON.stringify(row)}`;
  }
}

class UserServiceBad {
  private db = new MySQLConnection(); // жорстко «зашита» конкретна база

  saveUser(user: { name: string }): string {
    return this.db.insert("users", user);
  }
}

console.log(new UserServiceBad().saveUser({ name: "John" })); // MySQL INSERT INTO users: {"name":"John"}
```

Наслідки:

- перехід на іншу базу — переписування `UserServiceBad`;
- у тестах неможливо підмінити базу фейковою — кожен тест лізе в справжню MySQL;
- бізнес-логіка знає про таблиці й API конкретного драйвера.

## 2. Виправлення: залежність від абстракції + передача ззовні

```ts
interface User {
  name: string;
  email: string;
}

// абстракція сформульована мовою бізнес-логіки, а не мовою конкретної бази
interface UserStorage {
  save(user: User): string;
}

class MySQLUserStorage implements UserStorage {
  save(user: User): string {
    return `Saving ${user.name} to MySQL`;
  }
}

class MongoUserStorage implements UserStorage {
  save(user: User): string {
    return `Saving ${user.name} to MongoDB`;
  }
}

class UserService {
  constructor(private readonly storage: UserStorage) {} // залежність передається ззовні

  register(user: User): string {
    if (!user.email.includes("@")) throw new Error("Invalid email"); // бізнес-правило
    return this.storage.save(user);
  }
}

const john: User = { name: "John", email: "john@example.com" };
console.log(new UserService(new MySQLUserStorage()).register(john)); // Saving John to MySQL
console.log(new UserService(new MongoUserStorage()).register(john)); // Saving John to MongoDB
```

`UserService` не змінився, хоча база змінилася. Рішення «яку базу використовувати» перенесено в одне місце — туди, де об'єкти створюються (composition root, зазвичай точка входу застосунку).

> [!note] Зміни відносно попередньої версії
> Тип `any` для даних користувача замінено на `User` — з `any` компілятор не помітив би, що в `save` передали щось зовсім інше. Інтерфейс перейменовано з `Database` на `UserStorage`: абстракцію формулюють потребами бізнес-логіки («зберегти користувача»), а не назвою технології.

## 3. Головний практичний виграш — тестування

Фейкову реалізацію для тестів пишуть за хвилину, без бази й мережі:

```ts
class InMemoryUserStorage implements UserStorage {
  readonly saved: User[] = [];
  save(user: User): string {
    this.saved.push(user);
    return `Saved ${this.saved.length} user(s) in memory`;
  }
}

const fakeStorage = new InMemoryUserStorage();
const service = new UserService(fakeStorage);
console.log(service.register(john)); // Saved 1 user(s) in memory
console.log(fakeStorage.saved[0]?.email); // john@example.com

try {
  service.register({ name: "Bad", email: "no-at-sign" });
} catch (err) {
  console.log((err as Error).message); // Invalid email — бізнес-правило перевірено без справжньої бази
}
```

## 4. DIP, DI і IoC — не одне й те саме

| Термін | Що це |
|---|---|
| **Dependency Inversion Principle** | принцип: залежати від абстракцій, а не від деталей |
| **Dependency Injection** | техніка: передавати залежності ззовні (через конструктор, параметр, сеттер), а не створювати всередині |
| **Inversion of Control** | ширша ідея: не твій код керує створенням і викликом, а фреймворк/контейнер (NestJS, Angular) |

DI — найпоширеніший спосіб виконати DIP; детально, з контейнерами — [dependency-injection.md](../../patterns/dependency-injection.md).

## Підсумок

- DIP: бізнес-логіка і технічні деталі залежать від спільної абстракції, а абстракцію формулюють потреби бізнес-логіки.
- Порушення — `new ConcreteDependency()` усередині сервісу: не підмінити, не протестувати, не змінити без правок сервісу.
- Рішення — інтерфейс (`UserStorage`) плюс передача реалізації ззовні через конструктор (dependency injection).
- Вибір конкретних реалізацій зосереджується в одному місці — composition root.
- Найбільший практичний виграш — тести з фейковими реалізаціями без бази й мережі.
- DIP — принцип, DI — техніка його виконання, IoC — ширша ідея, на якій побудовані DI-контейнери.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Сформулюйте принцип інверсії залежностей.

**2.** Чим DIP відрізняється від DI та IoC?

**3.** Покажіть порушення: сервіс сам створює залежність.

```js
(() => { class Mailer { send(m) { return 'smtp:' + m; } } class Service { constructor() { this.mailer = new Mailer(); } notify(m) { return this.mailer.send(m); } } return new Service().notify('hi'); })()
```

**4.** Виправте через конструктор: `Service` отримує `mailer`.

```js
class Service { constructor(mailer) { this.mailer = mailer; } notify(m) { return this.mailer.send(m); } }
```

### Рівень 2. Деталі й поведінка

**5.** Протестуйте сервіс із заглушкою (fake), записуючи виклики.

```js
class Service { constructor(m) { this.m = m; } notify(x) { return this.m.send(x); } } const mkFake = () => { const calls = []; return { calls, send: (x) => (calls.push(x), 'ok') }; }
```

**6.** Зробіть DI через параметр за замовчуванням: `fetchUser(id, http = defaultHttp)`.

```js
const defaultHttp = { get: (u) => 'real:' + u }; const fetchUser = (id, http = defaultHttp) => http.get('/users/' + id)
```

**7.** Напишіть простий контейнер: `register(name, factory)` та `resolve(name)` із кешем (singleton).

```js
const mkContainer = () => { const f = new Map(), c = new Map(); return { register: (n, fn) => f.set(n, fn), resolve(n) { if (!c.has(n)) c.set(n, f.get(n)(this)); return c.get(n); } }; }
```

**8.** Контейнер з залежностями між сервісами: `service` залежить від `db`.

```js
const mk = () => { const f = new Map(); const c = new Map(); const r = { reg: (n, fn) => f.set(n, fn), get(n) { if (!c.has(n)) c.set(n, f.get(n)(r)); return c.get(n); } }; return r; }
```

### Рівень 3. Нюанси та пастки

**9.** Інвертуйте залежність від часу: `makeClock(now)` приймає функцію часу.

```js
const makeId = (now) => () => 'id-' + now()
```

**10.** Інвертуйте залежність від випадковості для детермінованого тесту.

```js
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)]
```

**11.** Складіть репозиторій як абстракцію: `UserService` працює з `repo.find`, а реалізація — in-memory.

```js
class UserService { constructor(repo) { this.repo = repo; } name(id) { return this.repo.find(id)?.name ?? 'unknown'; } } const memRepo = (rows) => ({ find: (id) => rows.find(r => r.id === id) })
```

**12.** Чому `new` усередині бізнес-логіки погано для тестів?

### Рівень 4. Практика

**13.** Що таке Composition Root?

**14.** Чи означає DI обов'язкове використання контейнера?

### Відповіді

1. Модулі верхнього рівня не залежать від модулів нижнього; обидва залежать від абстракцій. Абстракції не залежать від деталей, а деталі залежать від абстракцій
2. DIP — принцип проєктування (залежність від абстракцій); DI — техніка передачі залежностей ззовні; IoC — загальна ідея передачі керування фреймворку чи контейнеру
3. `'smtp:hi'`
4. Виклик `[new Service({ send: (m) => 'smtp:' + m }).notify('hi'), new Service({ send: (m) => 'sms:' + m }).notify('hi')]` → `['smtp:hi', 'sms:hi']`
5. Виклик `(() => { const f = mkFake(); const r = new Service(f).notify('hello'); return [r, f.calls]; })()` → `['ok', ['hello']]`
6. Виклик `[fetchUser(1), fetchUser(1, { get: (u) => 'stub:' + u })]` → `['real:/users/1', 'stub:/users/1']`
7. Виклик `(() => { let created = 0; const k = mkContainer(); k.register('db', () => ({ id: ++created })); const a = k.resolve('db'), b = k.resolve('db'); return [a === b, created]; })()` → `[true, 1]`
8. Виклик `(() => { const k = mk(); k.reg('db', () => ({ q: () => 42 })); k.reg('svc', (c) => ({ run: () => c.get('db').q() + 1 })); return k.get('svc').run(); })()` → `43`
9. Виклик `(() => { let t = 100; const id = makeId(() => t++); return [id(), id()]; })()` → `['id-100', 'id-101']`
10. Виклик `[pick(['a', 'b', 'c'], () => 0), pick(['a', 'b', 'c'], () => 0.5), pick(['a', 'b', 'c'], () => 0.99)]` → `['a', 'b', 'c']`
11. Виклик `(() => { const s = new UserService(memRepo([{ id: 1, name: 'Ann' }])); return [s.name(1), s.name(2)]; })()` → `['Ann', 'unknown']`
12. Залежність жорстко зафіксована, її не можна підмінити заглушкою; тест вимагає реальної мережі, БД чи годинника
13. Єдине місце на старті застосунку, де збираються всі конкретні залежності й передаються у верхні рівні
14. Ні: достатньо ручної передачі залежностей через конструктор чи параметри; контейнер лише автоматизує збирання графа
