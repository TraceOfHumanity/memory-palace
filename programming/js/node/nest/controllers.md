# NestJS: контролери — маршрутизація HTTP-запитів

> Приклади нижче — псевдокод (потребують встановлених `@nestjs/core`, `@nestjs/common`), але синтаксично й структурно точно відповідають реальному Nest-коду — саме так це виглядає в справжньому проєкті.

## 0. Нагадування із загального огляду

Controller — клас, що відповідає за маршрутизацію: приймає HTTP-запит, дістає з нього потрібні дані (параметри URL, query-рядок, тіло запиту), делегує роботу сервісу (детально Providers/DI — окрема нотатка) і повертає відповідь. Тут — детально про сам контролер: декоратори маршрутів, як «витягти» дані із запиту, як керувати статус-кодом і заголовками відповіді.

## 1. `@Controller()` — базовий декоратор і префікс маршруту

`@Controller(префікс)` позначає клас як контролер і задає спільний префікс URL для усіх методів усередині нього:

```typescript
@Controller("users")
export class UsersController {
  // усі маршрути нижче автоматично починаються з /users
}
```

Без аргументу — контролер обслуговує маршрути від кореня (`/`):

```typescript
@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return "Hello!"; // GET /
  }
}
```

## 2. Декоратори HTTP-методів

Кожен HTTP-метод має свій декоратор, що застосовується до методу класу (не до самого класу) — метод стає «handler» для цього поєднання HTTP-методу й підшляху:

```typescript
@Controller("users")
export class UsersController {
  @Get()               // GET /users
  findAll() { ... }

  @Get(":id")           // GET /users/:id
  findOne(@Param("id") id: string) { ... }

  @Post()               // POST /users
  create(@Body() dto: CreateUserDto) { ... }

  @Put(":id")           // PUT /users/:id — повна заміна ресурсу
  replace(@Param("id") id: string, @Body() dto: CreateUserDto) { ... }

  @Patch(":id")         // PATCH /users/:id — часткове оновлення
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) { ... }

  @Delete(":id")        // DELETE /users/:id
  remove(@Param("id") id: string) { ... }

  @All("*")              // ловить усі HTTP-методи на будь-якому підшляху
  catchAll() { ... }
}
```

Це прямий аналог `app.get()`/`app.post()`/... в Express — різниця лише в тому, що маршрут оголошується через декоратор методу, а не через виклик функції з callback.

## 3. `@Param()` — дістати змінну частину URL

`:id` у шляху `@Get(':id')` — динамічний сегмент URL. `@Param()` «витягує» його значення з реального запиту:

```typescript
@Get(":id")
findOne(@Param("id") id: string) {
  return `user with id=${id}`;
}
// GET /users/42 → id === "42" (завжди рядок, навіть якщо URL містив цифри!)
```

Без аргументу `@Param()` повертає об'єкт з усіма параметрами шляху одразу (корисно, якщо їх декілька):

```typescript
@Get(":category/:id")
findByCategoryAndId(@Param() params: { category: string; id: string }) {
  return `${params.category} / ${params.id}`;
}
// GET /users/electronics/42 → { category: "electronics", id: "42" }
```

## 4. `@Query()` — дістати query-рядок (`?key=value`)

```typescript
@Get()
findAll(@Query("page") page: string, @Query("limit") limit: string) {
  return `page ${page}, limit ${limit}`;
}
// GET /users?page=2&limit=10 → page === "2", limit === "10"
```

Без аргументу — об'єкт з усіма query-параметрами:

```typescript
@Get()
findAll(@Query() query: { page?: string; limit?: string }) {
  const page = Number(query.page ?? 1);   // явна конвертація в число —
  const limit = Number(query.limit ?? 20); // query завжди приходить як рядки
                                               // (детально проблема типів з
                                               // зовнішніх джерел — common/type-coercion.js)
  return { page, limit };
}
```

## 5. `@Body()` — дістати тіло запиту (JSON), найчастіше через DTO

DTO (Data Transfer Object) — звичайний клас/interface, що описує очікувану форму тіла запиту. `@Body()` «прив'язує» JSON-тіло HTTP-запиту до типу DTO:

```typescript
export class CreateUserDto {
  name: string;
  email: string;
  age: number;
}

@Post()
create(@Body() dto: CreateUserDto) {
  return `created ${dto.name} <${dto.email}>`;
}
// POST /users  { "name": "Oleg", "email": "oleg@example.com", "age": 30 }
```

Важливо: сам по собі `@Body()` з типом `CreateUserDto` не валідує дані в рантаймі — тип DTO тут лише для compile-time підказки (той самий принцип «типи зникають після компіляції» з нотатки про базові типи TypeScript). Щоб реально перевірити вхідні дані під час виконання (наприклад, що email — дійсно email, а age — дійсно число ≥ 0), потрібні pipes (клас-валідатор + `ValidationPipe`) — окрема, детальна тема майбутньої нотатки; тут важливо запам'ятати, що без pipe DTO — це лише «обіцянка» форми, а не гарантія:

