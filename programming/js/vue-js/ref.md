# Vue 3: `ref`

Усі виводи отримані реальним запуском: Vue 3.5.44 (`vue`, `jsdom`, `createApp().mount()`). Базова теорія реактивності — [reactivity.md](reactivity.md).

## 1. Що це

`ref(value)` створює **реактивне посилання** — об'єкт-обгортку з єдиним полем **`.value`**. Читання `.value` реєструє залежність (track), запис — запускає залежні ефекти/рендер/`computed`/`watch` (trigger).

```js
import { ref } from "vue";
const count = ref(0);
count.value++;          // у JS-коді — через .value
```

Чому обгортка: примітив (`number`, `string`, `boolean`) у JavaScript передається **за значенням** — перехопити його читання й запис неможливо. Об'єкт із `get value()`/`set value()` можливий.

## 2. Як це працює покроково

1. `ref(0)` створює `RefImpl` зі значенням `0` і порожнім набором підписників (`dep`).
2. **Читання** `count.value` всередині `effect`/рендеру/`computed`: Vue запам'ятовує «цей ефект читав цей ref» (**track**).
3. **Запис** `count.value = 1`: якщо значення **змінилось** (`Object.is`), Vue знаходить усі ефекти, що читали ref, і планує їх повторне виконання (**trigger**).
4. Оновлення **групуються** й виконуються асинхронно (див. [nextTick.md](nextTick.md)).

Виміряно: запис того самого значення (`same.value = 1` при `1`) **не запускає** ефект (`effect runs 1`).

## 3. У шаблоні — без `.value`

У `<template>` ref верхнього рівня (повернутий із `setup()` або `<script setup>`) **розгортається автоматично**: `{{ count }}`, `v-model="count"`. Лише **верхній рівень**: `{{ obj.count }}`, де `obj = { count: ref(0) }` — у `v-if`/виразах (не в інтерполяції) ref не розгорнеться. Інтерполяція `{{ }}` додатково розгортає ref (через `toDisplayString`).

## 4. Глибока реактивність

Якщо у `ref` потрапляє **об'єкт**, він перетворюється на `reactive` (глибоко): виміряно `isReactive(ref({a:1}).value)` → `true`; ефект, що читає `o.value.a.b`, спрацьовує на `o.value.a.b = 2` (`deep b=1 | deep b=2`). Для великих структур, які не треба відстежувати глибоко — `shallowRef` ([shallowRef.md](shallowRef.md)).

`ref(reactiveObj).value === reactiveObj` → `true` (той самий проксі).

## 5. Допоміжні функції

| Функція | Що робить |
|---|---|
| `isRef(x)` | чи це ref (`isRef(ref(1))` → `true`) |
| `unref(x)` | `isRef(x) ? x.value : x` (`unref(ref(1))` → `1`) |
| `toValue(x)` (3.3+) | ref → `.value`, функція-геттер → її результат, інше → як є: `toValue(ref(3))` = `3`, `toValue(() => 4)` = `4`, `toValue(5)` = `5` |
| `toRef`, `toRefs` | ref з властивості reactive-об'єкта ([toRefs.md](toRefs.md)) |
| `shallowRef`, `triggerRef`, `customRef` | [shallowRef.md](shallowRef.md) |

## 6. Пастки

1. **Забути `.value`** у JS (в `script`): `count++` замість `count.value++` — помилка/NaN.
2. **`watch(count.value, …)`** — передається число, а не джерело → `[Vue warn]: Invalid watch source`. Правильно: `watch(count, …)` або `watch(() => count.value, …)`.
3. **Масив у ref і `watch`:** `arr.value.push(2)` **не** викликає `watch(arr, cb)` без `{ deep: true }` (виміряно: `fires? false`; з `deep` — спрацювало). Замість мутації — `arr.value = [...arr.value, 2]`.
4. **`JSON.stringify(ref)`** виводить внутрішню структуру (`{"dep":…,"__v_isRef":true,…}`): серіалізуй `ref.value`.
5. **Ref в масиві/Map поза `reactive`** не розгортається автоматично — звертайся до `.value`.
6. **Деструктуризація ref-об'єкта** з `ref({ a: 1 })`: `const { a } = obj.value` — звичайне число без реактивності.
7. **Заміна значення на новий об'єкт** у `ref` — спрацьовує (виміряно: `replace … fires: 1`).

## 7. `ref` чи `reactive`

