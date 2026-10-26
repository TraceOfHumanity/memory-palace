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
