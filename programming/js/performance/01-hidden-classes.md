# V8: Hidden Classes (Shapes) та узгодженість форми об'єкта

## Загальна ідея

Hidden Classes (у сучасному V8 їх називають Shapes) — внутрішня оптимізація, яка дозволяє рушію дуже швидко звертатись до властивостей об'єкта. Це одна з найважливіших оптимізацій V8, бо вона стосується майже кожного об'єкта, який ти створюєш.

Основне правило: ініціалізуй усі властивості при створенні об'єкта. Ніколи не додавай і не видаляй властивості динамічно після створення.

## 1. Проблема, яку вирішують hidden classes

### 1.1. Без оптимізацій: словниковий пошук

Уяви, що ти — рушій V8. Користувач пише:

```js
const person = { name: "Alice", age: 30 };
console.log(person.name); // "Alice" — але як знайти "name"?
```

Без оптимізацій довелося б зберігати словник (dictionary) прямо всередині об'єкта:

```text
person = {
  dict: {
    "name": адреса Z (зберігає "Alice"),
    "age":  адреса W (зберігає 30)
  }
}
```

Кожен доступ `person.name` виконував би: подивись у `__dict__` → знайди ключ `"name"` → дістань адресу Z → прочитай значення. Це `O(log n)` або навіть `O(n)` операція. При мільйонах доступів — дуже повільно.

### 1.2. Спостереження V8: більшість об'єктів однієї «форми»

```js
const person1 = { name: "Alice", age: 30 };
const person2 = { name: "Bob", age: 25 };
const person3 = { name: "Carol", age: 35 };
```

Усі три об'єкти мають одні й ті ж властивості в одному й тому ж порядку: спершу `name`, потім `age`. Це можна використати для оптимізацій.

## 2. Ідея hidden classes

Замість зберігати словник у кожному об'єкті, V8 витягує опис форми в окремий, спільний об'єкт — Hidden Class (Shape):

```text
Hidden Class A:
┌─────────────────┐
│ name: String     │  offset: +8 bytes
│ age: Number      │  offset: +16 bytes
└─────────────────┘
person1 → [Shape: A] → { "Alice", 30 }
person2 → [Shape: A] → { "Bob", 25 }
person3 → [Shape: A] → { "Carol", 35 }
```

Тепер доступ `person1.name`:

- **без оптимізації:** `lookup("name")` у словнику → адреса → значення (`O(log n)`, повільно);
- **з hidden class:** `offset = Shape.getOffset("name")` (= 8, один раз, потім кешується) → `value = memory[person_address + 8]` (`O(1)`, швидко).

Це змінює `O(log n)` на `O(1)`.

## 3. Детальна механіка offset

### 3.1. Що таке offset

Offset — це відстань у байтах від початку об'єкта до властивості.

```text
Адреса пам'яті:    Вміст:
0x1000            [Object Header - 8 байтів]
0x1008            [name value - 8 байтів]
0x1010            [age value - 8 байтів]
0x1018            [salary value - 8 байтів]
```

Offset відраховується від адреси об'єкта: властивість «name» за адресою `0x1008` → offset = `0x1008 - 0x1000` = 8; властивість «age» за адресою `0x1010` → offset = 16; властивість «salary» за адресою `0x1018` → offset = 24.

### 3.2. Чому offset 8, 16, 24

На 64-бітних системах (ARM64, x86-64) кожне значення займає 8 байтів: SMI (Small Integer), Double (число), String (вказівник), Boolean, Object/Array ref — усі по 8 байтів.

```text
┌───────────────────┐
│ HEADER (offset 0) │ ← Map pointer (вказівник на Shape) + GC-метадані
└───────────────────┘
┌─────────────────┐
│ PROPERTY 1       │ ← offset 8  (перша властивість)
└─────────────────┘
┌─────────────────┐
│ PROPERTY 2       │ ← offset 16 (друга властивість)
└─────────────────┘
┌─────────────────┐
│ PROPERTY 3       │ ← offset 24 (третя властивість)
└─────────────────┘
```

Чому не з offset 0? Бо offset 0 зайнятий заголовком (Map pointer, GC info). Перша властивість завжди починається з offset 8.

### 3.3. На рівні асемблера (ARM64)

Коли V8 генерує машинний код, це виглядає так:

```asm
; person у регістрі x0
; отримати значення name по offset 8
ldr x1, [x0, #8]  ; завантаж значення з адреси (x0 + 8) у x1
ret               ; повернись (результат у x1)
```

Це дуже швидко — один процесорний такт (детально про регістри й асемблер ARM64 — нотатка `programming/assembly/arm64/arm64.md`).

