# Vue 3: `setup`, `<script setup>`, async setup і `<Suspense>`

Виміряно на Vue 3.5.44 (`vue`, `jsdom`). `<Suspense>` у Vue 3 — **експериментальна** функція (у консолі: `<Suspense> is an experimental feature and its API will likely change.`).

## 1. `setup()`

Точка входу Composition API: виконується **один раз** при створенні екземпляра (після ініціалізації props, перед `beforeMount`). Повертає або **об'єкт** (стан для шаблону), або **render-функцію**.
```js
setup(props, { emit, expose, attrs, slots }) {
  const n = ref(0);
  return { n };                 // у шаблоні доступний як {{ n }}
}
```
Виміряно: `setup` повернув `{ x: 1 }`, а Options-API-метод `mounted()` бачить `this.x` (= `1`) і `this.y` з `data()`.
- `this` усередині `setup` **недоступний**.
- Ref верхнього рівня з об'єкта розгортаються в шаблоні автоматично.

## 2. `<script setup>`

Синтаксичний цукор (компілюється у `setup`): усе, оголошене на верхньому рівні, **автоматично доступне в шаблоні**, імпортовані компоненти використовуються без реєстрації. Макроси: `defineProps`, `defineEmits`, `defineExpose`, `defineModel`, `defineOptions`, `defineSlots`. Компонент за замовчуванням «закритий» (ref на нього бачить лише `defineExpose`).

## 3. async `setup` і `await`

`setup` може бути `async` — тоді компонент потребує `<Suspense>` вище:
```js
const AsyncChild = defineComponent({
  async setup() {
    const data = await fetchData();      // компонент «призупинено»
    return () => h("p", data);
  },
});
```
У `<script setup>` достатньо **top-level `await`** — Vue автоматично зробить `setup` async і підніме контекст.

## 4. `<Suspense>`: слоти `default` і `fallback`

```vue
<Suspense>
  <AsyncChild />
  <template #fallback><Spinner /></template>
</Suspense>
```
Виміряно: спершу `<i>loading</i>`, через 30 мс `<p>async</p>`. `Suspense` чекає **усі** асинхронні залежності в піддереві; події `@pending`, `@resolve`, `@fallback`.
Після першого розв'язання повторне оновлення не показує fallback (лише `timeout`-логіка/нове `Suspense`).

## 5. Пастка: хуки життєвого циклу після `await`

У **звичайному** async `setup()` активний екземпляр компонента втрачається після першого `await`. Виміряно: `onMounted` після `await` → `[Vue warn]: onMounted is called when there is no active component instance… If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
Правила:
- реєструй `onMounted`/`watch`/`provide`/`inject` **до першого `await`**;
- у `<script setup>` компілятор автоматично відновлює контекст після `await` (тому там це працює).

## 6. Обробка помилок у Suspense

Reject у async `setup` → помилка піде в `onErrorCaptured` батька (див. [lifecycle-extra.md](lifecycle-extra.md)). Обгортай `Suspense` у компонент-межу помилок, що показує запасний вигляд.

## 7. Альтернативи async setup

- Запит у `onMounted` + локальний стан `loading`/`error` (компонент рендериться одразу, дані — пізніше);
- `watchEffect`/композабл `useFetch` — без `Suspense`;
- Nuxt `useAsyncData`/`useFetch` — серверний рендер із даними.

## 8. Типові помилки

1. async `setup` без `<Suspense>` — компонент не відрендериться.
2. Хуки/`provide` після `await` (поза `<script setup>`).
3. Не передбачити fallback/помилку.
4. Покладатись на стабільність API `Suspense` у продакшені без тестів.
5. Очікувати, що `setup` виконується при кожному оновленні.
6. Робити тяжкий синхронний код у `setup` (блокує створення).
7. Забути `defineExpose` у `<script setup>`, коли батько користується ref.

## 9. Алгоритм

1. Стан і логіка — у `<script setup>`.
2. Асинхронна ініціалізація: top-level `await` + `<Suspense>` із `#fallback`.
3. У класичному async `setup` — хуки до першого `await`.
4. Помилки → `onErrorCaptured`.
5. Альтернатива без Suspense — `onMounted` + `loading`/`error`.
