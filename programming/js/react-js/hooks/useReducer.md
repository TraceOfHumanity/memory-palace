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
