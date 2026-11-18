# Vue 3: `v-model` і `defineModel`

Виміряно на Vue 3.5.44 (`vue` із компілятором шаблонів, `jsdom`). `defineModel` — макрос `<script setup>` (3.4+), описаний за документацією; механіка під ним (`modelValue` + `update:modelValue`) перевірена.

## 1. Що це

`v-model` — **двосторонній зв'язок** значення зі елементом або компонентом. Це **синтаксичний цукор**: проп + подія.

## 2. На нативних елементах

```vue
<input v-model="text" />
```
розкривається в `:value="text"` + `@input="text = $event.target.value"`. Виміряно: введення `new` в `<input v-model="t">` оновило `{{ t }}` → `new`.
Для різних елементів: `input[text]/textarea` → `value`+`input`; `checkbox/radio` → `checked`+`change`; `select` → `value`+`change`.

Модифікатори: `.lazy` (оновлення на `change`, а не `input`), `.number` (приводить до числа), `.trim` (обрізає пробіли).

## 3. На компоненті: `modelValue` + `update:modelValue`

```vue
<Child v-model="count" />
<!-- ≡ -->
<Child :modelValue="count" @update:modelValue="count = $event" />
```
Дитина **не мутує** пропс, а викликає `emit`:
```js
const props = defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);
emit("update:modelValue", props.modelValue + 1);
```
Виміряно: клік у дитині → `update:modelValue` → батьківський `v.value` став `1`, кнопка показує `1`.

## 4. `defineModel` (3.4+)