```typescript
@Post()
create(@Body() dto: CreateUserDto) {
  // без ValidationPipe сюди може прийти { name: 123, email: null } —
  // TypeScript тут безсилий, бо перевірка типів давно "зникла"
  // на етапі компіляції (детально різниця compile-time/runtime —
  // typescript/basic-types.md, вступ)
}
```

Частина тіла (одне конкретне поле):

```typescript
@Post()
create(@Body("name") name: string) { ... } // бере лише поле "name" з JSON-тіла
```

## 6. `@Headers()` — дістати HTTP-заголовки запиту

```typescript
@Get()
findAll(@Headers("authorization") authHeader: string) {
  return `received header: ${authHeader}`;
}
// без аргументу — весь об'єкт заголовків: @Headers() headers: Record<string, string>
```

## 7. Комбінування декораторів параметрів в одному handler'і

Handler може приймати скільки завгодно декораторів-параметрів одночасно — Nest сам «збирає» відповідні значення й передає їх у правильному порядку (за позицією параметра, а не за назвою):

```typescript
@Patch(":id")
update(
  @Param("id") id: string,
  @Body() dto: UpdateUserDto,
  @Query("notify") notify: string,
  @Headers("x-request-id") requestId: string,
) {
  return { id, dto, notify, requestId };
}
```

## 8. Коди статусу й заголовки відповіді

### 8.1. `@HttpCode()` — змінити статус-код за замовчуванням

За замовчуванням Nest повертає 200 (для GET/PUT/PATCH/DELETE) або 201 (для POST). Щоб змінити це — явний декоратор:

```typescript
@Post()
@HttpCode(202) // "прийнято, але ще не оброблено" — типово для черг/async-задач
create(@Body() dto: CreateUserDto) { ... }
```

### 8.2. `@Header()` — додати заголовок до відповіді

```typescript
@Get()
@Header("Cache-Control", "no-store")
findAll() { ... }
```

### 8.3. `@Redirect()` — HTTP-редирект

```typescript
@Get("old-path")
@Redirect("https://example.com/new-path", 301)
redirectOldPath() { ... }

// можна також повернути об'єкт { url, statusCode } з самого
// handler'а, і Nest використає його замість статичних аргументів
// декоратора (динамічний редирект залежно від логіки):
@Get("dynamic-redirect")
@Redirect()
dynamicRedirect(@Query("version") version: string) {
  return { url: `https://example.com/v${version}`, statusCode: 302 };
}
```

## 9. Як Nest визначає, що повернути клієнту (стандартний режим)

У «стандартному» (не-express-специфічному) підході handler просто return'ить значення — Nest сам серіалізує його в JSON і виставляє правильний Content-Type:

```typescript
@Get(":id")
findOne(@Param("id") id: string) {
  return { id, name: "Oleg" }; // Nest сам робить res.json({...}) "під капотом"
}
```

Асинхронні handler'и — Nest розуміє `Promise`/`async`-`await` нативно (детально механіка самого `async`/`await` — нотатка про асинхронний код):

```typescript
@Get(":id")
async findOne(@Param("id") id: string) {
  const user = await this.usersService.findById(id); // Nest дочекається
                                                          Promise і візьме результат
  return user;
}
```

Цей «стандартний» підхід — рекомендований за замовчуванням, бо він не зав'язаний на конкретну HTTP-бібліотеку (Express чи Fastify) — код контролера лишається однаковим незалежно від того, що Nest використовує «під капотом».

## 10. Library-specific режим: `@Res()` — прямий доступ до об'єкта відповіді

Іноді потрібен повний, ручний контроль над відповіддю (стрімінг файлу, нестандартні заголовки, кукі тощо) — для цього є `@Res()` (Express-подібний res-об'єкт, детально знайомий за нотаткою про HTTP):

```typescript
import { Response } from "express";

@Get(":id")
findOne(@Param("id") id: string, @Res() res: Response) {
  res.status(200).json({ id, name: "Oleg" }); // тепер ти сам
                                                  повністю відповідаєш за відповідь
}
```

⚠️ Критично важливий нюанс: щойно ти додаєш `@Res()` у параметри handler'а, Nest перестає «автоматично» обробляти return-значення цього handler'а — ти зобов'язаний сам викликати `res.send()`/`res.json()`/`res.end()`, інакше запит «зависне» (клієнт ніколи не отримає відповідь, бо жоден код так і не завершив HTTP-response):

```typescript
@Get(":id")
findOneBroken(@Param("id") id: string, @Res() res: Response) {
  return { id }; // ❌ це просто ігнорується! res.json()/.send() не викликано —
                    клієнт "зависне" в очікуванні відповіді назавжди
}
```

Якщо потрібен доступ до `res` лише для чогось додаткового (наприклад, встановити cookie), а решту відповіді хочеш лишити «стандартному» режиму — є `{ passthrough: true }`:

```typescript
@Get(":id")
findOne(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
  res.cookie("lastViewedId", id); // додаткова дія над res
  return { id, name: "Oleg" };      // а return усе одно працює звично!
}
```

## 11. `@Req()` — повний об'єкт запиту (коли декораторів-параметрів недостатньо)

```typescript
import { Request } from "express";

