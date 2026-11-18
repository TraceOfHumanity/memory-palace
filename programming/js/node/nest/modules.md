# NestJS: модулі

## 0. Нагадування із загального огляду та Providers/DI

Module — «контейнер», що групує пов'язані controllers/providers і оголошує, з якими іншими модулями він взаємодіє. Ми вже бачили базові `imports`/`exports` (нотатка про Providers/DI, розділи 10–11) — тут детально: усі поля `@Module()`, як кожен модуль має свій «ізольований» DI-контейнер, динамічні модулі (`forRoot`/`forFeature`), і типова структура великого застосунку.

## 1. Чотири поля `@Module()` — повний розбір

```typescript
@Module({
  imports: [OtherModule],       // які модулі потрібні цьому модулю
  controllers: [UsersController], // які контролери належать цьому модулю
  providers: [UsersService],      // які provider'и (детально —
                                     нотатка про Providers/DI)
                                     реєструються в цьому модулі
  exports: [UsersService],        // які з providers цього модуля
                                     доступні іншим модулям, що
                                     імпортують цей модуль
})
export class UsersModule {}
```

Усі чотири поля — необов'язкові й незалежні: модуль може лише «збирати» інші модулі разом (лише `imports`, без `controllers`/`providers` взагалі) — це часто зустрічається в «агрегуючих» модулях, детально розділ 6 нижче.

## 2. Кореневий модуль (`AppModule`) vs фіче-модулі

Кожен Nest-застосунок має рівно один «вхідний» модуль, який передається в `NestFactory.create()` (детально — нотатка про загальний огляд, розділ 7) — за конвенцією він називається `AppModule`:

```typescript
@Module({
  imports: [UsersModule, OrdersModule, ProductsModule, ConfigModule],
})
export class AppModule {}
```

`AppModule` зазвичай сам не містить багато `controllers`/`providers` — його роль — «зібрати» усі фіче-модулі (feature modules) разом. Кожен фіче-модуль (`UsersModule`, `OrdersModule`...) відповідає за одну логічну частину домену застосунку (усе про users — в одному модулі, усе про orders — в іншому), що робить великий застосунок набагато легшим для орієнтування, ніж «плоска» структура Express-проєкту (детально ця відмінність — нотатка про загальний огляд, розділ 8).

## 3. Інкапсуляція: кожен модуль має свій «ізольований» DI-контейнер

Provider, зареєстрований у `providers` одного модуля, за замовчуванням «невидимий» для інших модулів — навіть якщо цей інший модуль імпортує перший:

```typescript
@Module({
  providers: [UsersService], // без exports!
})
export class UsersModule {}

@Module({
  imports: [UsersModule],
  providers: [OrdersService], // OrdersService хоче UsersService...
})
export class OrdersModule {}

@Injectable()
export class OrdersService {
  constructor(private readonly usersService: UsersService) {} // ❌ помилка
  //   Nest can't resolve dependencies of the OrdersService (?).
  //   Please make sure that the argument UsersService at index [0]
  //   is available in the OrdersModule context.
  //
  //   хоча UsersModule імпортовано — UsersService не експортований,
  //   тому "невидимий" за межами свого модуля
}
```

Це не «баг» — це навмисна інкапсуляція: кожен модуль явно вирішує, що саме він «віддає назовні» (`exports`), а що лишається його внутрішньою деталлю реалізації (аналог private-полів класу — лише на рівні цілого модуля, а не окремого об'єкта).

Правильне рішення — як уже показано в нотатці про Providers/DI, розділ 10:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService], // тепер інші модулі, що імпортують
})                            UsersModule, можуть його "впорснути"
export class UsersModule {}
```

## 4. `imports` імпортує модуль цілком, не «обрані частини»

`imports: [UsersModule]` дає доступ до всього, що `UsersModule` експортує (весь масив `exports`), а не до одного конкретного provider'а — неможливо «імпортувати лише `UsersService`, але не `UsersValidatorService`», якщо обидва в `exports` одного модуля. Якщо потрібен такий рівень гранулярності — це знак, що модуль, можливо, варто розбити на дрібніші.

## 5. Повторне використання модуля в кількох місцях — все одно singleton

Якщо два різні модулі імпортують один той самий третій модуль — Nest не створює його двічі. Модуль (і його provider'и, у звичайному default scope — детально нотатка про Providers/DI, розділ 5) залишається singleton на весь застосунок, незалежно від того, скільки разів його «імпортували»:

```typescript
@Module({ providers: [LoggerService], exports: [LoggerService] })
export class LoggerModule {}

