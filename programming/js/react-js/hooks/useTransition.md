# React: `useTransition` і `startTransition`

Виміряно на React 18.3.1 (`react-dom` + `jsdom`, `createRoot`) і React 19.

## 1. Що це

Не всі оновлення стану однаково термінові. Введення тексту має відгукуватись миттєво (**термінове**), а фільтрація великого списку може трохи почекати (**нетермінове — transition**). `useTransition` дозволяє позначити оновлення як **перехід**: React рендерить його з **нижчим пріоритетом** і **може перервати**, якщо надійшло термінове.

```jsx
const [isPending, startTransition] = useTransition();
startTransition(() => { setList(filter(query)); });   // нетермінове оновлення
```
- `isPending` — `true`, поки перехід рендериться (можна показати індикатор);
- `startTransition(fn)` — виконує `fn` синхронно, а всі `setState`, **викликані всередині**, стають переходом.

Без хука існує просто `import { startTransition } from "react"` (без `isPending`).

## 2. Як це виконується (реальний вивід)

Компонент: `input` (стан `q`) + список, що залежить від `deferredQ`. У обробнику: `setQ(v); startTransition(() => setD(v));`.

```
App render input="a" list="" isPending=true      ← 1. термінове: input оновлено, перехід «в очікуванні»
List render q=                                     (список ще старий)
App render input="a" list="a" isPending=false    ← 2. перехід завершено
List render q=a                                    (список оновлено)
```
Кроки:
1. `setQ(v)` — термінове: рендер з новим input і `isPending = true` (список лишається старим).
2. `setD(v)` в `startTransition` — рендериться у фоні з низьким пріоритетом.
3. Якщо тим часом користувач друкує далі — React **кидає** незавершений рендер переходу і починає з новим значенням.
4. Готово → фінальний рендер із `isPending = false`.

## 3. Що важливо розуміти

- Transition **не відкладає виконання** (не `setTimeout`) і **не зменшує** обсяг роботи; він лише дає змогу **перервати** й **не блокувати** UI.
- Всередині `startTransition` можна позначати **лише оновлення стану** (синхронні `setState`), а не довільний код. Колбек виконується одразу.
- **Керовані поля введення** (`<input value=…>`) не можна ставити в transition — стан поля має бути терміновим, інакше введення «лагатиме».
- Transition зберігає **вже показаний UI** і не замінює його fallback'ом `Suspense` (замість спінера лишається старий вміст + `isPending`).
- React 19: у `startTransition` можна передавати **async-функцію** (Actions): `isPending` лишається `true` до завершення проміса. `setState` **після `await`** треба знову обгортати в `startTransition`.

Виміряно: `startTransition(() => setN(1))` — один рендер із новим значенням.

## 4. Коли використовувати

- Дорога фільтрація/сортування/рендер великого списку, що залежить від введення.
- Перемикання вкладок з важким вмістом (щоб не «підвисав» клік).
- Навігація між екранами з завантаженням даних (разом із Suspense).

## 5. `useTransition` чи `useDeferredValue`

- `useTransition` — коли ти **контролюєш місце**, де викликається `setState`: обгортаєш саме оновлення.
- `useDeferredValue` — коли значення приходить **ззовні** (пропс) і ти не контролюєш оновлення; відкладається **значення**.

## 6. Типові помилки

1. Обгортати **керований input** у transition.
2. Чекати, що transition «пришвидшить» рендер — він лише не блокує.
3. Викликати у `startTransition` асинхронний код і очікувати, що `setState` після `await` теж буде переходом (у 18 — ні; у 19 треба повторити обгортку).
4. Використовувати `startTransition` для термінових оновлень (клік, введення).
5. Ігнорувати `isPending` — користувач не бачить, що щось відбувається.
6. Довгі синхронні обчислення в самому компоненті все одно блокують — transition допомагає лише перервати **React-рендер**.

## 7. Алгоритм

1. Визнач термінове (введення, клік) і нетермінове (результат фільтрації).
2. Термінове → звичайний `setState`.
3. Нетермінове → `startTransition(() => setState(...))`.
4. Покажи `isPending` (спінер/приглушення).
5. Дорогий дочірній компонент — додатково `React.memo`.

## Задачі для закріплення

8 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що повертає `useTransition`?

```jsx
function C() { const r = useTransition(); return <p>{[Array.isArray(r), r.length, typeof r[0], typeof r[1]].join(',')}</p>; }
return renderToString(<C />);
```

**2.** Значення `isPending` до і під час переходу.

```jsx
const log = [];
function C() { const [p, start] = useTransition(); const [n, setN] = useState(0); log.push(p); return <button onClick={() => start(() => setN(x => x + 1))}>{n}</button>; }
const t = await mount(<C />);
await press(t);
return [text(t), log];
```

### Рівень 2. Деталі й поведінка

**3.** Чи застосовується оновлення стану всередині `startTransition`?

```jsx
function C() { const [n, setN] = useState(0); return <button onClick={() => startTransition(() => setN(5))}>{n}</button>; }
const t = await mount(<C />);
await press(t);
return text(t);
```

**4.** Тип `startTransition` без хука та без `isPending`.

```jsx
return [typeof startTransition, typeof React.startTransition];
```

### Рівень 3. Нюанси та пастки

**5.** Асинхронна дія в transition (React 19).

```jsx
function C() { const [p, start] = useTransition(); const [n, setN] = useState(0); return <button onClick={() => start(async () => { await new Promise(r => setTimeout(r, 5)); setN(7); })}>{n}</button>; }
const t = await mount(<C />);
await press(t);
await act(async () => { await new Promise(r => setTimeout(r, 30)); });
return text(t);
```

**6.** Помилка в transition: де вона з'являється?

```jsx
function C() { const [p, start] = useTransition(); return <button onClick={() => start(() => { throw new Error('boom'); })}>x</button>; }
const t = await mount(<C />);
let err = 'none';
try { await press(t); } catch (e) { err = e.message; }
return err;
```

### Рівень 4. Практика

**7.** Що робить `useTransition`?

**8.** Чим перехід відрізняється від `setTimeout`/debounce?

### Відповіді

1. `'<p>true,2,boolean,function</p>'`
2. `['1', [false, true, false]]`
3. `'5'`
4. `['function', 'function']`
5. `'7'`
6. `'boom'`
7. Позначає оновлення стану як неюрґентне (переривне): інтерфейс лишається чуйним, а `isPending` дозволяє показати індикатор
8. Не додає штучної затримки; React готує нове дерево у фоні та може перервати його через термінові оновлення (ввід тексту)
