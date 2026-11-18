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

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** `toRef` створює ref, прив'язаний до властивості.

```js
const s = reactive({ n: 1 }); const n = toRef(s, 'n'); n.value = 5; s.n++; return [s.n, n.value, isRef(n)];
```

**2.** `toRefs` дозволяє деструктуризацію без втрати реактивності.

```js
const s = reactive({ a: 1, b: 2 }); const { a, b } = toRefs(s); a.value = 10; s.b = 20; return [s.a, b.value];
```

**3.** Без `toRefs` деструктуризація розриває зв'язок.

```js
const s = reactive({ a: 1 }); const { a } = s; s.a = 5; return a;
```

### Рівень 2. Деталі й поведінка

**4.** `toRef` до неіснуючої властивості.

```js
const s = reactive({}); const x = toRef(s, 'x'); const log = []; watchEffect(() => log.push(x.value)); s.x = 1; await tick(); return log;
```

**5.** `toValue`: ref, геттер, значення.

```js
return [toValue(ref(1)), toValue(() => 2), toValue(3)];
```

**6.** `unref` проти `toValue` для функції.

```js
const f = () => 5; return [typeof unref(f), toValue(f)];
```

### Рівень 3. Нюанси та пастки

**7.** `toRefs` для `props`-подібного об'єкта (readonly).

```js
const props = shallowReactive({ title: 'a' }); const { title } = toRefs(props); props.title = 'b'; return title.value;
```

**8.** `toRef` із геттером (3.3+).

```js
const s = reactive({ n: 2 }); const d = toRef(() => s.n * 2); s.n = 5; return d.value;
```

**9.** Властивості `toRefs` для масиву.

```js
const a = reactive(['x', 'y']); const r = toRefs(a); a[0] = 'z'; return [Array.isArray(r), r[0].value];
```

### Рівень 4. Практика

**10.** Повернення `toRefs` із композабла зберігає реактивність.

```js
const useP = () => { const s = reactive({ x: 0, y: 0 }); return { ...toRefs(s), move: () => { s.x++; s.y += 2; } }; }; const { x, y, move } = useP(); move(); return [x.value, y.value];
```

**11.** Яку проблему вирішує `toRefs`?

**12.** Чим `toRef` відрізняється від `ref(obj.prop)`?

### Відповіді

1. `[6, 6, true]`
2. `[10, 20]`
3. `1`
4. `[undefined, 1]`
5. `[1, 2, 3]`
6. `['function', 5]`
7. `'b'`
8. `10`
9. `[true, 'z']`
10. `[1, 2]`
11. Перетворює кожну властивість реактивного об'єкта на ref, зберігаючи зв'язок із джерелом, тож їх можна безпечно деструктурувати чи повертати
12. `ref(obj.prop)` копіює значення й не залежить від об'єкта; `toRef(obj, 'prop')` лишається прив'язаним до властивості в обидва боки