@Module({ imports: [LoggerModule] }) export class UsersModule {}
@Module({ imports: [LoggerModule] }) export class OrdersModule {}
// UsersModule і OrdersModule отримують той самий екземпляр
// LoggerService — LoggerModule не "перестворюється" щоразу
```

## 6. Реекспорт імпортованого модуля — «прокидання» залежності далі

Модуль може експортувати не лише свої власні `providers`, а й цілий модуль, який сам імпортував — це «прокидає» залежність далі, без потреби щоразу імпортувати її напряму:

```typescript
@Module({
  imports: [DatabaseModule],
  exports: [DatabaseModule], // реекспорт цілого модуля, а не
})                              окремого provider'а
export class SharedModule {}

@Module({ imports: [SharedModule] }) // тепер має доступ до всього,
export class UsersModule {}             що експортує DatabaseModule,
                                         не імпортуючи його напряму
```

## 7. Dynamic modules — коли модуль потребує конфігурації

Звичайний `@Module()` — статичний: його `providers`/`controllers` відомі заздалегідь, на етапі написання коду. Але багато реальних модулів (підключення до БД, читання `.env`-конфігурації) потребують параметрів, відомих лише під час запуску. Для цього є dynamic modules — модуль оголошує статичний метод (за конвенцією `forRoot()` або `register()`), що повертає об'єкт, схожий на `@Module()`, але побудований у рантаймі:

```typescript
@Module({})
export class ConfigModule {
  static forRoot(options: { envFilePath: string }): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: "CONFIG_OPTIONS",
          useValue: options, // options, передані звідки його реально викликали
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ".env.production" }),
    // звичайне imports: [ConfigModule] не дало б способу
    // передати envFilePath — forRoot() саме для цього
  ],
})
export class AppModule {}
```

Це точнісінько той самий патерн, що використовують реальні бібліотеки екосистеми Nest — `TypeOrmModule.forRoot({...})`, `ConfigModule.forRoot({...})`, `MongooseModule.forRoot({...})`: усі вони — просто звичайні dynamic modules, побудовані за цим самим принципом.

## 8. `forRoot()` vs `forFeature()` — конфігурація один раз vs «на кожен фіче-модуль»

Поширена конвенція (не вимога компілятора, а спільнотна угода):

- `forRoot()` — глобальна конфігурація, викликається рівно один раз, зазвичай у `AppModule` (наприклад, «як підключитися до БД»);
- `forFeature()` — «локальна» реєстрація для конкретного фіче-модуля, викликається в кожному модулі окремо (наприклад, «які саме сутності/таблиці потрібні цьому конкретному модулю»):

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({ type: "postgres", url: process.env.DB_URL }),
    // ↑ один раз, у AppModule — "як підключитися"
  ],
})
export class AppModule {}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // ↑ у UsersModule — "які сутності тут потрібні"
  ],
  providers: [UsersService],
})
export class UsersModule {}
```

Детально сам `TypeOrmModule` і Repository-патерн — окрема майбутня тема.

## 9. `@Global()` — коротке нагадування в контексті модулів

