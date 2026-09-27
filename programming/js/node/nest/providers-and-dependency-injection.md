# NestJS: Providers та Dependency Injection

> Як і в попередніх нотатках про Nest, приклади — псевдокод, що потребує реального `@nestjs/core`/`@nestjs/common`, але синтаксично відповідає реальному коду 1:1.

## 0. Нагадування із загального огляду

Dependency Injection (DI) — патерн, де клас не створює сам об'єкти, від яких залежить, а отримує їх ззовні (найчастіше — через конструктор). У Nest це центральний архітектурний принцип, і за нього відповідає окремий механізм — IoC-контейнер (Inversion of Control container), що сам вирішує, який екземпляр кому передати. Тут — детально: що таке provider, як контейнер «розплутує» граф залежностей, і які бувають виняткові сценарії (кастомні provider'и, scope'и, циклічні залежності).

## 1. Що таке «provider» у термінології Nest

«Provider» — загальна назва для будь-чого, що може бути «впорснене» (injected) в інший клас через DI: сервіси, репозиторії, фабрики, helper-класи, навіть прості значення (детально — розділ 7, custom providers). Service — лише найпоширеніший, «типовий» випадок provider'а, а не окрема мовна конструкція.

```typescript
@Injectable()
export class UsersService {
  private users: { id: number; name: string }[] = [];

  findAll() {
    return this.users;
  }
  create(name: string) {
    const user = { id: Date.now(), name };
    this.users.push(user);
    return user;
  }
}
```

`@Injectable()` — декоратор, що позначає клас як «видимий» для DI-контейнера. Без цього декоратора клас не може бути provider'ом — Nest просто не знатиме, як його створювати й керувати його життєвим циклом.

## 2. Реєстрація provider'а в модулі

Просто позначити клас `@Injectable()` — недостатньо: його ще треба зареєструвати в масиві `providers` відповідного `@Module()` (детально сам Module — нотатка про загальний огляд, розділ 2.3):

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService], // ← ось тут Nest "дізнається", що
                                 UsersService існує і його можна
                                 "впорснути" в контролери/інші
                                 provider'и цього модуля
})
export class UsersModule {}
```

Якщо provider не зареєстрований у `providers`, а його намагаються «впорснути» — Nest викине помилку під час старту застосунку (а не десь глибоко в рантаймі під час обробки запиту!):

```text
Error: Nest can't resolve dependencies of the UsersController
(?). Please make sure that the argument UsersService at index [0]
is available in the UsersModule context.
```

Це важлива перевага: помилка «забув зареєструвати сервіс» ловиться одразу при запуску, а не після того, як щось зламалося в продакшені на конкретному запиті.

## 3. Constructor injection — як залежність реально «потрапляє» в клас

```typescript
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //           "private readonly" тут — це TypeScript parameter
  //           properties (скорочений синтаксис): компілятор
  //           автоматично створює private-поле this.usersService
  //           і одразу присвоює йому значення параметра — не
  //           потрібно писати this.usersService = usersService; вручну

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

Nest «читає» типи параметрів конструктора (через `reflect-metadata` — та сама технологія, що дозволяє декораторам існувати як метадані, коротко згадано в нотатці про загальний огляд, розділ 4) і розуміє: «щоб створити `UsersController`, потрібен екземпляр `UsersService`» — саме тип параметра (`UsersService`) і є «інструкцією» для DI-контейнера, який саме provider тут потрібен.

## 4. IoC-контейнер: як Nest «розплутує» граф залежностей

Уяви, що є три класи, що залежать один від одного:

```typescript
@Injectable()
export class DatabaseService { /* підключення до БД */ }

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}
}

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

Під час старту застосунку (`NestFactory.create(AppModule)`, детально — нотатка про загальний огляд, розділ 7) IoC-контейнер будує граф залежностей і створює екземпляри у правильному порядку — «знизу вгору»:

1. `DatabaseService` не має жодних залежностей → створюється першим.
2. `UsersRepository` потребує `DatabaseService` (вже є) → створюється.
3. `UsersService` потребує `UsersRepository` (вже є) → створюється.
4. `UsersController` потребує `UsersService` (вже є) → створюється.

Ти сам ніколи не пишеш `new DatabaseService()` чи `new UsersRepository(db)` вручну — весь цей «ланцюжок створення» відбувається автоматично. Це прямий аналог того, як Node.js розв'язує `require()`/`import` (детально сам механізм модулів — окрема тема), але для екземплярів класів, а не файлів.

## 5. Singleton за замовчуванням — один екземпляр на весь застосунок

За замовчуванням (default scope) кожен provider створюється рівно один раз за весь час роботи застосунку — цей самий екземпляр повторно використовується для усіх класів, що його потребують, у будь-якому запиті:

```typescript
@Injectable()
export class CounterService {
  private count = 0;
  increment() {
    return ++this.count;
  }
}

