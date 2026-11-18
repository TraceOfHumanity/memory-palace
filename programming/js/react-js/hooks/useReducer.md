# React: `useReducer`

Виміряно на React 18.3.1 (`react-test-renderer`, `react-dom` + `jsdom`).

## 1. Що це

`useReducer` — альтернатива `useState` для **складного стану**, де нове значення залежить від **дії (action)**. Логіка переходів винесена в чисту функцію **reducer**.

```jsx
const [state, dispatch] = useReducer(reducer, initialArg, init?);

function reducer(state, action) {
  switch (action.type) {
    case "inc": return { ...state, count: state.count + 1 };
    case "reset": return { count: 0 };
    default: throw new Error("Unknown action " + action.type);
  }
}
dispatch({ type: "inc" });
```

## 2. Як це виконується покроково

1. Перший рендер: `state = initialArg` (або результат `init(initialArg)`).
2. Подія → `dispatch(action)`. React **кладе action у чергу** і планує рендер.
3. Під час наступного рендеру React викликає `reducer(prevState, action)` для кожного action з черги по порядку; результат — новий `state`.
4. Компонент рендериться з новим станом.

Виміряно: два `dispatch({type:'inc'})` в одному обробнику → **один** рендер, стан `2`, reducer викликався **2 рази**.

## 3. Властивості

- **`dispatch` стабільний**: його посилання не змінюється між рендерами (виміряно: `true`) — можна безпечно передавати в пропси та залежності, не викликаючи зайвих рендерів.
- **Лінива ініціалізація** (3-й аргумент): `useReducer(red, 5, init => init * 2)` → стан `10`, `init` викликався **1 раз** (виміряно).
- **Bail-out:** якщо reducer повернув **той самий state** (`Object.is`), рендеру немає (в React 18 reducer може бути викликаний, але перерендеру не буде).
- **Strict Mode:** у dev reducer викликається **двічі** для кожного dispatch (виміряно: 2 виклики на 1 dispatch) — тому він має бути чистим.

## 4. Reducer має бути чистим

