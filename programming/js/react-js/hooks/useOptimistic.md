# React 19: `useOptimistic`

Виміряно на React 19.3.1 (`react-dom` + `jsdom`).

## 1. Що це

**Оптимістичне оновлення**: показати результат дії **одразу**, не чекаючи відповіді сервера, а потім підтвердити або відкотити. `useOptimistic(state, reducer?)` повертає **тимчасову копію стану**, що діє **лише поки триває асинхронна дія (transition/Action)**; коли дія завершується — React автоматично повертається до **справжнього стану**.

```jsx
const [optimisticItems, addOptimistic] = useOptimistic(
  items,                                          // «справжній» стан
  (current, newItem) => [...current, { ...newItem, pending: true }]   // як застосувати оптимістичне значення
);
```

## 2. Як це виконується (реальний вивід)

```jsx
start(async () => {
  addOptimistic("b");            // 1. миттєво
  await sleep(30);               // 2. «запит на сервер»
  setItems((x) => [...x, "b"]);  // 3. справжній стан
});
```
Рендери:
```
render items=["a"] optimistic=["a","b (pending)"]   ← 1. оптимістичне значення видно одразу
…                                                      2. очікування
render items=["a","b"] optimistic=["a","b"]         ← 3. дія завершилась: optimistic = справжній стан
```
Кроки:
1. `addOptimistic(v)` **має викликатись усередині Action/transition** (`startTransition`, функція форми `action`).
2. React показує `reducer(items, v)` поверх справжнього стану.
3. Коли Action завершується (проміс виконано), оптимістичний шар **знімається**, і показується вже оновлений `items`.
4. Якщо запит **впав** і `setItems` не викликали — після завершення Action `optimistic` автоматично **відкотиться** до старого `items`.
(Під час самого переходу можливий проміжний рендер, де `items` уже оновлений, а оптимістичний шар ще не знятий, — перевіряй, що UI коректний, а `key`-и не дублюються.)

## 3. Типовий сценарій: чат / лайки / список

```jsx
async function send(formData) {
  addOptimistic({ id: crypto.randomUUID(), text: formData.get("text"), pending: true });
  const saved = await api.send(formData.get("text"));
  setMessages((m) => [...m, saved]);
}
<form action={send}>…</form>
```
Позначай `pending`, щоб показати приглушений вигляд, поки дія не підтверджена.

## 4. Важливо

- Оптимістичний стан — **похідний** від справжнього; джерелом істини лишається `useState`/сервер.
- `addOptimistic` поза Action — попередження, оновлення не діє належним чином.
- Reducer має бути чистим.
- Використовуй **стабільні `key`**: тимчасовий елемент і підтверджений мають різні id, або замінюйте за temp-id.

## 5. Типові помилки

1. Викликати `addOptimistic` поза `startTransition`/Action.
2. Не оновити справжній стан після успіху → елемент «зникне» після завершення Action.
3. Не показувати стан `pending` / не обробляти помилку (UI відкотиться «мовчки»).
4. Дублікати в списку через однакові `key` для тимчасового та підтвердженого елемента.
5. Мутувати масив у reducer.
6. Використовувати як заміну звичайного стану (він тимчасовий).

## 6. Алгоритм

1. Дані в `useState` (джерело істини).
2. `useOptimistic(data, reducer)`.
3. Дія (form `action` або `startTransition(async …)`): спершу `addOptimistic(...)`.
4. `await` мережевий запит.
5. Успіх → оновити справжній стан. Помилка → показати повідомлення (оптимістичний шар зникне сам).

## Задачі для закріплення

7 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Початкове оптимістичне значення збігається зі справжнім.

```jsx
function C() { const [o] = useOptimistic('real'); return <p>{o}</p>; }
return renderToString(<C />);
```

**2.** Оптимістичне оновлення під час дії та повернення до справжнього після.

```jsx
const log = [];
function C() { const [real, setReal] = useState('a'); const [o, add] = useOptimistic(real, (cur, v) => v); log.push(o); return <button onClick={() => startTransition(async () => { add('b'); await new Promise(r => setTimeout(r, 15)); setReal('b'); })}>{o}</button>; }
const t = await mount(<C />);
await press(t);
await act(async () => { await new Promise(r => setTimeout(r, 50)); });
return [log.includes('b'), text(t)];
```

### Рівень 2. Деталі й поведінка

**3.** Якщо дія завершилась помилкою — що покаже інтерфейс?

```jsx
function C() { const [real] = useState('a'); const [o, add] = useOptimistic(real, (c, v) => v); return <button onClick={() => startTransition(async () => { add('x'); await new Promise(r => setTimeout(r, 10)); })}>{o}</button>; }
const t = await mount(<C />);
await press(t);
const during = text(t);
await act(async () => { await new Promise(r => setTimeout(r, 40)); });
return [during, text(t)];
```

**4.** Оптимістичне додавання до списку з редюсером.

```jsx
function C() { const [items, setItems] = useState(['a']); const [o, add] = useOptimistic(items, (cur, v) => [...cur, v + '*']); return <button onClick={() => startTransition(async () => { add('b'); await new Promise(r => setTimeout(r, 15)); setItems(i => [...i, 'b']); })}>{o.join(',')}</button>; }
const t = await mount(<C />);
await press(t);
const during = text(t);
await act(async () => { await new Promise(r => setTimeout(r, 50)); });
return [during, text(t)];
```

### Рівень 3. Нюанси та пастки

**5.** Чи працює `addOptimistic` поза transition (діагностика)?

```jsx
const errs = [];
const orig = console.error; console.error = (...a) => errs.push(String(a[0]).slice(0, 40));
function C() { const [o, add] = useOptimistic('a', (c, v) => v); return <button onClick={() => add('b')}>{o}</button>; }
const t = await mount(<C />);
await press(t);
console.error = orig;
return [text(t), errs.length > 0];
```

**6.** Для чого `useOptimistic`?

### Рівень 4. Практика

**7.** Коли оптимістичне значення скидається?

### Відповіді

1. `'<p>real</p>'`
2. `[true, 'b']`
3. `['x', 'a']`
4. `['a,b*', 'a,b']`
5. `['a', true]`
6. Показує миттєвий результат дії до відповіді сервера; коли дія завершується, інтерфейс автоматично повертається до справжнього стану
7. Після завершення transition/дії, у якій було викликано `addOptimistic`