// якщо два різні контролери "впорснуть" CounterService —
// обидва отримають той самий екземпляр (той самий this.count!):
@Controller("a")
export class AController {
  constructor(private readonly counter: CounterService) {}
  @Get() hit() { return this.counter.increment(); } // 1, потім 3, потім 5...
}
@Controller("b")
export class BController {
  constructor(private readonly counter: CounterService) {}
  @Get() hit() { return this.counter.increment(); } // 2, потім 4, потім 6...
}
// обидва ендпоінти "діляться" одним спільним станом — це і є singleton
```

Це ефективно (не створюється новий екземпляр на кожен запит), але означає: не зберігай у звичайному (default scope) provider'і стан, специфічний для одного конкретного HTTP-запиту (наприклад, ID поточного користувача) — цей стан «протече» в інші, паралельні запити (класична пастка, аналогічна глобальним змінним у JS, детально — нотатка про `var`).

## 6. Injection scopes — коли потрібен не-singleton provider

Nest дозволяє змінити «життєвий цикл» provider'а через `{ scope }` в `@Injectable()`:

```typescript
import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.DEFAULT })   // singleton (за замовчуванням) — розділ 5
@Injectable({ scope: Scope.REQUEST })   // новий екземпляр на кожен HTTP-запит
@Injectable({ scope: Scope.TRANSIENT }) // новий екземпляр на кожне "впорснення"
                                            (навіть у межах одного запиту, якщо
                                            кілька класів його потребують)
```

`Scope.REQUEST` — типовий вибір, коли потрібно зберігати дані, специфічні для одного запиту (наприклад, «поточний користувач, що робить запит»):

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  currentUserId: string | null = null; // безпечно — це окремий
                                           екземпляр для кожного запиту
}
```

⚠️ Важливий компроміс: `Scope.REQUEST` «просочується» вгору графом залежностей — якщо `UsersService` залежить від REQUEST-scoped provider'а, `UsersService` теж стає REQUEST-scoped (навіть якщо сам не оголошував це явно) — а це означає відмову від singleton-оптимізації для всього «ланцюжка» його споживачів, що може помітно вплинути на продуктивність при високому навантаженні (нові екземпляри на кожен запит замість одного спільного).

## 7. Custom providers — коли потрібно більше, ніж «просто клас»

Масив `providers` у `@Module()` приймає не лише «голі» класи — це скорочений запис. Повна, розгорнута форма виглядає так:

```typescript
providers: [UsersService]
// це рівно те саме, що:
providers: [{ provide: UsersService, useClass: UsersService }]
```

