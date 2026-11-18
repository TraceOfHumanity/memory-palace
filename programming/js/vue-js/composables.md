# Vue 3: композабли (composables)

Виміряно на Vue 3.5.44 (`vue`, `jsdom`).

## 1. Що це

**Композабл** — функція (за домовленістю `useXxx`), що використовує Composition API (`ref`, `computed`, `watch`, хуки життєвого циклу) і **інкапсулює повторно використовувану логіку зі станом**. Аналог кастомних хуків React.

```js
// useMouse.js
import { ref, onMounted, onUnmounted } from "vue";
export function useMouse() {
  const x = ref(0);
  const on = (e) => (x.value = e.clientX);
  onMounted(() => window.addEventListener("mousemove", on));
  onUnmounted(() => window.removeEventListener("mousemove", on));
  return { x };
}
```
Виміряно: компонент із `useMouse()` після події `mousemove` показав `<p>42</p>`; після `unmount` обробник знято (подальші події DOM не змінюють нічого).

## 2. Анатомія

1. **Приймає** аргументи (значення, ref, геттери).
2. **Створює** реактивний стан і ефекти.
3. **Реєструє** хуки життєвого циклу/очищення (`onMounted`, `onScopeDispose`).
4. **Повертає** ref-и/функції (об'єкт, а не масив — для іменованого доступу; або масив для коротких «пар»).

Кожен виклик композабла створює **незалежний стан** (як і в React). Щоб ділити — винеси стан за межі функції (модульний одинак) або використовуй Pinia/`provide`.

## 3. Нормалізація аргументів: `toValue`

Приймай **і значення, і ref, і геттер**, читай через `toValue` — тоді композабл реагує на зміни:
```js
export function useFetch(url) {              // string | Ref<string> | () => string
  const data = ref(null), error = ref(null);
  watchEffect(async (onCleanup) => {
    const ctrl = new AbortController();
    onCleanup(() => ctrl.abort());
    try { data.value = await (await fetch(toValue(url), { signal: ctrl.signal })).json(); }
    catch (e) { if (e.name !== "AbortError") error.value = e; }
  });
  return { data, error };
}
```
(Залежності, що мають відстежуватись, читай **до `await`** — [watchEffect.md](watchEffect.md) §4.)

## 4. Повертай ref-и, а не розгорнуті значення

`return { count: count.value }` — знімок, реактивність втрачена. Повертай `{ count }`. Якщо всередині `reactive` — `toRefs(state)`, щоб споживач міг деструктурувати.

## 5. Життєвий цикл усередині композабла

Хуки реєструються на **поточний компонент** (який викликав композабл). Тому композабл має викликатись **синхронно в `setup()`** (або іншому композаблі), не в обробнику й не після `await`. Для незалежного від компонента очищення — `onScopeDispose`.

## 6. Композабл чи інше

| Потреба | Інструмент |
|---|---|
| Повторна **логіка зі станом** | композабл |
| Повторна **розмітка** | компонент |
| Спільна **безстанова** логіка | звичайна функція/утиліта |
| Глобальний стан | Pinia |
| Перетворення даних | `computed` / функція |

## 7. Типові композабли

`useToggle`, `useCounter`, `useLocalStorage`, `useDebounce`, `useFetch`, `useEventListener`, `useMediaQuery`, `useIntersectionObserver`. Готова колекція — **VueUse** (не винаходь велосипед).

## 8. Тестування

Композабл із хуками життєвого циклу тестують, змонтувавши в тестовому компоненті (`withSetup`-хелпер); без хуків — викликають напряму в `effectScope`.

## 9. Типові помилки

1. Виклик поза `setup` (хуки не зареєструються: `onMounted is called when there is no active component instance`).
2. Повернути розгорнуті значення замість ref.
3. Не прибрати слухачі/таймери.
4. Не підтримати ref/геттер аргументи (композабл «заморожується» на початковому значенні).
5. Виклик після `await` в `async setup()`.
6. Очікувати спільного стану між викликами.
7. Прихований побічний ефект при імпорті (створення стану на рівні модуля) без наміру ділити його.
8. Робити «божественний» композабл замість кількох маленьких.

## 10. Алгоритм

1. Повторюється пара «стан + ефект/хук» → винеси в `useНазва`.
2. Приймай значення | ref | геттер (`toValue`).
3. Прибирай ресурси: `onUnmounted`/`onScopeDispose`.
4. Повертай ref-и (`{ x, y }`) та функції.
5. Викликай синхронно в `setup`.
6. Спільний стан → зовнішній стор/`provide`.

## Задачі для закріплення

13 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Композабл повертає ref-и та функції.

```js
const useCounter = (init = 0) => { const n = ref(init); const inc = () => n.value++; return { n, inc }; }; const { n, inc } = useCounter(5); inc(); inc(); return n.value;
```

**2.** Незалежний стан при кожному виклику.

```js
const useCounter = () => { const n = ref(0); return { n, inc: () => n.value++ }; }; const a = useCounter(), b = useCounter(); a.inc(); return [a.n.value, b.n.value];
```

**3.** Спільний стан за межами функції (singleton).

```js
const shared = ref(0); const useShared = () => ({ shared, inc: () => shared.value++ }); const a = useShared(), b = useShared(); a.inc(); return [a.shared.value, b.shared.value];
```

**4.** Нормалізація аргументів через `toValue`.

```js
const useDouble = (src) => computed(() => toValue(src) * 2); const a = ref(2); return [useDouble(a).value, useDouble(() => 3).value, useDouble(4).value];
```

### Рівень 2. Деталі й поведінка

**5.** Реактивний аргумент: композабл реагує на зміну джерела.

```js
const useUpper = (s) => computed(() => toValue(s).toUpperCase()); const s = ref('ab'); const u = useUpper(s); s.value = 'xy'; return u.value;
```

**6.** Життєвий цикл усередині композабла прив'язаний до компонента.

```js
const log = []; const useLog = () => { onMounted(() => log.push('m')); onUnmounted(() => log.push('u')); }; const C = defineComponent({ setup() { useLog(); return () => h('p'); } }); const r = mount(C); unmount(r); return log;
```

**7.** Композабл `useToggle`.

```js
const useToggle = (i = false) => { const v = ref(i); return [v, () => (v.value = !v.value)]; }; const [on, toggle] = useToggle(); toggle(); toggle(); toggle(); return on.value;
```

**8.** Композабл `useAsync` зі станами loading/data/error.

```js
const useAsync = (fn) => { const data = ref(null), error = ref(null), loading = ref(true); fn().then(v => (data.value = v), e => (error.value = e.message)).finally(() => (loading.value = false)); return { data, error, loading }; }; const ok = useAsync(() => Promise.resolve('ok')); const bad = useAsync(() => Promise.reject(new Error('no'))); const l0 = ok.loading.value; await sleep(5); return [l0, ok.data.value, bad.error.value, bad.loading.value];
```

### Рівень 3. Нюанси та пастки

**9.** `watch` у композаблі зупиняється при розмонтуванні компонента.

```js
let runs = 0; const n = ref(0); const useW = () => watch(n, () => runs++); const C = defineComponent({ setup() { useW(); return () => h('p'); } }); const r = mount(C); n.value = 1; await tick(); unmount(r); n.value = 2; await tick(); return runs;
```

**10.** Повернення `reactive` об'єкта проти набору ref-ів (деструктуризація).

```js
const useA = () => reactive({ x: 1 }); const useB = () => ({ x: ref(1) }); const a = useA(); let { x: ax } = a; const { x: bx } = useB(); bx.value = 5; a.x = 7; return [ax, bx.value];
```

**11.** Композиція композаблів.

```js
const useCounter = () => { const n = ref(0); return { n, inc: () => n.value++ }; }; const useDouble = () => { const { n, inc } = useCounter(); return { n, inc, d: computed(() => n.value * 2) }; }; const c = useDouble(); c.inc(); c.inc(); return [c.n.value, c.d.value];
```

**12.** Що таке композабл?

### Рівень 4. Практика

**13.** Чому композабл повертає ref-и, а не розгортає значення?

### Відповіді

1. `7`
2. `[1, 0]`
3. `[1, 1]`
4. `[4, 6, 8]`
5. `'XY'`
6. `['m', 'u']`
7. `true`
8. `[true, 'ok', 'no', false]`
9. `1`
10. `[1, 5]`
11. `[2, 4]`
12. Функція з префіксом `use`, яка інкапсулює й повторно використовує реактивну логіку з Composition API (стан, computed, watch, хуки)
13. Щоб споживач міг деструктурувати результат без втрати реактивності