Детально вже розібрано в нотатці про Providers/DI, розділ 11 — тут лише місце в загальній картині: `@Global()` робить `exports` модуля доступними всюди без повторного `imports` — виняток із звичайної інкапсуляції, описаної в розділі 3, тому варто застосовувати його рідко, лише для справді «наскрізних» речей (конфігурація, логер).

## 10. Циклічні залежності між модулями (не між provider'ами)

`forwardRef()` (уже показаний для provider'ів у нотатці про Providers/DI, розділ 12) потрібен також, коли два модулі імпортують один одного:

```typescript
@Module({
  imports: [forwardRef(() => OrdersModule)],
})
export class UsersModule {}

@Module({
  imports: [forwardRef(() => UsersModule)],
})
export class OrdersModule {}
```

Той самий коментар щодо цього як «латки, а не рекомендованого патерна» — нотатка про Providers/DI, розділ 12.

## 11. Testing modules — коротко, для загальної картини

Nest дає окремий API для створення «тестового» модуля, де можна підмінити будь-який реальний provider на мок (той самий принцип `useValue` з нотатки про Providers/DI, розділ 7.1, але через окремий, тестово-орієнтований API):

```typescript
import { Test } from "@nestjs/testing";

const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
})
  .overrideProvider(UsersService)
  .useValue({ findAll: () => [{ id: 1, name: "Test" }] })
  .compile();

const controller = moduleRef.get(UsersController);
// тепер controller.findAll() використовує мок, а не реальний сервіс
```

## Шпаргалка

| Поле/конструкція | Навіщо |
|---|---|
| `controllers` | контролери, що належать цьому модулю |
| `providers` | provider'и, які реєструються (і створюються) у цьому модулі |
| `imports` | інші модулі, чиї `exports` потрібні цьому модулю |
| `exports` | які саме `providers` (або цілі модулі) цей модуль «віддає» іншим |
| `AppModule` | кореневий модуль, який «збирає» усі фіче-модулі разом |
| `@Global()` | експорт доступний скрізь, без повторного `imports` (застосовуй рідко) |
| `forRoot()`/`register()` | dynamic module — глобальна конфігурація, викликається один раз |
| `forFeature()` | dynamic module — локальна реєстрація для конкретного фіче-модуля |
| `forwardRef()` | «обхідний шлях» для циклічних залежностей між модулями |

## Підсумок

- `@Module()` має чотири поля: `controllers`, `providers`, `imports`, `exports` — усі необов'язкові; часто модуль лише «збирає» інші модулі разом (лише `imports`).
- Кожен застосунок має один кореневий `AppModule`, який «збирає» фіче-модулі (`UsersModule`, `OrdersModule`...), кожен з яких відповідає за одну логічну частину домену.
- Кожен модуль має свій «ізольований» DI-контейнер — provider, не експортований явно, невидимий за межами свого модуля, навіть якщо модуль імпортовано в інший (це навмисна інкапсуляція).
- `imports` імпортує весь `exports` модуля цілком, а не окремі provider'и вибірково.
- Повторне імпортування одного й того ж модуля в кількох місцях не створює дублікатів — модуль (і його provider'и) лишається singleton на весь застосунок.
- Модуль може реекспортувати цілий імпортований модуль, «прокидаючи» залежність далі без повторного `imports` у кожному споживачі.
- Dynamic modules (`forRoot()`/`register()`/`forFeature()`) дозволяють передати конфігурацію в модуль у рантаймі — саме на цьому патерні побудовані `TypeOrmModule`/`ConfigModule`/`MongooseModule` з реальної екосистеми Nest.
- `@Global()` і `forwardRef()` — винятки із звичайних правил (інкапсуляція, лінійний граф залежностей), застосовуй їх обережно, а не за замовчуванням.
- `Test.createTestingModule()` дає окремий, тестово-орієнтований спосіб зібрати модуль із підміненими (мок) provider'ами.

## Задачі для закріплення

18 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах усі експорти `@nestjs/common` і `NestFactory` імпортовані, `boot(Module)` запускає застосунок на вільному порту й повертає `{ url, close }`, а `get(url)` повертає `{ status, body }`.

### Рівень 1. Основи

**1.** `exports`: сервіс доступний в іншому модулі лише після експорту.

```ts
const first = (e: any) => String(e.message).split('\n')[0];
@Injectable() class S { v() { return 1; } }
@Module({ providers: [S] }) class Feature {}
@Controller() class C { constructor(private s: S) {} @Get() g() { return this.s.v(); } }
@Module({ imports: [Feature], controllers: [C] }) class App {}
try { await boot(App); } catch (e) { return first(e).slice(0, 70); }
```

**2.** З `exports` той самий приклад працює.

```ts
@Injectable() class S { v() { return 1; } }
@Module({ providers: [S], exports: [S] }) class Feature {}
@Controller() class C { constructor(private s: S) {} @Get() g() { return this.s.v(); } }
@Module({ imports: [Feature], controllers: [C] }) class App {}
const a = await boot(App);
const r = await get(a.url + '/');
await a.close();
return r.body;
```

**3.** Один модуль імпортований у двох місцях: чи створюється його провайдер двічі?

```ts
let created = 0;
@Injectable() class S { constructor() { created++; } }
@Module({ providers: [S], exports: [S] }) class Shared {}
@Module({ imports: [Shared] }) class A {}
@Module({ imports: [Shared] }) class B {}
@Module({ imports: [A, B] }) class Root {}
const a = await boot(Root);
await a.close();
return created;
```

**4.** Інкапсуляція: однакові класи в різних модулях — окремі екземпляри.

```ts
let created = 0;
@Injectable() class S { constructor() { created++; } }
@Module({ providers: [S] }) class A {}
@Module({ providers: [S] }) class B {}
@Module({ imports: [A, B] }) class Root {}
const a = await boot(Root);
await a.close();
return created;
```

**5.** Реекспорт модуля: `exports: [OtherModule]`.

```ts
@Injectable() class S { v() { return 'deep'; } }
@Module({ providers: [S], exports: [S] }) class Inner {}
@Module({ imports: [Inner], exports: [Inner] }) class Mid {}
@Controller() class C { constructor(private s: S) {} @Get() g() { return this.s.v(); } }
@Module({ imports: [Mid], controllers: [C] }) class Root {}
const a = await boot(Root);
const r = await get(a.url + '/');
await a.close();
return r.body;
```

### Рівень 2. Деталі й поведінка

**6.** Динамічний модуль: `forRoot(options)`.

```ts
@Module({}) class ConfigModule { static forRoot(opts: { name: string }): DynamicModule { return { module: ConfigModule, providers: [{ provide: 'OPTS', useValue: opts }], exports: ['OPTS'] }; } }
@Controller() class C { constructor(@Inject('OPTS') private o: any) {} @Get() g() { return this.o.name; } }
@Module({ imports: [ConfigModule.forRoot({ name: 'app-1' })], controllers: [C] }) class Root {}
const a = await boot(Root);
const r = await get(a.url + '/');
await a.close();
return r.body;
```

**7.** `forRoot` двічі з різними опціями: два різних динамічних модуля.

```ts
@Module({}) class M { static forRoot(v: string): DynamicModule { return { module: M, providers: [{ provide: 'V', useValue: v }], exports: ['V'] }; } }
const a = M.forRoot('a'), b = M.forRoot('b');
return [a.module === b.module, (a.providers as any)[0].useValue, (b.providers as any)[0].useValue];
```

**8.** `@Global()` модуль: сервіс доступний без явного імпорту.

```ts
@Injectable() class S { v() { return 'global'; } }
@Global() @Module({ providers: [S], exports: [S] }) class G {}
@Controller() class C { constructor(private s: S) {} @Get() g() { return this.s.v(); } }
@Module({ imports: [G], controllers: [C] }) class Feature {}
@Module({ imports: [G, Feature] }) class Root {}
const a = await boot(Root);
const r = await get(a.url + '/');
await a.close();
return r.body;
```

**9.** Метадані модуля: `@Module` зберігає поля через `Reflect`.

```ts
@Injectable() class S {}
@Controller() class C {}
@Module({ providers: [S], controllers: [C], exports: [S] }) class M {}
return [Reflect.getMetadata('providers', M).length, Reflect.getMetadata('controllers', M)[0] === C, Reflect.getMetadata('exports', M).length, Reflect.getMetadata('imports', M)];
```

**10.** Циклічна залежність між провайдерами: помилка і розв'язання через `forwardRef`.

```ts
const first = (e: any) => String(e.message).split('\n')[0];
@Injectable() class A { constructor(@Inject(forwardRef(() => B)) public b: any) {} }
@Injectable() class B { constructor(@Inject(forwardRef(() => A)) public a: any) {} }
@Module({ providers: [A, B] }) class M {}
const app = await boot(M);
const a = app.app.get(A);
const ok = a.b instanceof B && a.b.a === a;
await app.close();
return ok;
```

### Рівень 3. Нюанси та пастки

**11.** Без `forwardRef` циклічні залежності призводять до помилки.

```ts
const first = (e: any) => String(e.message).split('\n')[0];
@Injectable() class A { constructor(public b: B) {} }
@Injectable() class B { constructor(public a: A) {} }
@Module({ providers: [A, B] }) class M {}
try { await boot(M); } catch (e) { return first(e).slice(0, 80); }
```

**12.** `Test.createTestingModule` та підміна провайдера.

```ts
@Injectable() class Mail { send() { return 'real'; } }
@Injectable() class Svc { constructor(private m: Mail) {} run() { return this.m.send(); } }
const mod = await Test.createTestingModule({ providers: [Svc, Mail] }).overrideProvider(Mail).useValue({ send: () => 'mock' }).compile();
return mod.get(Svc).run();
```

**13.** Отримання провайдера за класом із застосунку: `app.get`.

```ts
@Injectable() class S { id = 5; }
@Module({ providers: [S] }) class M {}
const a = await boot(M);
const id = a.app.get(S).id;
await a.close();
return id;
```

**14.** Кореневий модуль і дерево імпортів: скільки модулів у графі?

```ts
@Module({}) class A {}
@Module({ imports: [A] }) class B {}
@Module({ imports: [A, B] }) class Root {}
const a = await boot(Root);
const n = [...(a.app as any).container.getModules().values()].length;
await a.close();
return n;
```

**15.** Для чого поле `exports` у `@Module`?

### Рівень 4. Практика

**16.** Чим `forRoot` відрізняється від `forFeature`?

**17.** Коли використовувати `@Global()`?

**18.** Що таке динамічний модуль?

### Відповіді

1. `'Nest can't resolve dependencies of the C (?). Please make sure that th'`
2. `'1'`
3. `1`
4. `2`
5. `'deep'`
6. `'app-1'`
7. `[true, 'a', 'b']`
8. `'global'`
9. `[1, true, 1, undefined]`
10. `true`
11. `ReferenceError: Cannot access 'B' before initialization`
12. `'mock'`
13. `5`
14. `4`
15. Робить провайдери доступними модулям, що імпортують цей модуль; без експорту провайдер лишається приватним для свого модуля
16. `forRoot` налаштовує модуль один раз на рівні застосунку (з'єднання, конфіг); `forFeature` реєструє частину конфігурації для окремого фіче-модуля (наприклад, сутності)
17. Для рідкісних наскрізних модулів (конфіг, логер), щоб не імпортувати їх у кожний модуль; надмірне застосування ховає залежності
18. Модуль, що повертає опис (`DynamicModule`) залежно від параметрів, зазвичай статичним методом `forRoot`/`register`