`provide` — це токен (ім'я, за яким цей provider шукається), а решта полів описує, як саме його створити. Розгорнута форма відкриває кілька потужних можливостей:

### 7.1. `useValue` — готове значення замість класу (конфіги, константи, моки)

```typescript
const MOCK_USERS_SERVICE = { findAll: () => [{ id: 1, name: "Test" }] };

@Module({
  providers: [{ provide: UsersService, useValue: MOCK_USERS_SERVICE }],
})
export class UsersTestModule {}
// ідеально для юніт-тестів: "підмінюємо" реальний сервіс на
// простий об'єкт без жодних змін у коді контролера
```

### 7.2. `useClass` — інший клас за тим самим токеном (залежно від середовища)

```typescript
@Module({
  providers: [
    {
      provide: EmailService,
      useClass: process.env.NODE_ENV === "production"
        ? RealEmailService   // реально відправляє листи
        : FakeEmailService,  // просто логує в консоль, не відправляє
    },
  ],
})
export class NotificationsModule {}
```

### 7.3. `useFactory` — значення, що обчислюється функцією (може сама мати залежності)

```typescript
@Module({
  providers: [
    {
      provide: "DATABASE_CONNECTION",
      useFactory: async (configService: ConfigService) => {
        const connection = await createConnection(configService.get("DB_URL"));
        return connection;
      },
      inject: [ConfigService], // які provider'и передати у useFactory як аргументи
    },
  ],
})
export class DatabaseModule {}
// useFactory — єдиний спосіб, коли створення залежить від
// асинхронної операції або від значень, відомих лише в рантаймі
```

### 7.4. `useExisting` — аліас («інше ім'я») для вже існуючого provider'а

```typescript
providers: [
  LoggerService,
  { provide: "AliasedLoggerService", useExisting: LoggerService },
]
// "AliasedLoggerService" і LoggerService тепер вказують на один
// і той самий екземпляр (не створюється другий!)
```

## 8. Injection tokens — коли токен не може бути класом

Типи TypeScript (interface, «просто» тип значення на кшталт `string` чи `number`) повністю зникають після компіляції (детально — нотатка про базові типи TypeScript, вступ) — а це означає, що DI-контейнер (який працює в рантаймі, коли типів уже немає) не може «ін'єктувати» за interface — interface це лише compile-time конструкція, їй нічого не відповідає в рантаймі:

```typescript
interface Logger {
  log(message: string): void;
}
// constructor(private readonly logger: Logger) {} // ❌ Nest не зможе
//                                                      "здогадатись", який
//                                                      реальний клас підставити —
//                                                      interface Logger в рантаймі
//                                                      просто не існує
```

Рішення — явний injection token (рядок, symbol, або клас-маркер) і `@Inject()` для його явної вказівки в конструкторі:

```typescript
export const LOGGER_TOKEN = "LOGGER_TOKEN"; // може бути й Symbol("LOGGER")

@Module({
  providers: [{ provide: LOGGER_TOKEN, useClass: ConsoleLogger }],
})
export class LoggingModule {}

@Injectable()
export class UsersService {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: Logger) {}
  //           ^^^^^^^^^^^^^^^^^^^^^
  //           явно кажемо: "шукай provider за цим токеном",
  //           а не за типом параметра (interface тут лише для
  //           compile-time підказки методів logger.log(...))
}
```

Для звичайних класів (не interface) `@Inject()` не потрібен — Nest сам бере клас як токен (детально — розділ 3, «Nest читає типи параметрів»).

## 9. `@Optional()` — provider, без якого можна обійтись

Якщо залежність не обов'язкова (може бути не зареєстрована в певних конфігураціях) — `@Optional()` запобігає помилці «Nest can't resolve dependencies» при старті, підставляючи `undefined`:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Optional() @Inject("FEATURE_FLAGS") private readonly flags?: FeatureFlags,
  ) {}

  isNewFlowEnabled() {
    return this.flags?.newFlow ?? false; // безпечно, навіть якщо flags === undefined
  }
}
```

## 10. Експорт provider'ів між модулями

За замовчуванням provider видимий лише всередині свого модуля. Щоб інший модуль міг його «впорснути» — його треба явно експортувати (детально сам синтаксис Module — нотатка про загальний огляд, розділ 2.3):

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService], // ← без цього рядка інші модулі
                               не зможуть "впорснути" UsersService,
                               навіть якщо імпортують UsersModule!
})
export class UsersModule {}

@Module({
  imports: [UsersModule], // імпортуємо модуль, щоб отримати
                              доступ до його exports
  providers: [OrdersService],
})
export class OrdersModule {}
// тепер OrdersService може "впорснути" UsersService у свій
// конструктор — завдяки imports + exports
```

## 11. Global modules — коли експортувати в кожен модуль окремо незручно

Для provider'ів, потрібних буквально скрізь (наприклад, `ConfigService` з налаштуваннями застосунку) — `@Global()` робить `exports` модуля доступними всюди без повторного `imports` у кожному модулі:

```typescript
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
// досить імпортувати ConfigModule один раз (зазвичай у AppModule) —
// і ConfigService стає "ін'єктовним" у будь-якому іншому модулі
// без його явного imports
```

Варто використовувати обережно — надмірне застосування `@Global()` «розмиває» чіткість того, що від чого залежить (та сама проблема, що й із глобальними змінними в звичайному JS).

## 12. Циклічні залежності (circular dependency) — `forwardRef()`

