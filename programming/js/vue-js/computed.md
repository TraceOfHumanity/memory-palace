# Vue.js: `computed`

## Загальна характеристика

`computed` — це **похідне реактивне значення**: воно обчислюється з інших реактивних джерел (`reactive`, `ref`) і автоматично оновлюється, коли ці джерела змінюються. Три властивості відрізняють його від звичайної функції чи методу:

1. **Лінивість (lazy).** Функція-обчислювач (getter) не виконується, доки хтось не прочитає `.value`.
2. **Кешування.** Повторне читання `.value` не перераховує значення, якщо залежності не змінювалися: повертається збережений результат.
3. **Відстеження залежностей.** Vue сам визначає, які реактивні властивості прочитав getter, і перераховує значення лише тоді, коли змінюється одна з них, а не будь-що в компоненті.

У компоненті з `<script setup>` це виглядає так:

```vue
<script setup>
import { reactive, computed } from "vue";

const state = reactive({ price: 100, qty: 2 });
const total = computed(() => state.price * state.qty);
</script>

<template>
  <p>{{ total }}</p>
</template>
```

## Як запускати приклади

Приклади цієї нотатки виконуються в звичайному Node.js, без браузера й `.vue`-файлів. Для цього використано пакет `@vue/reactivity` — той самий реактивний рушій, на якому побудований Vue 3 (`computed()` у пакеті `vue` є реекспортом звідси). Тому поведінка (кешування, лінивість, відстеження залежностей) тут справжня, а не змодельована.

```bash
npm install --save-dev @vue/reactivity
```

У реальному проєкті імпорт виглядає так: `import { reactive, computed } from "vue"`. Усі блоки коду нижче, склеєні по порядку, утворюють один робочий скрипт.

```js
const { reactive, computed, effect } = require("@vue/reactivity");
```

## 1. Проблема: метод перераховує значення щоразу

Якщо `total` — звичайна функція, вона виконується **при кожному виклику**, навіть коли `price` і `qty` не змінювалися:

```js
const stateBad = reactive({ price: 100, qty: 2 });

let methodCalls = 0;
function totalMethod() {
  methodCalls++;
  return stateBad.price * stateBad.qty;
}

console.log(totalMethod(), totalMethod(), totalMethod()); // 200 200 200
console.log(methodCalls); // 3 — порахувало тричі, хоча дані не змінювалися
```

У шаблоні компонента метод викликається на **кожен перерендер**, навіть якщо змінилося щось зовсім інше. Для дорогих обчислень (сортування великого масиву, фільтрація) це прямі втрати продуктивності.

## 2. Кешування результату

```js
const state = reactive({ price: 100, qty: 2 });

let computeCount = 0;
const total = computed(() => {
  computeCount++;
  return state.price * state.qty;
});

console.log(total.value); // 200
console.log(total.value); // 200
console.log(total.value); // 200
console.log(computeCount); // 1 — getter виконався лише раз, решта читань — з кешу

state.qty = 3; // змінили залежність
console.log(total.value); // 300 — перераховано
console.log(computeCount); // 2

console.log(total.value); // 300 — знову з кешу
console.log(computeCount); // 2 — не змінилося
```

## 3. Лінивість

Обчислювач не виконується, поки значення не запитано. Навіть якщо залежності змінювалися, але ніхто не читав `computed`, перерахунку не буде:

```js
let lazyCalls = 0;
const neverRead = computed(() => {
  lazyCalls++;
  return state.price * 100;
});

state.price = 999; // змінили залежність computed, який ніхто не читає
console.log(lazyCalls); // 0 — getter жодного разу не викликався

console.log(neverRead.value); // 99900 — обчислено при першому читанні
console.log(lazyCalls); // 1
state.price = 100; // повертаємо для наступних прикладів
```

## 4. Відстеження залежностей

Vue будує граф залежностей під час **першого виконання** getter'а: реагувати на зміни буде лише ті властивості, які він справді прочитав.

```js
const cart = reactive({ price: 100, qty: 2, note: "терміново" });

let priceOnlyCalls = 0;
// getter звертається лише до price — note не є його залежністю
const priceLabel = computed(() => {
  priceOnlyCalls++;
  return `${cart.price} грн`;
});

console.log(priceLabel.value); // 100 грн
console.log(priceOnlyCalls); // 1

cart.note = "не терміново"; // змінили властивість, яку computed не читає
console.log(priceLabel.value); // 100 грн — той самий кеш
console.log(priceOnlyCalls); // 1 — не перераховано

cart.price = 150; // а тепер змінили те, що computed справді використовує
console.log(priceLabel.value); // 150 грн
console.log(priceOnlyCalls); // 2
```

