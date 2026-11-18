# NestJS: загальне ознайомлення

> Приклади коду в цій нотатці — псевдокод: він потребує встановлених `@nestjs/core` та `@nestjs/common` і не виконується сам по собі. Синтаксично й структурно він точно відповідає реальному Nest-коду — саме так це виглядає в справжньому проєкті.

## 0. Що таке NestJS

NestJS — це фреймворк для побудови server-side застосунків на Node.js, написаний і призначений саме для TypeScript (хоча технічно дозволяє й чистий JS). На відміну від Express чи Fastify (які самі по собі — мінімалістичні бібліотеки для маршрутизації HTTP-запитів, без нав'язаної структури проєкту), Nest накладає цілу архітектурну філософію: як організовувати код, як компоненти спілкуються між собою, де живе бізнес-логіка.

Під капотом Nest, за замовчуванням, використовує саме Express (можна перемкнути на Fastify) — тобто Nest не «замінює» Express, а будує над ним шар архітектури, dependency injection і декораторів. Це варто розуміти одразу: Nest — не конкурент Express на тому самому рівні абстракції, а надбудова над ним (або над Fastify).

## 1. Чому Nest з'явився: проблема, яку він вирішує

Express навмисно не диктує структуру проєкту — це і сила (повна свобода), і слабкість (кожна команда чи розробник вигадує свою структуру, і великі Express-проєкти з часом стає важко підтримувати без узгодженої архітектури: де класти бізнес-логіку, як тестувати роути ізольовано, як перевикористовувати сервіси між різними частинами застосунку).

Nest навмисно запозичує архітектурні ідеї з Angular (той самий автор екосистеми, Kamil Myśliwiec, свідомо орієнтувався на Angular-подібний підхід для бекенду): модулі, декоратори, dependency injection, чітке розділення відповідальності. Якщо ти колись працював з Angular на фронтенді — структура Nest-проєкту виглядатиме знайомою.

## 2. Три базові будівельні блоки Nest-застосунку

Практично кожен Nest-застосунок будується з цих трьох типів класів, що взаємодіють через декоратори (`@Controller`, `@Injectable`, `@Module` тощо — детально декоратори розберемо в окремій нотатці):

### 2.1. Controller (контролер) — приймає HTTP-запити

Контролер — це клас, що відповідає за маршрутизацію: які URL і HTTP-методи обслуговує цей клас. Сам контролер не має містити бізнес-логіку — лише приймати запит, делегувати роботу сервісу, повернути відповідь. Це прямий аналог «route handlers» в Express, але оформлений як клас із методами, позначеними декораторами:

```typescript
@Controller("users")
export class UsersController {
  @Get()
  findAll() { ... }       // GET /users

  @Get(":id")
  findOne(@Param("id") id: string) { ... } // GET /users/:id

  @Post()
  create(@Body() dto: CreateUserDto) { ... } // POST /users
}
```

Детальний розбір декораторів контролера, параметрів запиту тощо — у нотатці про контролери.

### 2.2. Provider / Service (сервіс) — містить бізнес-логіку

Provider (найчастіше — Service) — це клас, що інкапсулює реальну логіку: роботу з базою даних, обчислення, звернення до зовнішніх API. Контролер не робить цю роботу сам — він запитує сервіс:

```typescript
@Injectable()
export class UsersService {
  private users = [];

  findAll() {
    return this.users;
  }
  create(dto: CreateUserDto) {
    const user = { id: Date.now(), ...dto };
    this.users.push(user);
    return user;
  }
}
```

`@Injectable()` — ключовий декоратор: він позначає клас як такий, що може бути «впроваджений» (injected) в інші класи через dependency injection (детально — розділ 3 нижче).

### 2.3. Module (модуль) — об'єднує пов'язані контролери й сервіси

Модуль — це «контейнер», що групує разом контролери, сервіси й інші модулі, пов'язані логічно (наприклад, усе про «users» — в одному `UsersModule`). Кожен Nest-застосунок має хоча б один кореневий модуль (типово `AppModule`), і може мати багато дочірніх, «фіче-орієнтованих» модулів:

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // робить UsersService доступним іншим модулям
})
export class UsersModule {}