Іноді два сервіси (або два модулі) потребують один одного одночасно — `UsersService` потребує `OrdersService`, а `OrdersService` потребує `UsersService`. IoC-контейнер не може вирішити, який створити першим (детально порядок створення «знизу вгору» — розділ 4) — це і є circular dependency. Nest дає `forwardRef()` як «обхідний шлях»:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}
}
```

Але: це «латка», а не рекомендований патерн — циклічна залежність зазвичай сигналізує про невдалий поділ відповідальності між сервісами — часто краще рішення: винести спільну логіку в третій, окремий сервіс, від якого залежать обидва, замість того, щоб вони залежали один від одного напряму.

## 13. Порівняння: DI-контейнер Nest vs ручний «DI» у чистому JS

У чистому JS (без фреймворка) той самий принцип «не створюй залежність сам, отримуй її ззовні» реалізують вручну — через параметри функцій/конструкторів (той самий принцип, який зустрічається, наприклад, у функціях вищого порядку, що приймають callback як аргумент, замість того, щоб «зашивати» його всередині — детально нотатка про асинхронний код):

```js
// "ручний" DI у чистому JS — ти сам "збираєш" граф:
function createUsersService(database) {
  return {
    findAll: () => database.query("SELECT * FROM users"),
  };
}
function createUsersController(usersService) {
  return {
    getAll: () => usersService.findAll(),
  };
}
// "вручну" будуємо граф, у правильному порядку, самі:
const database = createDatabaseConnection();
const usersService = createUsersService(database);
const usersController = createUsersController(usersService);
```

Nest робить рівно це ж саме, але автоматично: читає типи конструкторів (через метадані декораторів) і сам «збирає» цей ланцюжок створення, незалежно від того, наскільки він великий і заплутаний. Це і є головна «магія» DI-контейнера: він звільняє тебе від ручного «збирання» десятків/сотень взаємопов'язаних класів у великому застосунку.

## Шпаргалка

| Конструкція | Навіщо |
|---|---|
| `@Injectable()` | позначає клас як provider, видимий для DI-контейнера |
| `providers: [X]` у `@Module()` | реєструє provider у цьому модулі (скорочена форма) |
| `{ provide, useClass }` | розгорнута форма — той самий сенс, явно |
| `{ provide, useValue }` | готове значення/об'єкт замість класу (конфіги, моки) |
| `{ provide, useFactory, inject }` | значення, обчислене функцією (може бути асинхронним) |
| `{ provide, useExisting }` | аліас до вже існуючого provider'а |
| `@Inject(token)` | явна вказівка токена (обов'язково для interface/string) |
| `@Optional()` | provider, без якого можна обійтись (`undefined` замість помилки) |
| `Scope.DEFAULT`/`REQUEST`/`TRANSIENT` | життєвий цикл provider'а (singleton / на запит / щоразу) |
| `exports: [X]` у `@Module()` | робить provider доступним іншим модулям (через `imports`) |
| `@Global()` | provider доступний скрізь без повторного `imports` |
| `forwardRef()` | «обхідний шлях» для циклічних залежностей (уникай, якщо можливо) |

## Підсумок

- Provider — загальна назва для будь-чого, що DI-контейнер може «впорснути» в інший клас; Service — найпоширеніший, але не єдиний вид provider'а.
- `@Injectable()` позначає клас «видимим» для DI; `providers` у `@Module()` реєструє його в конкретному модулі — без обох кроків Nest не зможе його «знайти», і помилка ловиться одразу під час старту застосунку, а не десь у рантаймі.
- Constructor injection: Nest читає типи параметрів конструктора через метадані й сам «будує» граф залежностей знизу вгору — ти ніколи не пишеш `new` для provider'ів вручну.
- За замовчуванням provider — singleton (`Scope.DEFAULT`): один екземпляр на весь застосунок; `Scope.REQUEST` дає новий екземпляр на кожен HTTP-запит, але «просочується» на все, що від нього залежить, і коштує продуктивності.
- Custom providers (`useValue`/`useClass`/`useFactory`/`useExisting`) дають гнучкість поза «просто класом» — моки для тестів, вибір реалізації залежно від середовища, асинхронне створення.
- Injection tokens (`@Inject(token)`) обов'язкові, коли тип параметра — interface чи примітив (вони зникають після компіляції й нічого не означають у рантаймі).
- Provider видимий лише в своєму модулі, якщо не `exports`; `@Global()` робить його доступним скрізь без повторного `imports`.
- Циклічні залежності (`forwardRef()`) — здебільшого симптом поганого поділу відповідальності, а не норма.
- Nest-DI — автоматизована версія того самого принципу, який у чистому JS робить розробник вручну, передаючи залежності через параметри функцій/конструкторів замість `new` «усередині» коду.