| | `ref` | `reactive` |
|---|---|---|
| Примітиви | ✔ | ✗ |
| Об'єкти | ✔ (`.value`) | ✔ (без `.value`) |
| Заміна цілого значення | ✔ (`x.value = newObj`) | ✗ (втрата зв'язку) |
| Деструктуризація | потрібен `toRefs` | втрачає реактивність |
| Рекомендація Vue | **за замовчуванням `ref`** | для згрупованого локального стану |

## 8. Алгоритм

1. Потрібен реактивний стан → `const x = ref(init)`.
2. У JS — `x.value`, у шаблоні — `x`.
3. Передаєш у `watch` — сам ref (`watch(x, …)`) або геттер.
4. Великі нереактивні дані → `shallowRef`.
5. Повертаєш з композабла — повертай **ref**, а не розгорнуте значення.

## Задачі для закріплення

15 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Що поверне `ref(0)` і як читати значення?

```js
const n = ref(0); n.value++; return [n.value, isRef(n), typeof n];
```

**2.** Чи реагує `watch` на зміну `ref`?

```js
const n = ref(1); const log = []; watch(n, (v, o) => log.push([o, v])); n.value = 2; n.value = 3; await tick(); return log;
```

**3.** Глибока реактивність `ref` з об'єктом.

```js
const o = ref({ a: { b: 1 } }); const log = []; watch(() => o.value.a.b, v => log.push(v)); o.value.a.b = 5; await tick(); return [log, isReactive(o.value)];
```

**4.** Заміна всього об'єкта в `ref`.

```js
const o = ref({ n: 1 }); const log = []; watchEffect(() => log.push(o.value.n)); o.value = { n: 2 }; await tick(); return log;
```

### Рівень 2. Деталі й поведінка

**5.** Розгортання `ref` усередині `reactive`.

```js
const n = ref(1); const s = reactive({ n }); s.n++; return [n.value, s.n, isRef(s.n)];
```

**6.** Масив із `ref` усередині `reactive` не розгортається.

```js
const n = ref(1); const arr = reactive([n]); return [isRef(arr[0]), arr[0].value];
```

**7.** `unref` та `isRef`.

```js
const n = ref(3); return [unref(n), unref(4), isRef(n), isRef(4)];
```

**8.** `ref` у шаблоні (render-функція): оновлення DOM після зміни.

```js
const n = ref('a'); const C = defineComponent({ setup() { return () => h('p', n.value); } }); const r = mount(C); const a = html(r); n.value = 'b'; await tick(); return [a, html(r)];
```

### Рівень 3. Нюанси та пастки

**9.** Скільки разів спрацює ефект при кількох змінах поспіль (батчинг)?

```js
const n = ref(0); let runs = 0; watchEffect(() => { n.value; runs++; }); n.value = 1; n.value = 2; n.value = 3; await tick(); return runs;
```

**10.** Чи тригерить присвоєння того ж значення ефект?

```js
const n = ref(1); let runs = 0; watchEffect(() => { n.value; runs++; }); n.value = 1; await tick(); return runs;
```

**11.** `ref` з `NaN` та `Object.is`.

```js
const n = ref(NaN); let runs = 0; watchEffect(() => { n.value; runs++; }); n.value = NaN; await tick(); return runs;
```

**12.** Поверхнева альтернатива: `shallowRef` не відстежує вкладене.

```js
const o = shallowRef({ n: 1 }); let runs = 0; watchEffect(() => { o.value.n; runs++; }); o.value.n = 2; await tick(); const a = runs; o.value = { n: 3 }; await tick(); return [a, runs];
```

### Рівень 4. Практика

**13.** `toRaw` та `markRaw`.

```js
const o = { a: 1 }; const r = ref(o); const raw = toRaw(r.value); return [raw === o, r.value === o, isProxy(r.value)];
```

**14.** Чому для `ref` потрібен `.value`?

**15.** Коли використовувати `ref`, а коли `reactive`?

### Відповіді

1. `[1, true, 'object']`
2. `[[1, 3]]`
3. `[[5], true]`
4. `[1, 2]`
5. `[2, 2, false]`
6. `[true, 1]`
7. `[3, 4, true, false]`
8. `['<p>a</p>', '<p>b</p>']`
9. `2`
10. `1`
11. `1`
12. `[1, 2]`
13. `[true, false, true]`
14. Примітиви не можна відстежувати напряму; `ref` — це об'єкт-обгортка з геттером/сеттером `.value`, де Vue збирає залежності й сповіщає про зміни
15. `ref` — для примітивів і значень, які можна замінювати цілком; `reactive` — для об'єктів, коли доступ без `.value` зручніший (але не можна заміняти весь об'єкт)
