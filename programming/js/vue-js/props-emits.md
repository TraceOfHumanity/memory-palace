# Vue 3: `props` та `emits`

Виміряно на Vue 3.5.44.

## 1. Props — дані вниз

Пропси — вхідні дані компонента від батька. Оголошуються явно:
```js
const props = defineProps({ n: Number, user: Object, flag: Boolean });   // <script setup>
// або: props: { n: Number } у defineComponent
```

## 2. Властивості props

1. **Реактивні:** `props` — реактивний (shallow-readonly) об'єкт. Зміна пропса батьком оновлює дитину: `computed(() => p.n * 2)` перерахувався (`<p>10:5</p>`).
2. **Лише для читання:** `p.n = 5` → `[Vue warn]: Set operation on key "n" failed: target is readonly.` Односпрямований потік даних: змінювати може лише власник.
3. **Перевірка типів у розробці:** передали рядок замість числа → `[Vue warn]: Invalid prop: type check failed for prop "n". Expected Number with value NaN, got String with value "str".`
4. **Значення за замовчуванням:** об'єкти/масиви — **фабрикою**: `items: { type: Array, default: () => [] }`.
5. **Boolean-каст:** відсутній Boolean-пропс → `false` (виміряно: `[[], false]`); `<Comp disabled />` ≡ `disabled: true`.
6. `required: true`, `validator(value)` для складних перевірок.

## 3. Деструктуризація props

`const { n } = props` у **звичайному** JS дає **знімок**: виміряно, ефект бачив `p.n=5`, а змінна `n` лишилась `1` (`effect sees p.n=5 destructured n=1`). Для реактивності: `toRefs(props)`/`toRef(() => props.n)`, або (Vue 3.5, `<script setup>`) **реактивна деструктуризація props** — компілятор перетворює `const { n } = defineProps(…)` на `props.n`.

## 4. Нормалізація імен

У шаблоні `<Comp user-name="Ann" />` ↔ у props `userName` (kebab-case ↔ camelCase).

## 5. Emits — події вгору

Дитина повідомляє батька подією, **не змінюючи** його дані:
```js
const emit = defineEmits(["save", "update:modelValue"]);
emit("save", payload);
```
Батько слухає: `@save="onSave"`.

Виміряно: `emit('update:modelValue', p.modelValue + 1)` та `emit('save', 'payload')` → у батька спрацював обробник (`save payload`).

## 6. Оголошення emits

Оголошуй усі події:
- документація і типізація;
- щоб `onXxx`-атрибути не потрапляли в **fallthrough attrs** (нативні слухачі кореневого елемента);
- необ'явлена подія → `[Vue warn]: Component emitted event "typo" but it is neither declared in the emits option nor as an "onTypo" prop.`
- **валідація:** `emits: { "update:first": (v) => typeof v === "string" }` — функція перевіряє аргументи.

## 7. Односпрямований потік (props down, events up)

```
Parent ── props ──▶ Child
Parent ◀─ emits ─── Child
```
Дитина не мутує пропс; вона `emit`'ить, батько вирішує, чи змінювати. Для двостороннього зв'язку — `v-model` ([v-model.md](v-model.md)).

## 8. Мутація об'єкта-пропса

`props.user.name = "X"` **технічно** працює (shallow readonly), але це антипатерн — змінює дані батька «за спиною». Роби копію (`ref({ ...props.user })`) або `emit('update', …)`.

## 9. Fallthrough attrs

Атрибути/слухачі, не оголошені як props/emits, автоматично додаються до **кореневого елемента** дитини (`class`, `style`, `id`, `onClick`). `inheritAttrs: false` + `$attrs` для ручного керування.

## 10. Типові помилки

1. Мутувати пропс (`props.n = …`).
2. Деструктурувати props без `toRefs` у старих версіях/поза `script setup`.
3. Об'єкт/масив у `default` без фабрики (спільний між екземплярами).
4. Не оголосити emits → зайві fallthrough-слухачі й попередження.
5. Змінювати вкладений об'єкт-пропс.
6. Передавати функції-колбеки замість подій без потреби.
7. camelCase/kebab-case плутанина в шаблонах.
8. Використати пропс як початкове значення стану й очікувати оновлень: `ref(props.n)` — копія; потрібен `watch`/`computed`.

## 11. Алгоритм

1. `defineProps` з типами, `required`, `default` (фабрики).
2. Дані вниз — пропси, події вгору — `defineEmits`.
3. Потрібна локальна копія → `ref(props.x)` + `watch(() => props.x, …)` або `computed`.
4. Дві сторони → `v-model`.
5. Оголоси всі emits (і валідуй за потреби).

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Передача props вниз.

```js
const Kid = defineComponent({ props: { title: String, n: { type: Number, default: 5 } }, setup(p) { return () => h('p', p.title + ':' + p.n); } }); return html(mount(Kid, { title: 'hi' }));
```