## 4. Як V8 будує hidden classes (transition chain)

Коли V8 бачить новий об'єкт, він будує Shape через «ланцюг переходів» (transition chain):

```js
const obj = {};
// Крок 1: Shape0: {} (порожня форма)

obj.x = 10;
// Крок 2: додано властивість x → Shape0 → Shape1: { x (offset 8) }

obj.y = 20;
// Крок 3: додано властивість y → Shape1 → Shape2: { x (offset 8), y (offset 16) }

obj.z = 30;
// Крок 4: додано властивість z → Shape2 → Shape3: { x (offset 8), y (offset 16), z (offset 24) }
```

Це важливо: V8 будує це як ланцюг. Кожна нова властивість = новий Shape. `obj`: Shape0 → Shape1 → Shape2 → Shape3.

## 5. Inline caching і «дізнавання» форм

Коли ти пишеш функцію:

```js
function getName(obj) {
  return obj.name;
}
```

V8 не знає заздалегідь, яку форму матиме `obj`. Тому при першому виклику: подивись на об'єкт і його Shape → знайди offset для `"name"` у цьому Shape → запам'ятай цей Shape + offset у Inline Cache.

```js
const shapeAPerson1 = { name: "Alice", age: 30 };
getName(shapeAPerson1); // V8: "бачу Shape A, name на offset 8" → кешується: Shape A → offset 8

const shapeAPerson2 = { name: "Bob", age: 25 };
getName(shapeAPerson2); // V8: "чи person2 має Shape A? Так! використай кеш" — дуже швидко
```

Але що якщо порядок властивостей інший:

```js
const shapeBPerson = { age: 30, name: "Dave" }; // інший порядок! → інший Shape
getName(shapeBPerson);
// Cache miss! shapeBPerson має Shape B, а не Shape A.
// V8 тепер розширює Inline Cache:
//   Inline Cache для getName:
//     Shape A → offset 8 ✓
//     Shape B → offset 8 ✓ (у Shape B name якраз на offset 8, бо age перше)
```

Це називається polymorphic inline cache — кеш пам'ятає кілька Shapes.

## 6. Мегаморфізм — крах оптимізацій

V8 не може пам'ятати безмежно. Inline Cache має ліміт (зазвичай 4 записи).

```js
function getX(obj) {
  return obj.x;
}

const megaObj1 = { x: 1, y: 2 };            // Shape A
const megaObj2 = { y: 2, x: 1 };            // Shape B (інший порядок)
const megaObj3 = { x: 1, y: 2, z: 3 };      // Shape C (додатковий z)
const megaObj4 = { x: 1 };                   // Shape D (без y)
const megaObj5 = { a: 1, x: 2, b: 3 };      // Shape E (інші властивості)

getX(megaObj1); // Cache: [A → 8]
getX(megaObj2); // Cache: [A → 8, B → 8]
getX(megaObj3); // Cache: [A → 8, B → 8, C → 8]
getX(megaObj4); // Cache: [A → 8, B → 8, C → 8, D → 8]
getX(megaObj5); // ❌ переповнення кешу! 5-й Shape — V8: "забудь про
                //     детальний кеш, просто інтерпретуй" → megamorphic-режим
```

У megamorphic-режимі замість `if (shape === A) { return [addr + 8]; } else if (shape === B) { ... }` V8 робить `lookup(obj, "x")` у загальній таблиці — це набагато повільніше.

### 6.1. На рівні асемблера

Monomorphic-код (одна форма) — дві інструкції, один такт:

```asm
ldr x1, [x0, #8]  ; просто прочитай по offset 8
ret
```

Megamorphic-код (багато форм) — перевірка, розгалуження і, у гіршому випадку, виклик повільної функції на 30+ інструкцій:

```asm
ldr x1, [x0]              ; завантаж Shape
movz x2, 0x12345678       ; очікуваний Shape
cmp x1, x2                ; порівняй
bne .slow_path            ; якщо не підходить — повільний шлях
ldr x0, [x0, #8]          ; прочитай
ret
.slow_path:
bl GetPropertySlow        ; виклич функцію (дуже повільно, 30+ інструкцій)
ret
```

## 7. Практичні приклади

### 7.1. Порядок властивостей має значення

```js
function createPersonA(name, age, email) {
  return { name, age, email }; // Shape 1: { name, age, email }
}
function createPersonB(name, age, email) {
  return { email, name, age }; // Shape 2: { email, name, age } — інший порядок!
}
function displayPerson(person) {
  return person.name + " (" + person.age + ")";
}

const orderP1 = createPersonA("Alice", 30, "alice@example.com");
const orderP2 = createPersonB("Bob", 25, "bob@example.com");

displayPerson(orderP1); // Shape 1
displayPerson(orderP2); // Shape 2 ← інша форма! Cache miss, megamorphic-операція
```

