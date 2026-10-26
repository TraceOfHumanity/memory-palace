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
