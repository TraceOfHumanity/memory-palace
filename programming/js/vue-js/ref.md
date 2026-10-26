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