Це головна перевага порівняно з підходом «перерахувати все в одному `watch` чи методі».

## 5. Умовні залежності

Набір залежностей може **змінюватися між перерахунками**. Гілка, яка не виконувалася, не створює залежностей:

```js
const toggle = reactive({ useDiscount: false, price: 100, discountPrice: 80 });

let condCalls = 0;
const finalPrice = computed(() => {
  condCalls++;
  // при useDiscount = false властивість discountPrice взагалі не читається,
  // тому computed на неї поки не підписаний
  return toggle.useDiscount ? toggle.discountPrice : toggle.price;
});

console.log(finalPrice.value); // 100
console.log(condCalls); // 1

toggle.discountPrice = 70; // ще не залежність: гілка не виконувалась
console.log(finalPrice.value); // 100 — не перераховано
console.log(condCalls); // 1

toggle.useDiscount = true; // тепер price перестає бути залежністю...
console.log(finalPrice.value); // 70
console.log(condCalls); // 2

toggle.price = 999; // ...і зміна price більше не впливає на результат
console.log(finalPrice.value); // 70 — той самий кеш
console.log(condCalls); // 2 — не перераховано: ця гілка вже не читає price
```

## 6. Записуваний `computed`: `get` і `set`

`computed(fn)` доступний лише для читання. Щоб дозволити запис, передають об'єкт `{ get, set }`. Типовий приклад — розкласти одне значення на кілька реактивних джерел, наприклад повне ім'я на ім'я та прізвище:

```js
const person = reactive({ firstName: "Оля", lastName: "Коваль" });

const fullName = computed({
  get() {
    return `${person.firstName} ${person.lastName}`;
  },
  set(value) {
    [person.firstName, person.lastName] = value.split(" ");
  },
});

console.log(fullName.value); // Оля Коваль
fullName.value = "Марія Петренко"; // виклик set()
console.log(person.firstName, person.lastName); // Марія Петренко
console.log(fullName.value); // Марія Петренко — get() перерахував з нових даних

total.value = 500; // спроба запису в computed без set (розділ 2)
// [Vue warn] Write operation failed: computed value is readonly
// Помилка не кидається: це лише попередження в консоль, а присвоєння
// ігнорується, значення лишається як було
console.log(total.value); // 300
```

Зверніть увагу: запис у `computed`, що має лише getter, **не кидає виняток**. Vue виводить попередження (у режимі розробки), а значення не змінюється.

## 7. Ланцюжки: `computed` залежить від іншого `computed`

```js
const order = reactive({ price: 200, qty: 3, taxRate: 0.2 });

const subtotal = computed(() => order.price * order.qty); // 1-й рівень
const tax = computed(() => subtotal.value * order.taxRate); // залежить від computed
const grandTotal = computed(() => subtotal.value + tax.value); // залежить від двох

console.log(subtotal.value, tax.value, grandTotal.value); // 600 120 720

order.qty = 5;
console.log(subtotal.value, tax.value, grandTotal.value); // 1000 200 1200
```

Зміна одного кореневого джерела коректно проходить крізь увесь ланцюжок: Vue перебудовує залежності на кожному рівні автоматично.

## 8. `computed` як залежність `effect`: модель рендеру

У реальному компоненті шаблон — це по суті `effect`, який перезапускається, коли змінюється щось реактивне, прочитане під час рендеру. Порівняємо, скільки разів «рендериться» кожен варіант:

```js
const shop = reactive({ price: 10, qty: 1, theme: "dark" }); // theme не бере участі в total

let computedRenders = 0;
const shopTotal = computed(() => shop.price * shop.qty);
effect(() => {
  computedRenders++;
  shopTotal.value; // «шаблон» читає computed
});

let methodRenders = 0;
effect(() => {
  methodRenders++;
  shop.theme; // «шаблон» читає theme напряму
});

console.log(computedRenders, methodRenders); // 1 1 — початковий запуск

shop.theme = "light"; // змінили те, що не впливає на shopTotal
console.log(computedRenders, methodRenders); // 1 2 — перезапустився лише другий effect

shop.qty = 2; // змінили залежність computed
console.log(computedRenders, methodRenders); // 2 2 — перезапустився лише перший
```

## 9. Пастки

### 9.1. Побічні ефекти в getter'і

`computed` має бути **чистою функцією**: лише читати реактивні дані й повертати значення. Мутація стану всередині getter'а технічно не кидає помилки, але порушує модель «похідної величини»; у режимі розробки Vue може виводити попередження.

```js
const dirty = reactive({ value: 1, log: [] });
const dirtyComputed = computed(() => {
  dirty.log.push("обчислено"); // побічний ефект: мутація іншої властивості
  return dirty.value * 2;
});
console.log(dirtyComputed.value); // 2
console.log(dirty.log); // [ 'обчислено' ] — непередбачувана мутація стану
```