Чому це проблема: V8 компілює `displayPerson` під форму `{ name, age, email }` і кешує `offset name=8, age=16`. Коли приходить об'єкт з іншим порядком, offset змінюються (у Shape 2: `name=24, age=8`) — кеш неточний → cache miss → повільніше.

### 7.2. Динамічне додавання властивостей

```js
// ❌ Погано:
const userDynamic = { name: "Alice" };
userDynamic.email = "alice@example.com"; // shape change!
userDynamic.age = 30;                     // shape change!
// user змінив Shape тричі: {} → {name} → {name, email} → {name, email, age}
// будь-який код, оптимізований під {name}, тепер невалідний
```

```js
// ✅ Добре:
const userStatic = {
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  // усі властивості ініціалізовані в одному об'єкті одразу
};
// userStatic має одну, стабільну форму із самого початку
```

### 7.3. Типи властивостей теж мають значення

```js
// ❌ Нестійкість типу:
const obj1Unstable = { value: 10 }; // value: SMI (Small Integer)
function process(obj) {
  return obj.value * 2;
}
process(obj1Unstable); // спершу V8 бачить число, компілює під SMI
obj1Unstable.value = 3.14; // тип змінився на Double → shape change!
process(obj1Unstable); // cache miss! obj.value тепер Double — деоптимізація
```

```js
// ✅ Консистентні типи:
const consistentObj = { value: 10, multiplier: 2 };
consistentObj.value = 20;      // усе ще число, форма не змінюється
consistentObj.multiplier = 3;  // усе ще число, форма не змінюється

// якщо потрібні різні типи — використовуй окремі властивості:
const mixed = {
  count: 0,      // number
  status: "",    // string
  active: false, // boolean
};
```

## 8. Класи проти літералів — що надійніше гарантує форму

Класи гарантують консистентну форму краще, ніж «вільні» літерали:

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
const classPoint1 = new Point(1, 2); // Shape: { x, y }
const classPoint2 = new Point(3, 4); // Shape: { x, y } — гарантовано одна й та сама!

// літерали (потенційно різні форми, якщо порядок написання відрізняється):
const literalPoint1 = { x: 1, y: 2 };
const literalPoint2 = { y: 2, x: 1 }; // можливо, інша форма!
```

Якщо класи не використовуєш (React/Vue) — використовуй фабричні функції для консистентного порядку:

```js
function createPoint(x, y) {
  return { x, y }; // завжди той самий порядок
}
const factoryPoint1 = createPoint(1, 2);
const factoryPoint2 = createPoint(3, 4);
```

## 9. Контекст-специфічні приклади

### 9.1. Чистий JavaScript

```js
// ❌ Неправильно:
function createUserBad() {
  const user = { name: "Alice" };
  user.email = "alice@example.com";
  user.phone = "123-456";
  return user;
}

// ✅ Правильно: фабрична функція з усіма полями одразу
function createUser(name, email = "", phone = "") {
  return { name, email, phone };
}
const goodUser = createUser("Alice", "alice@example.com", "123-456");
```

### 9.2. Vue (Composition API) — псевдокод (потребує Vue-рантайму)

```js
import { reactive } from "vue";

// ❌ Неправильно:
const state = reactive({ user: { name: "Alice" } });
state.user.email = "alice@example.com"; // shape change!

// ✅ Правильно:
function useUser() {
  const state = reactive({
    user: { name: "Alice", email: "", phone: "" },
  });
  return { state };
}
```

### 9.3. React (Hooks) — псевдокод (потребує React-рантайму)

```jsx
// ❌ Неправильно:
const [user, setUser] = useState({ name: "Alice" });
const loadUser = async (id) => {
  const data = await fetch(`/api/users/${id}`);
  const json = await data.json();
  setUser((prev) => ({ ...prev, email: json.email, phone: json.phone })); // shape change!
};

// ✅ Правильно:
const [user, setUser] = useState({ name: "", email: "", phone: "" });
const loadUser = useCallback(async (id) => {
  const data = await fetch(`/api/users/${id}`);
  const json = await data.json();
  setUser({ name: json.name, email: json.email, phone: json.phone });
}, []);
```

## 10. Реальний бенчмарк

```js
const { performance } = require("perf_hooks");