@Module({
  imports: [UsersModule, ProductsModule], // «збирає» фіче-модулі разом
})
export class AppModule {}
```

Ця модульна структура — головна відмінність від «плоского» Express-застосунку: замість одного великого файлу з роутами (чи довільної саморобної структури папок) Nest змушує явно оголошувати, що з чим пов'язане і що експортується назовні модуля.

## 3. Dependency Injection (DI) — серце архітектури Nest

Dependency Injection — це патерн, де клас не створює сам ті об'єкти, від яких залежить (наприклад, `UsersController` не робить `new UsersService()` вручну всередині себе) — замість цього потрібна залежність передається ззовні, найчастіше через конструктор, а сам Nest (точніше, його DI-контейнер) відповідає за те, щоб створити й «підставити» правильний екземпляр:

```typescript
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //           Nest сам бачить, що потрібен UsersService,
  //           сам створює (чи перевикористовує) його екземпляр,
  //           і сам передає його сюди — без жодного `new` у коді контролера

  @Get()
  findAll() {
    return this.usersService.findAll(); // просто делегуємо роботу сервісу
  }
}
```

Чому це важливо:

- **тестування:** у юніт-тесті можна підставити «фейковий» `UsersService` (мок) замість реального, не змінюючи код контролера;
- **перевикористання:** якщо кілька контролерів потребують один і той самий `UsersService`, Nest за замовчуванням створює один спільний екземпляр (singleton) на весь застосунок — жодних дублювань стану;
- **слабке зв'язування (loose coupling):** контролер знає лише про інтерфейс сервісу (публічні методи), а не про те, як саме той реалізований усередині.

Цей самий принцип — узагальнена версія «ін'єкції залежностей», яку ти вже бачив у чистому JS через звичайні функції вищого порядку чи параметри конструктора (детально — нотатка про dependency injection у `patterns/`, а також функції в нотатці про асинхронний код, що приймають callback ззовні, а не викликають щось «заховане» всередині) — Nest лише автоматизує цей патерн і робить його центральним принципом усієї архітектури.

## 4. Як декоратори «описують» клас, а Nest «читає» ці описи

Декоратори (`@Controller`, `@Injectable`, `@Module`, `@Get`, `@Post` тощо) — це TypeScript/ECMAScript-конструкція, що додає метадані до класу чи методу, без зміни того, як цей клас чи метод «виглядає» з точки зору звичайного коду. Nest під час старту застосунку сканує ці метадані (через бібліотеку `reflect-metadata`) і будує на їх основі:

- граф залежностей (хто від кого залежить — для DI);
- таблицю маршрутів (який метод контролера відповідає якому HTTP-методу + URL);
- порядок виконання middleware/guards/interceptors/pipes (детально — окремі майбутні теми, це вже «процес обробки запиту»).

Це принципово інший підхід, ніж в Express, де маршрути реєструються імперативно (`app.get("/users", handler)` виконується як звичайний рядок JS-коду) — у Nest маршрути декларуються через метадані, а сам Nest «збирає» їх воєдино на етапі старту (bootstrap).

## 5. Життєвий цикл запиту (спрощено)

Запит, що прилітає в Nest-застосунок, проходить через кілька послідовних шарів (кожен — окрема, детально розглянута в майбутніх нотатках тема):

1. **Middleware** — виконується першим, ще до того, як Nest «знає», який саме controller/handler обслуговуватиме запит (аналог Express middleware).
2. **Guards** — вирішують, чи дозволено взагалі виконати цей handler (авторизація/автентифікація).
3. **Interceptors (before)** — можуть трансформувати запит до обробки.
4. **Pipes** — валідують і трансформують вхідні дані (наприклад, `@Body() dto: CreateUserDto` — саме pipe перевіряє, що `dto` відповідає формі).
5. **Controller handler** — власне метод контролера виконується, звертається до Service.
6. **Interceptors (after)** — можуть трансформувати результат після обробки.
7. **Exception filters** — ловлять помилки, що виникли на будь-якому з попередніх кроків, і формують єдиний формат відповіді про помилку.

Саме цей конвеєр (pipeline) і є «магією» Nest — замість того, щоб вручну писати перевірку авторизації/валідації в кожному роуті (як часто буває в «сирому» Express), ці наскрізні задачі виносяться в окремі, перевикористовувані класи й просто «навішуються» на потрібні контролери/методи через декоратори.

## 6. Типова структура файлів Nest-проєкту

```text
src/
  main.ts                 — точка входу, "bootstrap" застосунку
  app.module.ts            — кореневий модуль
  app.controller.ts        — кореневий контролер (часто /health чи /)
  app.service.ts           — кореневий сервіс
  users/
    users.module.ts        — фіче-модуль
    users.controller.ts    — маршрути /users
    users.service.ts       — бізнес-логіка users
    dto/
      create-user.dto.ts   — форма даних для вхідного запиту (Data Transfer Object)
    entities/
      user.entity.ts       — форма даних, як вона зберігається (напр., в БД)
