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
