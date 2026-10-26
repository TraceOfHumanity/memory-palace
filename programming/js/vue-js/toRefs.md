# Vue 3: `toRef`, `toRefs`, `toValue`, `unref`

Виміряно на Vue 3.5.44.

## 1. Навіщо

Реактивність живе на **властивостях проксі**. Витягнувши значення (`const { a } = state`), ти отримуєш звичайне число — зв'язок втрачено. `toRef`/`toRefs` створюють **ref, прив'язаний до властивості** об'єкта: читання/запис ref = читання/запис властивості.

## 2. `toRef(obj, "key")`

```js
const state = reactive({ a: 1, b: 2 });
const bRef = toRef(state, "b");
bRef.value = 20;      // state.b === 20
state.b = 5;          // bRef.value === 5
```
Виміряно: `toRef(s, "b").value` → `2`.

**Форма-геттер (3.3+):** `toRef(() => props.n)` — **лише для читання** ref, що обчислюється з геттера (як легкий `computed`). Виміряно: після `props.n = 5` `nRef.value` → `5`.

## 3. `toRefs(obj)`

Повертає **звичайний об'єкт**, де кожна властивість — ref, прив'язаний до відповідної властивості початкового:
```js
const { a, b } = toRefs(state);
a.value = 10;         // state.a === 10 (write-through)
```
Виміряно: `toRefs write-through: 10`.

Типове застосування — **повернення реактивного об'єкта з композабла** так, щоб його можна було деструктурувати:
```js
function useCounter() {
  const state = reactive({ count: 0, double: computed(() => state.count * 2) });
  return toRefs(state);
}
const { count } = useCounter();      // count лишається реактивним
```
`toRefs` для пропсів: `const { title } = toRefs(props)`. (У Vue 3.5 для `<script setup>` є реактивна деструктуризація props на етапі компіляції.)

## 4. `toValue` і `unref`

| | |
|---|---|
| `unref(x)` | `isRef(x) ? x.value : x` |
| `toValue(x)` | ref → `.value`; **функція** → виклик; інше → як є (`toValue(ref(3))` = `3`, `toValue(() => 4)` = `4`, `toValue(5)` = `5`) |

`toValue` — основа патерну **«нормалізованих аргументів» композабла**: приймай і значення, і ref, і геттер:
```js
function useFetch(url) {                 // url: string | Ref<string> | () => string
  watchEffect(() => fetch(toValue(url)));
}
```

## 5. Пастки

1. `toRef` на **неіснуючу** властивість створює ref із `undefined`; зв'язок із об'єктом є, але реактивний доступ до появи властивості залежить від того, чи це `reactive` (у Vue 3 — працює).
2. `toRefs` — **знімок набору ключів**: нова властивість, додана пізніше, ref не отримає.
3. `toRefs` на **не-реактивному** об'єкті — попередження (`toRefs() expects a reactive object`).
4. Не плутай із копіюванням: `ref(state.a)` — **окрема копія** значення, не зв'язок.
5. Форма-геттер `toRef(() => …)` — тільки читання (запис дає попередження).

## 6. Алгоритм

1. Потрібно деструктурувати `reactive`/`props` → `toRefs`.
2. Потрібен один зв'язаний ref → `toRef(obj, "key")` або `toRef(() => obj.key)`.
3. Приймаєш аргументи в композаблі → нормалізуй `toValue`.
4. Просто розгорнути «може-ref» → `unref`.
