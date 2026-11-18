# Vue 3: `nextTick` і планувальник оновлень

Виміряно на Vue 3.5.44 (`vue`, `jsdom`). Теорія планувальника: [reactivity.md](reactivity.md) §7.

## 1. Проблема

Зміна реактивного стану **не оновлює DOM синхронно**. Vue **групує** (batch) зміни й застосовує їх **один раз на мікротаску**. Тому відразу після `count.value++` DOM ще старий.

Виміряно:
```
n.value = 5;
el.innerHTML          // <p id="p">0</p>   ← ще старе
await nextTick();
el.innerHTML          // <p id="p">5</p>   ← оновлено
```

## 2. `nextTick`

`nextTick()` повертає **проміс**, який виконається **після** наступного оновлення DOM; або приймає колбек:
```js
await nextTick();
nextTick(() => { /* DOM оновлено */ });
```
Виміряно: `n.value = 1` → `sync <p>0</p>` → `await nextTick()` → `after nextTick <p>1</p>`; а `const pr = nextTick()` повертає проміс, що розв'язується після рендеру (`resolved <p>2</p>`).

## 3. Групування

Три синхронні зміни → **один** рендер: `n.value = 9; 10; 11;` → `renders: 1`, DOM показує останнє (`11`). Те саме для `watch`: колбек отримує лише **останнє** значення (`watch 0→2`).

## 4. Порядок у одному оновленні (виміряно)

```
pre watcher (flush: 'pre')  →  onBeforeUpdate  →  render  →  [DOM оновлено]  →  post watcher (flush: 'post')  →  onUpdated
```
Колбек `nextTick` виконується **після** DOM-оновлення: `nextTick cb (DOM updated: <p>4</p>)`.

## 5. Типове застосування

```js
list.value.push(item);
await nextTick();
listEl.value.scrollTop = listEl.value.scrollHeight;   // прокрутка після додавання
```
Також: виміряти розмір елемента після зміни, сфокусувати щойно показаний `v-if`-елемент.

## 6. Альтернативи

- `watch(src, cb, { flush: 'post' })` — реакція на конкретну зміну з уже оновленим DOM;
- `watchPostEffect`;
- `onUpdated` — на будь-яке оновлення компонента.

## 7. `nextTick` у хуках

`onMounted(async () => { … await nextTick(); … })` працює: `mounted → after nextTick in mounted`. Після `onMounted` усі дочірні компоненти вже змонтовані, але для `v-if`, що змінився у цьому ж хуку, потрібен `nextTick`.

## 8. Синхронні ефекти

`watch(..., { flush: 'sync' })`/`watchSyncEffect` виконуються **негайно** (виміряно: `sync 5` відразу після присвоєння). Рідко потрібно, може запускатись багато разів.

## 9. Типові помилки

1. Читати DOM відразу після зміни стану.
2. Забути `await` перед `nextTick()`.
3. `setTimeout(…, 0)` замість `nextTick` (повільніше й ненадійно).
4. Використовувати `nextTick` там, де достатньо `flush: 'post'`.
5. Масове використання `nextTick` для «лікування» неправильного дизайну (зміни стану в `onUpdated`).
6. Очікувати проміжні значення в `watch` (їх групують).

## 10. Алгоритм

1. Змінив стан → DOM оновиться в наступній мікротаску.
2. Потрібно прочитати оновлений DOM → `await nextTick()`.
3. Реакція на конкретне джерело → `watch(…, { flush: 'post' })`.
4. Не змінюй стан у `onUpdated`.

## Задачі для закріплення

11 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** DOM оновлюється асинхронно: що в DOM одразу після зміни та після `nextTick`?

```js
const n = ref('a'); const r = mount(defineComponent({ setup() { return () => h('p', n.value); } })); n.value = 'b'; const now = html(r); await nextTick(); return [now, html(r)];
```

**2.** Порядок: `nextTick` після `watch` (pre) та ефектів рендеру.

```js
const n = ref(0); const log = []; watch(n, () => log.push('watch')); const C = defineComponent({ setup() { return () => { log.push('render'); return h('p', n.value); }; } }); const r = mount(C); log.length = 0; n.value = 1; await nextTick(() => log.push('tick-cb')); return log;
```

**3.** Скільки рендерів компонента при трьох змінах поспіль?

```js
const n = ref(0); let renders = 0; const r = mount(defineComponent({ setup() { return () => { renders++; return h('p', n.value); }; } })); const b = renders; n.value = 1; n.value = 2; n.value = 3; await nextTick(); return [renders - b, html(r)];
```

### Рівень 2. Деталі й поведінка

**4.** `nextTick` повертає promise.

```js
const p = nextTick(); return [p instanceof Promise, await p];
```

**5.** Колбек `nextTick(cb)` та `await nextTick()`.

```js
const log = []; nextTick(() => log.push('cb')); await nextTick(); log.push('after'); return log;
```

**6.** Чи доступний оновлений DOM у `watch` з `flush: 'post'`?

```js
const n = ref('a'); let seen; const r = mount(defineComponent({ setup() { watch(n, () => { seen = html(r); }, { flush: 'post' }); return () => h('p', n.value); } })); n.value = 'b'; await nextTick(); return seen;
```

### Рівень 3. Нюанси та пастки

**7.** А з `flush: 'pre'` (за замовчуванням)?

```js
const n = ref('a'); let seen; const r = mount(defineComponent({ setup() { watch(n, () => { seen = html(r); }); return () => h('p', n.value); } })); n.value = 'b'; await nextTick(); return seen;
```

**8.** `nextTick` усередині обробника події.

```js
const n = ref(0); const r = mount(defineComponent({ setup() { return () => h('button', { onClick: async () => { n.value++; const a = html(r); await nextTick(); log.push([a, html(r)]); } }, n.value); } })); const log = []; click(find(r, 'button')); await sleep(5); return log;
```

**9.** Мікрозадачі: `Promise.resolve().then` проти `nextTick`.

```js
const log = []; const n = ref(0); watchEffect(() => { n.value; log.push('effect'); }, { flush: 'post' }); n.value = 1; Promise.resolve().then(() => log.push('promise')); await nextTick(); log.push('tick'); return log;
```

### Рівень 4. Практика

**10.** Навіщо `nextTick`?

**11.** Чому DOM оновлюється асинхронно?

### Відповіді

1. `['<p>a</p>', '<p>b</p>']`
2. `['watch', 'render', 'tick-cb']`
3. `[1, '<p>3</p>']`
4. `[true, undefined]`
5. `['cb', 'after']`
6. `'<p>b</p>'`
7. `'<p>a</p>'`
8. `[['<button>0</button>', '<button>1</button>']]`
9. `['effect', 'promise', 'tick']`
10. Дозволяє дочекатися, поки Vue застосує накопичені зміни до DOM, перш ніж читати розміри чи фокусувати елемент
11. Vue групує зміни стану в один цикл оновлення, щоб не перерендерювати компонент після кожного присвоєння