```

Найменування файлів за конвенцією (`.controller.ts`, `.service.ts`, `.module.ts`, `.dto.ts`) — це не вимога компілятора, а стала спільнотна угода, яку офіційний Nest CLI дотримується автоматично при генерації файлів (детально CLI — розділ 9 нижче).

## 7. Bootstrap — як застосунок реально стартує (`main.ts`)

Мінімальний приклад точки входу (псевдокод, потребує встановлених `@nestjs/core` та `@nestjs/common`; наведено для розуміння форми, а не для копіювання без контексту реального проєкту):

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // будує весь граф
                                                       // модулів/сервісів/контролерів
                                                       // з AppModule як кореня
  await app.listen(3000); // під капотом — app.listen() того самого
                              // Express-застосунку, який Nest створив і налаштував
}
bootstrap();
```

`NestFactory.create(AppModule)` — це момент, коли Nest реально «сканує» все дерево imports/controllers/providers, починаючи з `AppModule`, будує DI-контейнер і реєструє всі маршрути в Express (чи Fastify) — усе, розглянуте в розділах 2–5, «оживає» саме на цьому кроці.

## 8. Nest vs «голий» Express — коли що обирати

| Критерій | Express | NestJS |
|---|---|---|
| Структура проєкту | не нав'язується, повна свобода | чітка, архітектурно визначена (модулі/DI) |
| Крива навчання | низька, мінімалізм | вища — потрібно зрозуміти DI, декоратори |
| TypeScript | опціонально, «приклеюється» зверху | «рідний» для TS, декоратори — TS-фіча |
| Масштабованість великої команди/проєкту | потребує ручної дисципліни | архітектура допомагає тримати порядок |
| Швидкість написання маленького API | дуже швидко, мінімум коду | більше «boilerplate» для простих випадків |
| Тестованість | залежить від того, як сам організував код | DI робить мокати залежності природно легко |
| Під капотом | сам є HTTP-сервером | зазвичай використовує Express/Fastify всередині |

Загальне правило: маленький сервіс/прототип/мікросервіс з кількома ендпоінтами — часто простіше й швидше на «голому» Express; великий бекенд із багатьма командами, довгостроковою підтримкою і складною бізнес-логікою — там, де архітектурна дисципліна Nest окупається з часом.

## 9. Nest CLI — інструмент для генерації структури

Офіційний CLI (`@nestjs/cli`, команда `nest`) автоматизує створення файлів за стандартною структурою й конвенцією іменування з розділу 6:

```bash
nest new my-project           # створює новий застосунок з нуля
nest generate module users    # (nest g module users) — новий фіче-модуль
nest generate controller users
nest generate service users
```

Це той самий принцип, що й Angular CLI (звідки й запозичений сам підхід) — CLI одразу створює файл, правильно іменований, з потрібними декораторами, і автоматично додає його в масив `controllers`/`providers` відповідного `@Module()`.

## Підсумок

