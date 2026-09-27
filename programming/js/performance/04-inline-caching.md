# V8: inline caching і передбачуваність форм

## Загальна ідея

V8 запам'ятовує, яку форму об'єкта очікує функція, і кешує доступ до властивостей (детально механіка Shape/offset розібрана в нотатці про hidden classes). Якщо форми непередбачувані — кеш розширюється і стає неефективним.

Основне правило: функція повинна очікувати один набір типів об'єктів. Уникай мегаморфізму (>4 різних форм).

## 1. Як працює inline cache (IC) — короткий повтор механіки

Коли функція звертається до `obj.prop`, V8 не хоче щоразу шукати offset властивості «з нуля» — натомість кешує пару (Shape → offset) прямо в місці виклику (тому і «inline» — кеш «вбудований» у сам байткод виклику, а не десь окремо):

```js
function getX(obj) {
  return obj.x;
}

// перший виклик — V8 "вчиться":
getX({ x: 1, y: 2 }); // Shape 1 → x на offset 8. Записано в IC: [Shape1 → 8]

// другий виклик з тією ж формою — IC "влучає" (cache hit), швидко:
getX({ x: 3, y: 4 }); // Shape 1 знову → офсет береться з кешу, без пошуку
```

## 2. Мономорфний, поліморфний, мегаморфний IC — стани кешу

**Monomorphic IC (1 форма в кеші) — найшвидший стан:**

```js
function getXMono(obj) {
  return obj.x;
}
const createPoint = (x, y) => ({ x, y }); // завжди той самий порядок → та сама форма
getXMono(createPoint(1, 2));
getXMono(createPoint(3, 4));
getXMono(createPoint(5, 6));
// V8 бачить завжди одну форму → IC monomorphic → максимально швидкий шлях
```

**Polymorphic IC (2–4 форми в кеші) — досі прийнятно:**

```js
getXMono({ x: 1, y: 2 });      // Shape A
getXMono({ y: 2, x: 1 });      // Shape B — інший порядок! IC розширюється до [A, B]
// V8 перевіряє форму по черзі серед запам'ятованих (до 4) — усе ще
// швидко, але вже трохи більше інструкцій, ніж monomorphic
```

**Megamorphic IC (>4 форм) — крах оптимізацій:**

```js
function getXMega(obj) {
  return obj.x;
}
getXMega({ x: 1, y: 2 });          // Shape A
getXMega({ y: 2, x: 1 });          // Shape B
getXMega({ x: 1, y: 2, z: 3 });    // Shape C
getXMega({ x: 1 });                // Shape D
getXMega({ a: 1, x: 2, b: 3 });    // Shape E ← megamorphic!
// V8: "забудь про детальний кеш, просто інтерпретуй" — lookup(obj, "x")
// у загальній таблиці замість прямого offset — значно повільніше
```

## 3. Чому це насправді важливо: IC — основа багатьох інших оптимізацій

Inline Caching — це «клей», що зв'язує hidden classes (форма об'єкта) з реальним машинним кодом доступу до властивості. Саме через IC:

- property access стає `O(1)` замість `O(log n)`/`O(n)`;
- TurboFan може інлайнити доступ до властивості прямо в код функції, якщо впевнений (monomorphic), що форма завжди одна й та сама;
- будь-яка нестабільність форми зменшує ефективність IC пропорційно до кількості різних форм, що проходять через один і той самий виклик властивості.

## Правила для передбачуваних IC

### Правило 1: одна «фабрика» на один тип об'єкта

```js
// ❌ Неправильно: різні функції створюють об'єкти з різним порядком
// властивостей, а потім усі проходять через одну функцію-споживач:
function createUserA(name, age) {
  return { name, age };
}
function createUserB(name, age) {
  return { age, name }; // інший порядок → інша форма!
}
function greetUser(user) {
  return `Hello, ${user.name}!`;
}
greetUser(createUserA("Irene", 30)); // Shape A
greetUser(createUserB("Oleg", 25));  // Shape B ← IC розширюється
```

```js
// ✅ Правильно: одна фабрика гарантує одну форму для всіх користувачів
function createUser(name, age) {
  return { name, age };
}
greetUser(createUser("Irene", 30));
greetUser(createUser("Oleg", 25));
// обидва виклики — Shape A → IC лишається monomorphic
```