- без мутації `state` (повертай новий об'єкт),
- без побічних ефектів (запити, `Math.random()`, `Date.now()`, `console.log` для логіки),
- результат залежить лише від `(state, action)`.

## 5. `useReducer` чи `useState`

| | `useState` | `useReducer` |
|---|---|---|
| Простий стан (число, рядок, прапорець) | ✔ | надмірно |
| Кілька пов'язаних полів, складні переходи | громіздко | ✔ |
| Наступний стан залежить від попереднього | `prev => ...` | ✔ природно |
| Тестування логіки | у компоненті | **reducer — звичайна функція** |
| Передача змін у глибину дерева | багато колбеків | один `dispatch` |

## 6. Патерн: reducer + context

```jsx
const StateCtx = createContext(null);
const DispatchCtx = createContext(null);
function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </DispatchCtx.Provider>
  );
}
```
Компоненти, що лише викликають `dispatch`, не перерендеряться при зміні стану (стабільний `dispatch`).

## 7. Типові помилки

1. Мутація `state` у reducer (`state.items.push(...)`).
2. Побічні ефекти в reducer.
3. Забути `default` (мовчки ігнорується невідомий action).
4. `dispatch` без `type` або з нестабільною формою action.
5. Використовувати `useReducer` для простого прапорця.
6. Класти у `action` весь стан замість події («що сталось», а не «яким став стан»).
7. Асинхронність у reducer — запит роби в обробнику/ефекті, а у `dispatch` передавай результат.
8. Очікувати, що `state` оновиться одразу після `dispatch` (так само, як з `setState`).

## 8. Алгоритм

1. Склади список **подій** (action types).
2. Напиши чистий `reducer(state, action)` з `switch`.
3. Початковий стан (або `init` для лінивої ініціалізації).
4. Викликай `dispatch({type, payload})` з обробників.
5. Тестуй reducer окремо — це просто функція.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що відрендерить редюсер після `inc` двічі?

```jsx
const reducer = (s, a) => { switch (a.type) { case 'inc': return { n: s.n + 1 }; case 'add': return { n: s.n + a.by }; case 'reset': return { n: 0 }; default: throw new Error('unknown ' + a.type); } };
function C() { const [s, d] = useReducer(reducer, { n: 0 }); return <button onClick={() => { d({ type: 'inc' }); d({ type: 'inc' }); }}>{s.n}</button>; }
const r = await mount(<C />);
await press(r);
return text(r);
```

**2.** `add` з payload.

```jsx
const reducer = (s, a) => { switch (a.type) { case 'inc': return { n: s.n + 1 }; case 'add': return { n: s.n + a.by }; case 'reset': return { n: 0 }; default: throw new Error('unknown ' + a.type); } };
function C() { const [s, d] = useReducer(reducer, { n: 1 }); return <button onClick={() => d({ type: 'add', by: 10 })}>{s.n}</button>; }
const r = await mount(<C />);
await press(r);
return text(r);
```

**3.** Що станеться при невідомій дії?

```jsx
const reducer = (s, a) => { switch (a.type) { case 'inc': return { n: s.n + 1 }; case 'add': return { n: s.n + a.by }; case 'reset': return { n: 0 }; default: throw new Error('unknown ' + a.type); } };
function C() { const [s, d] = useReducer(reducer, { n: 0 }); return <button onClick={() => d({ type: 'zzz' })}>{s.n}</button>; }
const r = await mount(<C />);
let err;
try { await press(r); } catch (e) { err = e.message; }
return err;
```

### Рівень 2. Деталі й поведінка

**4.** Чи є `dispatch` стабільною функцією між рендерами?

```jsx
const reducer = (s, a) => { switch (a.type) { case 'inc': return { n: s.n + 1 }; case 'add': return { n: s.n + a.by }; case 'reset': return { n: 0 }; default: throw new Error('unknown ' + a.type); } };
const seen = new Set();
function C() { const [s, d] = useReducer(reducer, { n: 0 }); seen.add(d); return <button onClick={() => d({ type: 'inc' })}>{s.n}</button>; }
const r = await mount(<C />);
await press(r); await press(r);
return seen.size;
```

**5.** Ліниве ініціалізування третім аргументом.

```jsx
let calls = 0;
function C() { const [n] = useReducer((s) => s, 5, (x) => { calls++; return x * 2; }); return <p>{n}</p>; }
const r = await mount(<C />);
await act(async () => { r.update(<C />); });
return [text(r), calls];
```

**6.** Bail-out: повернення того ж стану не викликає рендеру?

```jsx
let renders = 0;
function C() { renders++; const [s, d] = useReducer((s) => s, { n: 0 }); return <button onClick={() => d({})}>{s.n}</button>; }
const r = await mount(<C />);
const b = renders;
await press(r);
return [b, renders];
```

### Рівень 3. Нюанси та пастки

**7.** Порівняйте з `useState` для складного стану: список із `add`/`remove`.

```jsx
const red = (s, a) => a.type === 'add' ? [...s, a.v] : s.filter(x => x !== a.v);
function C() { const [l, d] = useReducer(red, ['a']); return <button onClick={() => { d({ type: 'add', v: 'b' }); d({ type: 'add', v: 'c' }); d({ type: 'remove', v: 'a' }); }}>{l.join(',')}</button>; }
const r = await mount(<C />);
await press(r);
return text(r);
```

**8.** Чи залежать результати редюсера від порядку диспатчів?

```jsx
const red = (s, a) => a === 'double' ? s * 2 : s + 1;
function C({ order }) { const [n, d] = useReducer(red, 1); return <button onClick={() => order.forEach(d)}>{n}</button>; }
const a = await mount(<C order={['double', 'inc']} />); await press(a);
const b = await mount(<C order={['inc', 'double']} />); await press(b);
return [text(a), text(b)];
```

**9.** Редюсер у StrictMode викликається двічі?

```jsx
let calls = 0;
const red = (s) => { calls++; return s + 1; };
function C() { const [n, d] = useReducer(red, 0); return <button onClick={() => d()}>{n}</button>; }
const r = await mount(<React.StrictMode><C /></React.StrictMode>);
const before = calls;
await press(r);
return [text(r), calls - before];
```

### Рівень 4. Практика

**10.** Дія-функція: `dispatch` із колбеком вимагає thunk-обробки? (передача функції як дії)

```jsx
const red = (s, a) => typeof a === 'function' ? a(s) : s;
function C() { const [n, d] = useReducer(red, 1); return <button onClick={() => d((s) => s + 1)}>{n}</button>; }
const r = await mount(<C />);
await press(r);
return text(r);
```

**11.** Коли `useReducer` краще за `useState`?

**12.** Яка вимога до редюсера?

### Відповіді

1. `'2'`
2. `'11'`
3. `'unknown zzz'`
4. `1`
5. `['10', 1]`
6. `[1, 2]`
7. `'b,c'`
8. `['3', '4']`
9. `['1', 2]`
10. `'2'`
11. Коли стан складний, оновлення залежать одне від одного або логіку змін зручно описати іменованими діями в одному місці й тестувати окремо
12. Він має бути чистою функцією: без побічних ефектів і мутацій, повертає новий стан