### 9.2. `computed` не може бути асинхронним

Getter має повертати значення **синхронно**. Асинхронна функція завжди повертає `Promise`, тому `.value` буде самим `Promise`, а залежності, прочитані після `await`, не відстежуються (відстеження закінчується разом із синхронною частиною getter'а):

```js
const asyncComputed = computed(async () => {
  await Promise.resolve();
  return state.price;
});
console.log(asyncComputed.value instanceof Promise); // true — не число
```

Для асинхронних даних застосовують `ref` разом із `watchEffect` чи `onMounted`, або бібліотеки на кшталт VueUse.

### 9.3. Мутація результату `computed`

`.value` з масивом чи об'єктом — це реактивний проксі. Змінити його ззовні технічно можна, але це обхід моделі «похідне значення»: джерело правди перестає бути єдиним.

```js
const list = reactive({ items: [3, 1, 2] });
const sorted = computed(() => [...list.items].sort((a, b) => a - b));
console.log(sorted.value); // [ 1, 2, 3 ]
sorted.value.push(999); // технічно спрацює, але це антипатерн
console.log(sorted.value); // [ 1, 2, 3, 999 ] — зміна потрапила в кеш
list.items = [5, 4]; // запускаємо перерахунок
console.log(sorted.value); // [ 4, 5 ] — стара мутація зникла, бо getter перезапустився
```

### 9.4. Нереактивні джерела всередині getter'а

`Math.random()`, `Date.now()` чи зовнішній лічильник не є реактивними залежностями. Результат перестає бути чистою функцією від даних, а кеш не оновлюється передбачувано:

```js
const flaky = computed(() => Math.random()); // кеш «застигає», бо залежностей немає
console.log(flaky.value === flaky.value); // true — те саме число при повторному читанні
```

### 9.5. Зайвий `computed` для константи

Якщо значення не залежить від жодного реактивного джерела, `computed` лише додає накладні витрати:

```js
// не варто: const pi = computed(() => 3.14159);
// достатньо: const pi = 3.14159;
```

## 10. `computed` проти звичайного getter'а

Звичайний getter об'єкта чи класу **не кешує**: він виконується при кожному читанні (детальніше про getter'и — у нотатках про `Object.defineProperty`).

```js
class PlainCart {
  price = 100;
  qty = 2;
  get total() {
    console.log("  [плейн-геттер] обчислення");
    return this.price * this.qty;
  }
}
const plain = new PlainCart();
plain.total; //   [плейн-геттер] обчислення
plain.total; //   [плейн-геттер] обчислення — щоразу заново, кешу немає
```

`computed()` у Vue — це getter **плюс** автоматичне кешування та реактивне відстеження залежностей. Звичайний getter — лише синтаксис виклику без дужок.

## 11. `computed` проти `watch` і `watchEffect`

| | `computed` | `watch` / `watchEffect` |
|---|---|---|
| Призначення | обчислити значення з даних | виконати дію, коли дані змінилися |
| Повертає | значення | нічого |
| Побічні ефекти | не допускаються | це їхня мета (запит, лог, DOM) |
| Кеш | є | немає |

Якщо ви пишете `watch` лише для того, щоб вручну присвоїти результат у `ref`, це майже завжди має бути `computed`:

```vue
<script setup>
// не варто:
const total = ref(0);
watch([price, qty], () => { total.value = price.value * qty.value; });

// правильно:
const total = computed(() => price.value * qty.value);
</script>
```

## Підсумок

- `computed` — похідне реактивне значення: **ліниве** (не рахує, доки не прочитали `.value`) і **кешоване** (повторне читання без зміни залежностей не перераховує).
- Vue відстежує залежності під час першого виконання getter'а й реагує лише на ті реактивні властивості, які getter справді прочитав; набір залежностей може змінюватися (умовні гілки).
- Тільки читання: `computed(fn)`. Читання та запис: `computed({ get, set })`, де `set` зазвичай розкладає значення назад у джерела. Запис у `computed` без `set` лише виводить попередження й ігнорується.
- Ланцюжки `computed` → `computed` працюють природно.
- Пастки: побічні ефекти в getter'і; асинхронний getter (`.value` стане `Promise`); мутація масиву чи об'єкта з `.value`; нереактивні джерела (`Math.random()`, `Date.now()`); `computed` для константи.
- Звичайний getter класу не кешує й не відстежує залежностей; `watch` призначений для побічних ефектів, а не для обчислення значення.
- Практична вигода: дороге обчислення виконується рівно стільки разів, скільки реально змінювалися його залежності, а не на кожен рендер.