### Правило 2: не змінюй набір/тип властивостей після створення

(Детально в нотатці про hidden classes — тут коротко в контексті IC: кожна зміна форми після створення — це новий Shape, і функції, які вже кешували стару форму, отримають cache miss на цьому об'єкті.)

### Правило 3: обмежуй кількість «форм», що проходять через одну функцію

Якщо функція принципово повинна працювати з різними типами об'єктів (>4 форм) — розглянь розділення на кілька спеціалізованих функцій замість однієї «універсальної», яка неминуче стане megamorphic.

```js
// ❌ Одна універсальна функція для геометричних фігур різної форми:
function getAreaBad(shape) {
  if (shape.kind === "circle") return Math.PI * shape.radius ** 2;
  if (shape.kind === "rectangle") return shape.width * shape.height;
  if (shape.kind === "triangle") return 0.5 * shape.base * shape.height;
  // ще 2+ форми — і getAreaBad стає megamorphic
}
```

```js
// ✅ Спеціалізовані функції для кожної форми — кожна лишається monomorphic:
function getCircleArea(circle) {
  return Math.PI * circle.radius ** 2;
}
function getRectangleArea(rect) {
  return rect.width * rect.height;
}
function getTriangleArea(triangle) {
  return 0.5 * triangle.base * triangle.height;
}
```

## Вплив на продуктивність — бенчмарк

```js
const { performance } = require("perf_hooks");

function readX(obj) {
  return obj.x;
}

// monomorphic: 100000 об'єктів, усі однієї форми
const monoObjects = Array.from({ length: 100000 }, () => ({ x: 1, y: 2 }));
let t0 = performance.now();
for (let i = 0; i < 10000000; i++) {
  readX(monoObjects[i % monoObjects.length]);
}
console.log(`Monomorphic IC:  ${(performance.now() - t0).toFixed(0)}ms`);

// megamorphic: 100000 об'єктів, чергуються 5 різних форм
const megaObjects = Array.from({ length: 100000 }, (_, i) => {
  const variant = i % 5;
  if (variant === 0) return { x: 1, y: 2 };
  if (variant === 1) return { y: 2, x: 1 };
  if (variant === 2) return { x: 1, y: 2, z: 3 };
  if (variant === 3) return { x: 1 };
  return { a: 1, x: 2, b: 3 };
});
t0 = performance.now();
for (let i = 0; i < 10000000; i++) {
  readX(megaObjects[i % megaObjects.length]);
}
console.log(`Megamorphic IC:  ${(performance.now() - t0).toFixed(0)}ms`);
```

**Реальний вимір** (Node.js v24): `Monomorphic IC: 17ms`, `Megamorphic IC: 39ms` — на цьому конкретному прогоні різниця приблизно у 2.3 рази. На відміну від деяких сусідніх нотаток (hidden classes, стабільність типів, escape analysis), тут ефект справді відтворюється на сучасному рушії, хоч і не в тому масштабі, що вказано в різних застарілих джерелах (там часто фігурують оцінки в 10–20 разів для мегаморфного доступу). Конкретна цифра залежить від версії V8 і заліза, але напрям завжди той самий: монофорфний доступ швидший за мегаморфний.

## Підсумок

- Inline Cache (IC) — механізм, що запам'ятовує, яку форму (Shape) очікує конкретне місце виклику `obj.prop`, і кешує offset для неї.
- Monomorphic IC (1 форма) — найшвидший стан, дає V8 змогу навіть інлайнити доступ до властивості прямо в машинний код.
- Polymorphic IC (2–4 форми) — досі прийнятно, V8 перевіряє форми по черзі серед невеликого списку запам'ятованих.
- Megamorphic IC (>4 форм) — крах: V8 переходить на повільніший, загальний lookup замість прямого offset.
- IC — це та причина, чому hidden classes (форма об'єкта) настільки важливі: саме IC перетворює стабільну форму на реальний приріст швидкості коду.

**Практичні правила:**

- використовуй одну фабричну функцію/клас для кожного типу об'єкта, щоб гарантувати однакову форму всюди, де цей тип споживається;
- не змінюй набір чи типи властивостей об'єкта після його створення;
- якщо функція принципово повинна обробляти багато різних форм — розділяй її на спеціалізовані функції під кожну форму окремо.