- NestJS — TypeScript-first бекенд-фреймворк, побудований над Express (чи Fastify) — не заміна їм, а архітектурна надбудова.
- Запозичує ідеї з Angular: модулі, декоратори, dependency injection.
- Три базові будівельні блоки: Controller (маршрутизація) → Service/Provider (бізнес-логіка) → Module (групує їх разом).
- Dependency Injection — Nest сам створює й «підставляє» залежності через конструктор, замість ручного `new` усередині класу; це дає легке тестування, спільні (singleton) екземпляри сервісів, слабке зв'язування компонентів.
- Декоратори (`@Controller`, `@Injectable`, `@Module`, `@Get`...) — це метадані, які Nest сканує на старті застосунку, щоб побудувати граф залежностей і таблицю маршрутів — на відміну від Express, де маршрути реєструються імперативно, рядок за рядком.
- Запит проходить через конвеєр: middleware → guards → pipes → controller handler → interceptors → exception filters (кожен — тема окремої майбутньої нотатки).
- `NestFactory.create(AppModule)` у `main.ts` — момент, коли весь цей граф реально будується й застосунок «оживає».
- Вибір Nest vs «голий» Express — компроміс між архітектурною дисципліною (яка окупається на великих, довгострокових проєктах) і швидкістю написання простого коду (де зручніший мінімалізм Express).

## Задачі для закріплення

17 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах усі експорти `@nestjs/common` і `NestFactory` імпортовані, `boot(Module)` запускає застосунок на вільному порту й повертає `{ url, close }`, а `get(url)` повертає `{ status, body }`.

### Рівень 1. Основи

**1.** Мінімальний застосунок: контролер, сервіс, модуль і запит `GET /hello`.

```ts
@Injectable() class Svc { greet() { return 'hello'; } }
@Controller() class Ctl { constructor(private s: Svc) {} @Get('hello') h() { return this.s.greet(); } }
@Module({ controllers: [Ctl], providers: [Svc] }) class AppModule {}
const a = await boot(AppModule);
const r = await get(a.url + '/hello');
await a.close();
return [r.status, r.body];
```

**2.** Що поверне Nest, якщо маршруту не існує?

```ts
@Controller() class Ctl { @Get('a') a() { return 'a'; } }
@Module({ controllers: [Ctl] }) class M {}
const a = await boot(M);
const r = await get(a.url + '/nope');
await a.close();
return [r.status, JSON.parse(r.body)];
```

**3.** Об'єкт у відповіді серіалізується в JSON із заголовком `Content-Type`.

```ts
@Controller() class Ctl { @Get() a() { return { ok: true, n: [1, 2] }; } }
@Module({ controllers: [Ctl] }) class M {}
const a = await boot(M);
const r = await get(a.url + '/');
await a.close();
return [r.body, r.headers.get('content-type')];
```

**4.** Рядок у відповіді: `Content-Type` і тіло.

```ts
@Controller() class Ctl { @Get() a() { return 'plain'; } }
@Module({ controllers: [Ctl] }) class M {}
const a = await boot(M);
const r = await get(a.url + '/');
await a.close();
return [r.body, r.headers.get('content-type')];
```

**5.** Метаданні декораторів: що зберігає `@Controller('cats')`?

```ts
@Controller('cats') class C {}
return [Reflect.getMetadata('path', C), Reflect.getMetadata('__controller__', C) ?? 'не вказано'];
```

### Рівень 2. Деталі й поведінка

**6.** Метадані методу-обробника: шлях і HTTP-метод.

```ts
@Controller() class C { @Post('create') make() {} }
const proto = C.prototype.make;
return [Reflect.getMetadata('path', proto), Reflect.getMetadata('method', proto)];
```

**7.** Метадані параметрів конструктора (`design:paramtypes`).

```ts
@Injectable() class A {}
@Injectable() class B { constructor(public a: A) {} }
const types = Reflect.getMetadata('design:paramtypes', B);
return [types.length, types[0] === A, types[0].name];
```

**8.** Один екземпляр сервісу в різних контролерах (singleton).

```ts
@Injectable() class S { id = Math.random(); }
@Controller('a') class A { constructor(public s: S) {} @Get() g() { return this.s.id; } }
@Controller('b') class B { constructor(public s: S) {} @Get() g() { return this.s.id; } }
@Module({ controllers: [A, B], providers: [S] }) class M {}
const a = await boot(M);
const x = await get(a.url + '/a'), y = await get(a.url + '/b');
await a.close();
return x.body === y.body;
```

**9.** Що станеться, якщо провайдер не зареєстровано в модулі?