// ❌ Нестійкі об'єкти (динамічні форми)
function createUnstableObject() {
  const o = {};
  o.a = 1;
  o.b = 2;
  o.c = 3;
  return o;
}

// ✅ Стійкі об'єкти (фіксована форма)
function createStableObject() {
  return { a: 1, b: 2, c: 3 };
}

function sumProperties(obj) {
  return obj.a + obj.b + obj.c;
}

console.log("Unstable objects:");
const unstableArr = [];
for (let i = 0; i < 100000; i++) {
  unstableArr.push(createUnstableObject());
}
let t0 = performance.now();
for (let i = 0; i < 10000000; i++) {
  sumProperties(unstableArr[i % unstableArr.length]);
}
console.log(`Time: ${(performance.now() - t0).toFixed(2)}ms`);

console.log("\nStable objects:");
const stableArr = [];
for (let i = 0; i < 100000; i++) {
  stableArr.push(createStableObject());
}
t0 = performance.now();
for (let i = 0; i < 10000000; i++) {
  sumProperties(stableArr[i % stableArr.length]);
}
console.log(`Time: ${(performance.now() - t0).toFixed(2)}ms`);
```

⚠️ **Чесний результат виконання** (Node.js v24, V8 сучасної версії): на цій машині різниця виявилась мінімальною або взагалі відсутньою (~17–22мс для обох варіантів, кілька прогонів поспіль) — на відміну від популярного твердження про різницю в 9 разів. Це не означає, що механізм hidden classes/shapes вигаданий: він задокументований самою командою V8 і реальний. Але конкретна величина ефекту сильно залежить від версії рушія, точного патерну коду й того, чи взагалі JIT встигає дійти до оптимізованого рівня в межах цього мікробенчмарка. Сучасний V8 з часом навчився краще справлятися саме з цим найпростішим випадком (три числові властивості). Висновок: не покладайтеся на конкретні цифри з застарілих статей — перевіряйте на власному рушії, а сам принцип (уникати зміни форми й типу властивостей) лишається доброю практикою, особливо для великих масивів однотипних об'єктів і гарячих функцій із поліморфними формами.

## 11. Як побачити hidden classes наживо

### 11.1. У Chrome DevTools

1. Відкрий DevTools (F12).
2. Перейди в Console.
3. Введи ім'я об'єкта (наприклад, `p`).
4. Розгорни об'єкт.
5. Подивись на `[[Prototype]]` чи іншу shape-інформацію в деталях.

### 11.2. У Node.js з `--trace-ic`

```bash
node --trace-ic myfile.js 2>&1 | head -50
```

Результат приблизно такий:

```text
[VariableObject 0x1234: property_load x → SMI/FAST]
[VariableObject 0x1234: property_load y → SMI/FAST]
[VariableObject 0x5678: megamorphic_store value]
```

### 11.3. Через `--prof` та tick processor

```bash
node --prof myfile.js         # створить v8.log
node --prof-process v8.log | head -100
```

Покаже, де V8 megamorphic, а де оптимізовано.

## Підсумок

- Hidden Class (Shape) — опис структури об'єкта, який V8 використовує для оптимізації доступу до властивостей: замість словника — offset.
- Offset — байтова позиція властивості в пам'яті (на 64-бітних системах зазвичай 8, 16, 24 ... байтів; offset 0 зайнятий заголовком).
- Кожна нова властивість, додана після створення об'єкта, створює новий Shape в ланцюжку transition chain.
- Inline Cache запам'ятовує, яку форму очікує функція, і кешує offset; polymorphic IC пам'ятає до ~4 форм.
- Megamorphism (>4 форм) = крах оптимізацій — V8 падає до словникового пошуку.
- Практичні правила: ініціалізуй усі властивості одразу при створенні об'єкта; дотримуйся одного порядку властивостей для однотипних об'єктів; уникай динамічного додавання/видалення властивостей; уникай зміни типу вже наявної властивості; для масивів об'єктів — одна консистентна форма для всіх елементів; класи гарантують стабільну форму краще за «вільні» літерали, а без класів — фабричні функції.
- Величина реального ефекту сильно залежить від версії V8 і конкретного бенчмарка — перевіряйте самостійно, не покладайтесь на конкретні цифри з чужих матеріалів (розділ 10).

## Чекліст перед написанням коду

- [ ] Чи ініціалізую я всі властивості об'єкта при створенні?
- [ ] Чи додаю я властивості динамічно пізніше?
- [ ] Чи дотримуюсь я одного порядку властивостей?
- [ ] Чи змінюю я тип властивості (число → рядок)?
- [ ] Чи масив об'єктів має консистентну структуру?