Скорочення: макрос створює проп і подію, повертає **ref**, запис у який емітить подію:
```vue
<script setup>
const model = defineModel();          // проп modelValue
model.value++;                        // emit('update:modelValue', …) автоматично
</script>
```
Іменовані моделі: `const first = defineModel("first")` ↔ `v-model:first="…"`. Опції: `defineModel({ default: 0, required: true })`; **локальний режим**: якщо батько не передав значення, `defineModel` працює як локальний `ref` (корисно для необов'язкових компонентів).
Модифікатори: `const [model, mods] = defineModel({ set(v) { return mods.trim ? v.trim() : v; } })`.

## 5. Кілька `v-model` на компоненті

```vue
<UserName v-model:first="f" v-model:last="l" />
```
Кожен — своя пара `first` + `update:first`. Виміряно: клік на першому елементі змінив `first` на `X`, на другому `last` на `Y` — `<div><b>X</b><i>Y</i></div>`.

## 6. Власні модифікатори

`v-model.capitalize="x"` → у дитині `props.modelModifiers.capitalize === true` (оброби значення перед `emit`).

## 7. Пастка: мутація пропса

Не пиши `props.modelValue = x` (readonly → попередження). Використовуй `emit` або `defineModel`.

## 8. Пастка: `v-model` на `ref`-деструктурованому/нереактивному значенні

`v-model` потребує **присвоюваної цілі**: `ref`, властивість `reactive`. Не працює з `v-model="props.x"` (props readonly) і з результатом виразу.

## 9. `v-model` і IME/`.lazy`

Для CJK-вводу `input` не оновлюється під час композиції — це нормально; `.lazy` зменшує кількість оновлень для дорогих обробників.

## 10. Типові помилки

1. Змінювати `props.modelValue` у дитині.
2. Забути оголосити `update:modelValue` у `emits`.
3. `v-model` на `v-for` змінній-примітиві (`v-for="s in list" v-model="s"` — не змінює масив); використай індекс/об'єкт.
4. Очікувати `number` без `.number` (значення поля — рядок).
5. Не обробити початкове `undefined` у `defineModel`.
6. Подвійне перетворення значення (і в батьку, і в дитині).

## 11. Алгоритм

1. Нативний елемент → `v-model` (+ `.trim`/`.number`/`.lazy`).
2. Компонент зі значенням → `defineModel()` (3.4+) або `modelValue` + `update:modelValue`.
3. Кілька полів → `v-model:name`.
4. Пост-обробка → `set` в `defineModel` або власні модифікатори.

## Задачі для закріплення

10 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** v-model на компоненті: `modelValue` та `update:modelValue`.

```js
const Kid = defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], setup(p, { emit }) { return () => h('button', { onClick: () => emit('update:modelValue', p.modelValue + 1) }, p.modelValue); } }); const n = ref(0); const r = mount(defineComponent({ setup() { return () => h(Kid, { modelValue: n.value, 'onUpdate:modelValue': (v) => (n.value = v) }); } })); click(find(r, 'button')); await tick(); click(find(r, 'button')); await tick(); return [n.value, html(r)];
```

**2.** Кілька `v-model` із іменованими аргументами.

```js
const Kid = defineComponent({ props: ['first', 'last'], emits: ['update:first', 'update:last'], setup(p, { emit }) { return () => h('button', { onClick: () => { emit('update:first', 'A'); emit('update:last', 'B'); } }, p.first + p.last); } }); const f = ref('x'), l = ref('y'); const r = mount(defineComponent({ setup() { return () => h(Kid, { first: f.value, last: l.value, 'onUpdate:first': (v) => (f.value = v), 'onUpdate:last': (v) => (l.value = v) }); } })); click(find(r, 'button')); await tick(); return html(r);
```

**3.** Власні модифікатори: `modelModifiers`.

```js
const Kid = defineComponent({ props: ['modelValue', 'modelModifiers'], emits: ['update:modelValue'], setup(p, { emit }) { return () => h('button', { onClick: () => emit('update:modelValue', p.modelModifiers.upper ? 'hello'.toUpperCase() : 'hello') }, p.modelValue); } }); const v = ref(''); const r = mount(defineComponent({ setup() { return () => h(Kid, { modelValue: v.value, modelModifiers: { upper: true }, 'onUpdate:modelValue': (x) => (v.value = x) }); } })); click(find(r, 'button')); await tick(); return html(r);
```

### Рівень 2. Деталі й поведінка

**4.** Одностороння прив'язка без обробника: чи змінюється батьківський стан?

```js
const Kid = defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], setup(p, { emit }) { return () => h('button', { onClick: () => emit('update:modelValue', 'new') }, p.modelValue); } }); const v = ref('old'); const r = mount(defineComponent({ setup() { return () => h(Kid, { modelValue: v.value }); } })); click(find(r, 'button')); await tick(); return [v.value, html(r)];
```

**5.** Обчислюваний get/set для локального дзеркала `v-model`.

```js
const Kid = defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], setup(p, { emit }) { const local = computed({ get: () => p.modelValue, set: (v) => emit('update:modelValue', v) }); return () => h('button', { onClick: () => (local.value = local.value + '!') }, local.value); } }); const v = ref('a'); const r = mount(defineComponent({ setup() { return () => h(Kid, { modelValue: v.value, 'onUpdate:modelValue': (x) => (v.value = x) }); } })); click(find(r, 'button')); await tick(); return html(r);
```

**6.** Мутація об'єкта в `v-model` без нового посилання.

```js
const Kid = defineComponent({ props: ['modelValue'], setup(p) { return () => h('i', p.modelValue.n); } }); const o = reactive({ n: 1 }); const r = mount(defineComponent({ setup() { return () => h(Kid, { modelValue: o }); } })); o.n = 2; await tick(); return html(r);
```

### Рівень 3. Нюанси та пастки

**7.** Текстове поле: емуляція `v-model` через `value` та `onInput`.

```js
const t = ref(''); const r = mount(defineComponent({ setup() { return () => h('input', { value: t.value, onInput: (e) => (t.value = e.target.value) }); } })); find(r, 'input').props.onInput({ target: { value: 'hello' } }); await tick(); return [t.value, find(r, 'input').props.value];
```

**8.** Чекбокс: `v-model` з масивом (додавання/видалення).

```js
const sel = ref(['a']); const toggle = (v) => { const i = sel.value.indexOf(v); i === -1 ? sel.value.push(v) : sel.value.splice(i, 1); }; toggle('b'); toggle('a'); return [...sel.value];
```

**9.** Що таке `v-model` на компоненті?

### Рівень 4. Практика

**10.** Як працюють модифікатори `.trim`, `.number`, `.lazy` на нативних елементах?

### Відповіді

1. `[2, '<button>2</button>']`
2. `'<button>AB</button>'`
3. `'<button>HELLO</button>'`
4. `['old', '<button>old</button>']`
5. `'<button>a!</button>'`
6. `'<i>2</i>'`
7. `['hello', 'hello']`
8. `['b']`
9. Синтаксичний цукор: проп `modelValue` + подія `update:modelValue`; `defineModel` (3.4+) спрощує оголошення двосторонньої прив'язки
10. `trim` обрізає пробіли, `number` приводить рядок до числа, `lazy` слухає `change` замість `input`