**2.** Значення за замовчуванням та обов'язковий prop.

```js
const Kid = defineComponent({ props: { a: { type: Number, default: 1 }, b: { type: String, required: true } }, setup(p) { return () => h('p', [p.a, p.b ?? 'none'].join(',')); } }); return html(mount(Kid));
```

**3.** Реактивність props: зміна батьківського стану оновлює дитину.

```js
const t = ref('a'); const Kid = defineComponent({ props: ['t'], setup(p) { return () => h('i', p.t); } }); const r = mount(defineComponent({ setup() { return () => h(Kid, { t: t.value }); } })); t.value = 'b'; await tick(); return html(r);
```

**4.** Props лише для читання: спроба змінити.

```js
const Kid = defineComponent({ props: ['n'], setup(p) { p.n = 5; return () => h('p', p.n); } }); return html(mount(Kid, { n: 1 }));
```

### Рівень 2. Деталі й поведінка

**5.** `emit`: подія вгору та payload.

```js
const log = []; const Kid = defineComponent({ emits: ['pick'], setup(_, { emit }) { return () => h('button', { onClick: () => emit('pick', 42, 'x') }, 'go'); } }); const r = mount(defineComponent({ setup() { return () => h(Kid, { onPick: (...a) => log.push(a) }); } })); click(find(r, 'button')); return log;
```

**6.** Подія без оголошення в `emits`: чи спрацьовує обробник?

```js
const log = []; const Kid = defineComponent({ setup(_, { emit }) { return () => h('button', { onClick: () => emit('ping') }, 'go'); } }); const r = mount(defineComponent({ setup() { return () => h(Kid, { onPing: () => log.push('got') }); } })); click(find(r, 'button')); return log;
```

**7.** Валідація емітованої події (об'єктний синтаксис `emits`).

```js
const Kid = defineComponent({ emits: { save: (v) => typeof v === 'number' }, setup(_, { emit }) { return () => h('button', { onClick: () => emit('save', 'not-number') }, 'x'); } }); const log = []; const r = mount(defineComponent({ setup() { return () => h(Kid, { onSave: (v) => log.push(v) }); } })); click(find(r, 'button')); return log;
```

**8.** Нормалізація імен: `kebab-case` та `camelCase` у props.

```js
const Kid = defineComponent({ props: ['userName'], setup(p) { return () => h('p', p.userName); } }); return [html(mount(Kid, { userName: 'a' })), html(mount(Kid, { 'user-name': 'b' }))];
```

### Рівень 3. Нюанси та пастки

**9.** Булеві props: наявність без значення.

```js
const Kid = defineComponent({ props: { on: Boolean }, setup(p) { return () => h('p', String(p.on)); } }); return [html(mount(Kid)), html(mount(Kid, { on: '' })), html(mount(Kid, { on: true }))];
```

**10.** Attrs (неоголошені атрибути) потрапляють у кореневий елемент.

```js
const Kid = defineComponent({ props: ['a'], setup() { return () => h('div', 'x'); } }); return html(mount(Kid, { a: 1, id: 'main', title: 't' }));
```

**11.** `toRefs(props)` і реактивна деструктуризація.

```js
const t = ref('a'); const Kid = defineComponent({ props: ['t'], setup(p) { const { t: tt } = toRefs(p); return () => h('i', tt.value); } }); const r = mount(defineComponent({ setup() { return () => h(Kid, { t: t.value }); } })); t.value = 'z'; await tick(); return html(r);
```

**12.** Об'єкт-проп: мутація батьківського об'єкта оновлює дитину.

```js
const o = reactive({ n: 1 }); const Kid = defineComponent({ props: ['o'], setup(p) { return () => h('i', p.o.n); } }); const r = mount(defineComponent({ setup() { return () => h(Kid, { o }); } })); o.n = 2; await tick(); return html(r);
```

### Рівень 4. Практика

**13.** Чому не можна змінювати props у дочірньому компоненті?

**14.** Для чого оголошувати `emits`?

### Відповіді

1. `'<p>hi:5</p>'`
2. `'<p>1,none</p>'`
3. `'<i>b</i>'`
4. `'<p>1</p>'`
5. `[[42, 'x']]`
6. `['got']`
7. `['not-number']`
8. `['<p>a</p>', '<p>b</p>']`
9. `['<p>false</p>', '<p>true</p>', '<p>true</p>']`
10. `'<div id="main" title="t">x</div>'`
11. `'<i>z</i>'`
12. `'<i>2</i>'`
13. Це односпрямований потік даних: стан належить батькові; дитина повідомляє про зміни через `emit`, а батько оновлює проп
14. Документує події компонента, дає валідацію та запобігає тому, що слухачі потраплять у `attrs` кореневого елемента