```ts
const first = (e: any) => String(e.message).split('\n')[0];
@Injectable() class S {}
@Controller() class C { constructor(private s: S) {} @Get() g() { return 1; } }
@Module({ controllers: [C] }) class M {}
try { await boot(M); } catch (e) { return first(e); }
```

**10.** Порядок життєвого циклу: `onModuleInit`, `onApplicationBootstrap`, `onModuleDestroy`.

```ts
const log: string[] = [];
@Injectable() class S implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy { constructor() { log.push('constructor'); } onModuleInit() { log.push('init'); } onApplicationBootstrap() { log.push('bootstrap'); } onModuleDestroy() { log.push('destroy'); } }
@Module({ providers: [S] }) class M {}
const a = await boot(M);
log.push('listening');
await a.close();
return log;
```

### Рівень 3. Нюанси та пастки

**11.** Глобальний префікс `setGlobalPrefix`.

```ts
@Controller('users') class U { @Get() l() { return 'users'; } }
@Module({ controllers: [U] }) class M {}
const app = await NestFactory.create(M, { logger: false });
app.setGlobalPrefix('api');
await app.listen(0, '127.0.0.1');
const url = 'http://127.0.0.1:' + app.getHttpServer().address().port;
const a = await get(url + '/api/users'), b = await get(url + '/users');
await app.close();
return [a.status, b.status];
```

**12.** Кількість шарів: middleware → guard → pipe → handler: порядок виконання.

```ts
const log: string[] = [];
@Injectable() class G implements CanActivate { canActivate() { log.push('guard'); return true; } }
@Injectable() class P implements PipeTransform { transform(v: any) { log.push('pipe'); return v; } }
@Controller() class C { @UseGuards(G) @Get(':id') h(@Param('id', P) id: string) { log.push('handler'); return id; } }
@Module({ controllers: [C] }) class M {}
const app = await NestFactory.create(M, { logger: false });
app.use((req: any, res: any, next: any) => { log.push('middleware'); next(); });
await app.listen(0, '127.0.0.1');
await get('http://127.0.0.1:' + app.getHttpServer().address().port + '/7');
await app.close();
return log;
```

**13.** Виняток `NotFoundException` перетворюється на HTTP 404 із тілом.

```ts
@Controller() class C { @Get() g() { throw new NotFoundException('no cat'); } }
@Module({ controllers: [C] }) class M {}
const a = await boot(M);
const r = await get(a.url + '/');
await a.close();
return [r.status, JSON.parse(r.body)];
```

**14.** Необроблена помилка → 500.

```ts
@Controller() class C { @Get() g() { throw new Error('boom'); } }
@Module({ controllers: [C] }) class M {}
const a = await boot(M);
const r = await get(a.url + '/');
await a.close();
return [r.status, JSON.parse(r.body)];
```

**15.** Які три базові будівельні блоки Nest-застосунку?

### Рівень 4. Практика

**16.** Чим Nest відрізняється від голого Express?

**17.** Для чого `reflect-metadata`?

### Відповіді

1. `[200, 'hello']`
2. `[404, { message: 'Cannot GET /nope', error: 'Not Found', statusCode: 404 }]`
3. `['{"ok":true,"n":[1,2]}', 'application/json; charset=utf-8']`
4. `['plain', 'text/html; charset=utf-8']`
5. `['cats', true]`
6. `['create', 1]`
7. `[1, true, 'A']`
8. `true`
9. `'Nest can't resolve dependencies of the C (?). Please make sure that the argument S at index [0] is available in the M context.'`
10. `['constructor', 'init', 'bootstrap', 'listening', 'destroy']`
11. `[200, 404]`
12. `['middleware', 'guard', 'pipe', 'handler']`
13. `[404, { message: 'no cat', error: 'Not Found', statusCode: 404 }]`
14. `[500, { statusCode: 500, message: 'Internal server error' }]`
15. Модулі (організація), контролери (маршрути й обробка запитів) та провайдери/сервіси (бізнес-логіка, що впроваджується через DI)
16. Додає архітектуру: модулі, DI, декоратори, guards/pipes/interceptors, типізацію й тестування; Express залишається HTTP-шаром під капотом
17. Зберігає метадані декораторів і типів (шляхи, параметри конструкторів), з яких Nest будує маршрути й граф залежностей