@Get()
findAll(@Req() req: Request) {
  console.log(req.ip, req.headers["user-agent"]);
  return "ok";
}
```

Зазвичай `@Param()`/`@Query()`/`@Body()`/`@Headers()` покривають 95% потреб — `@Req()` потрібен лише для дійсно специфічних речей (наприклад, `req.ip`, кастомні властивості, додані middleware).

## 12. Вкладені шляхи й вайлдкарди

```typescript
@Controller("users")
export class UsersController {
  @Get("me/profile")     // GET /users/me/profile — статичний вкладений шлях
  getMyProfile() { ... }

  @Get("*")                // GET /users/будь-що — "ловить" усе, що не
  catchUnmatched() { ... } //   збіглося з іншими, більш конкретними маршрутами
}
```

Порядок оголошення методів у класі впливає на пріоритет зіставлення маршрутів (більш конкретні варто оголошувати раніше за «ловці всього»).

## 13. Сервіс як залежність — чому контролер не «робить» роботу сам

Повний, реалістичний приклад, що зводить усе разом (детально сам механізм DI — окрема нотатка, тут — лише як це виглядає з боку контролера):

```typescript
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  // ^ Nest сам створює/підставляє UsersService — жодного `new` тут немає

  @Get()
  findAll(@Query("role") role?: string) {
    return this.usersService.findAll(role); // контролер лише делегує
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
      // ^ NestJS має готові HTTP exception-класи (NotFoundException,
      //   BadRequestException, ForbiddenException тощо) — кинута
      //   помилка автоматично перетворюється на правильну HTTP-
      //   відповідь (404, 400, 403...) через exception filters
      //   (детально — окрема майбутня нотатка)
    }
    return user;
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

Це головний принцип: контролер — «тонкий» шар (thin controller). Уся реальна логіка (пошук у БД, перевірки, обчислення) живе в сервісі, а не в контролері — саме це розділення робить контролер легким для читання (він буквально «мапа маршрутів») і легким для тестування (сервіс тестується окремо, без HTTP-шару взагалі).

## Шпаргалка: найпоширеніші декоратори контролера

| Декоратор | Що робить |
|---|---|
| `@Controller(prefix)` | позначає клас контролером, задає спільний префікс URL |
| `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@All` | прив'язує метод до HTTP-методу + підшляху |
| `@Param(key?)` | дані з динамічної частини URL (`:id`) |
| `@Query(key?)` | дані з query-рядка (`?key=value`) |
| `@Body(key?)` | дані з JSON-тіла запиту (зазвичай — DTO) |
| `@Headers(key?)` | HTTP-заголовки запиту |
| `@HttpCode(code)` | явний статус-код відповіді |
| `@Header(name, value)` | явний заголовок відповіді |
| `@Redirect(url?, code?)` | HTTP-редирект |
| `@Req()` / `@Res()` | «сирий» об'єкт запиту/відповіді (library-specific режим) |

## Підсумок

- `@Controller(prefix)` + декоратори HTTP-методів (`@Get`/`@Post`/...) оголошують маршрути декларативно, через метадані — на відміну від імперативного `app.get()` в «голому» Express.
- `@Param()`/`@Query()`/`@Body()`/`@Headers()` «витягують» відповідні частини HTTP-запиту й передають їх у handler як звичайні аргументи функції — Nest сам «збирає» значення за позицією параметра.
- DTO-тип у `@Body()` — лише compile-time підказка форми; без окремого `ValidationPipe` жодної реальної перевірки в рантаймі немає (той самий принцип «типи зникають», що й у чистому TypeScript).
- «Стандартний» режим — просто `return` значення з handler'а, Nest сам серіалізує й відправляє відповідь; розуміє `async`/`await` нативно.
- «Library-specific» режим (`@Res()`) дає повний контроль, але знімає з Nest відповідальність за відповідь — ти мусиш сам викликати `res.send()`/`.json()`, інакше запит «зависне»; `{ passthrough: true }` дозволяє скомбінувати обидва підходи.
- Контролер має бути «тонким» (thin controller) — лише приймає запит і делегує роботу сервісу через dependency injection; уся реальна логіка (і кидання HTTP-виключень на кшталт `NotFoundException`) живе в Service, а не в Controller.
