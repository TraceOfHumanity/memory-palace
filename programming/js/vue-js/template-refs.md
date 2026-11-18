# Vue 3: template refs (`ref` на елементі), `useTemplateRef`, `defineExpose`

Виміряно на Vue 3.5.44.

## 1. Що це

**Template ref** — посилання на **DOM-елемент** або **екземпляр дочірнього компонента** у шаблоні. Потрібне для імперативних дій: `focus()`, виміри, інтеграція сторонніх бібліотек.

```vue
<script setup>
import { ref, onMounted } from "vue";
const input = ref(null);                  // ім'я збігається з ref="input"
onMounted(() => input.value.focus());
</script>
<template><input ref="input" /></template>
```
Атрибут `ref="input"` + змінна `input = ref(null)` у `setup` — Vue **присвоює** елемент у `input.value`.

## 2. `useTemplateRef` (3.5+)

```js
const el = useTemplateRef("inp");         // рядок = значення ref="inp"
```
Виміряно: `useTemplateRef mounted INPUT`. Перевага: ім'я ref — **рядок**, а не збіг імені змінної (краще для типізації й композаблів).

## 3. Коли ref заповнений (виміряно)

| Момент | `el.value` |
|---|---|
| у `setup()` | **`null`** (`setup el=null`) |
| у `onMounted` | елемент (`mounted el=INPUT`) |
| після `v-if` → `false` | знову **`null`** (`v-if true: INPUT`, `v-if false: null`) |

Тому: читати лише після монтування (`onMounted`, `watch`, обробники). Завжди **перевіряй на `null`** (`el.value?.focus()`).

## 4. Ref на компонент і `defineExpose`

Ref на дочірній компонент дає його **екземпляр**. Але у `<script setup>` компонент за замовчуванням **закритий** — батько нічого не бачить, поки дитина не розкриє публічний API:
```js
// дитина
defineExpose({ hello: () => "hi", reset });
```
Виміряно (`expose({ hello })` у `setup`): батько отримав ключі лише `hello` — приватні змінні недоступні.
У render-функціях/`setup()` аналог — `expose({...})` у контексті.

## 5. Ref у `v-for`

`ref` в циклі збирає **масив** елементів: `const items = ref([])`, `<li v-for="… " ref="items">`. Порядок масиву **не гарантовано** збігається з порядком джерела — не покладайся на нього. Для кожного елемента окремо — функціональний ref: `:ref="(el) => setRef(el, i)"`.

## 6. Функціональний ref

`:ref="(el) => { … }"` викликається з елементом при монтуванні й з `null` при розмонтуванні.

## 7. Типові помилки

1. Читати `el.value` у `setup()` — там `null`.
2. Не перевіряти `null` після `v-if`.
3. Звертатись до внутрішніх змінних дочірнього компонента без `defineExpose`.
4. Імперативно змінювати DOM, який Vue сам рендерить (конфлікт при наступному оновленні) — міняй дані, а не DOM.
5. Покладатись на порядок ref у `v-for`.
6. Ref для керування станом, який можна виразити пропсом/`v-model`.
7. Назва змінної не збігається з `ref="…"` (до 3.5 без `useTemplateRef`) → ref не заповниться.

## 8. Алгоритм

1. Потрібен DOM-вузол → `ref="name"` + `useTemplateRef("name")` (або змінна `name = ref(null)`).
2. Читай у `onMounted`/обробниках, перевіряй на `null`.
3. Потрібно керувати дитиною → `defineExpose({ методи })`.
4. Дані замість DOM-маніпуляцій.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Ref на елемент заповнюється після монтування.

```js
const el = ref(null); const C = defineComponent({ setup() { return () => h('input', { ref: el }); } }); const before = el.value; mount(C); return [before, el.value && el.value.tag];
```

**2.** Ref на компонент і `expose`.

```js
const kid = ref(null); const Kid = defineComponent({ setup(_, { expose }) { const n = ref(7); expose({ n, hello: () => 'hi' }); return () => h('i'); } }); const P = defineComponent({ setup() { return () => h(Kid, { ref: kid }); } }); mount(P); return [kid.value.hello(), kid.value.n];
```

**3.** Без `expose` доступна вся публічна поверхня.

```js
const kid = ref(null); const Kid = defineComponent({ setup() { return { x: 1 }; }, render() { return h('i'); } }); mount(defineComponent({ setup() { return () => h(Kid, { ref: kid }); } })); return kid.value.x;
```

### Рівень 2. Деталі й поведінка

**4.** Ref у `v-for`: масив елементів.

```js
const els = ref([]); const C = defineComponent({ setup() { return () => h('ul', [1, 2, 3].map(i => h('li', { ref_for: true, ref: els }, i))); } }); mount(C); return els.value.length;
```

**5.** Функціональний ref отримує елемент і `null` при розмонтуванні.

```js
const log = []; const show = ref(true); const C = defineComponent({ setup() { return () => show.value ? h('p', { ref: (el) => log.push(el ? el.tag : null) }) : null; } }); mount(C); show.value = false; await tick(); return log;
```

**6.** Ref стає `null` після розмонтування.

```js
const el = ref(null); const show = ref(true); mount(defineComponent({ setup() { return () => show.value ? h('p', { ref: el }) : h('i'); } })); const a = !!el.value; show.value = false; await tick(); return [a, el.value];
```

### Рівень 3. Нюанси та пастки

**7.** Спроба прочитати ref у `setup` до монтування.

```js
const el = ref(null); let seen = 'unset'; const C = defineComponent({ setup() { seen = el.value; return () => h('p', { ref: el }); } }); mount(C); return [seen, !!el.value];
```

**8.** `watch` на template ref (`flush: 'post'`).

```js
const el = ref(null); const log = []; watch(el, (v) => log.push(v && v.tag), { flush: 'post' }); mount(defineComponent({ setup() { return () => h('section', { ref: el }); } })); await tick(); return log;
```

**9.** Ref на умовний елемент.

```js
const el = ref(null); const on = ref(false); mount(defineComponent({ setup() { return () => on.value ? h('b', { ref: el }) : h('i'); } })); const a = el.value; on.value = true; await tick(); return [a, el.value && el.value.tag];
```

### Рівень 4. Практика

**10.** Коли template ref заповнений?

**11.** Навіщо `defineExpose`/`expose`?

**12.** Що таке `useTemplateRef` (3.5+)?

### Відповіді

1. `[null, 'input']`
2. `['hi', 7]`
3. `1`
4. `3`
5. `['p', null]`
6. `[true, null]`
7. `[null, true]`
8. `['section']`
9. `[null, 'b']`
10. Після монтування елемента (у `onMounted` і пізніше); у `setup` та під час першого рендеру він ще `null`
11. Обмежує публічний інтерфейс компонента для батьківського ref лише вибраними властивостями
12. Хук, що повертає ref на елемент за рядковим ім'ям `ref="name"` із шаблону, замість змінної з тим самим іменем у `setup`
