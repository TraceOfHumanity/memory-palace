# React: `useContext`

Виміряно на React 18.3.1 (`react-test-renderer`) і React 19 (де сказано).

## 1. Що це

Контекст дозволяє передати дані **глибоко в дерево без «prop drilling»** (передавання пропса крізь усі проміжні компоненти). Три частини:

```jsx
const ThemeCtx = createContext("light");           // 1. створення (значення за замовчуванням)
<ThemeCtx.Provider value="dark"> ... </ThemeCtx.Provider>   // 2. провайдер
const theme = useContext(ThemeCtx);                // 3. споживач (читання)
```

`useContext(Ctx)` повертає значення найближчого **вищого** провайдера цього контексту. **React 19:** можна писати `<ThemeCtx value="dark">` (без `.Provider`) — виміряно: працює.

## 2. Як це виконується

1. Компонент викликає `useContext(Ctx)` → React шукає найближчий `Ctx.Provider` вище в дереві.
2. Знайдено → повертається його `value`; не знайдено → **значення за замовчуванням**, передане в `createContext` (виміряно: без провайдера → `"default"`).
3. React записує, що цей компонент **залежить від контексту**.
4. Коли `value` провайдера змінюється (порівняння `Object.is`), React **перерендерює всіх споживачів**, навіть якщо проміжні компоненти обгорнуті в `React.memo`.

Вкладені провайдери: найближчий перемагає. Виміряно: `A.Provider(a1) > B.Provider(b1) > A.Provider(a2) > N` → `N` бачить `a2` та `b1` (`a2b1`).

## 3. Пастка: новий об'єкт у `value`

```jsx
<Ctx.Provider value={{ user, setUser }}>   // новий об'єкт при кожному рендері батька
```
Виміряно: коли батько перерендерився, а `value` — літерал `{ a: 1 }`, споживач **перерендерився навіть за `React.memo`-обгортки** (1 рендер). Зі стабільним значенням (`'x'` або `useMemo`) — **0 рендерів**.
Рішення: `const value = useMemo(() => ({ user, setUser }), [user])`.

## 4. Пастка: один великий контекст

Будь-яка зміна `value` перерендерює **усіх** споживачів, навіть якщо їм потрібна лише частина. Рішення: **розділяй контексти** (дані окремо від `dispatch`, часто змінні окремо від рідко змінних) або використовуй селектори (бібліотеки: Zustand, Jotai, `use-context-selector`).

## 5. Пастка: відсутній провайдер

Значення за замовчуванням може маскувати помилку («забув обгорнути в провайдер» → тихо працює зі значенням за замовчуванням). Типовий патерн — кастомний хук:
```jsx
const Ctx = createContext(null);
function useTheme() {
  const v = useContext(Ctx);
  if (v === null) throw new Error("useTheme має бути всередині ThemeProvider");
  return v;
}
```

## 6. Пастка: `memo` не рятує

`React.memo` блокує перерендер за незмінних **пропсів**, але **не** за зміни контексту, від якого залежить компонент усередині.

## 7. `use(Context)` (React 19)

`use(Ctx)` читає контекст так само, але його **можна викликати умовно** (після `if`, у циклі), на відміну від `useContext`. Виміряно: `if (on) { const v = use(Ctx); ... }` → `<p>V</p>`.

## 8. Коли контекст підходить

Рідко змінні дані «наскрізного» значення: тема, мова, поточний користувач, конфігурація, DI-сервіси. Не підходить для **частих** оновлень (позиція миші, значення поля введення) — перерендер усіх споживачів.

## 9. Типові помилки

1. Новий об'єкт/масив/функція у `value` без `useMemo`/`useCallback`.
2. Один «божественний» контекст на весь застосунок.
3. Забути `Provider` → тихе значення за замовчуванням.
4. Використання для частих змін.
5. Очікування, що `React.memo` ізолює споживача від змін контексту.
6. Циклічні залежності між контекстами.
7. Не розділити `state` і `dispatch` (споживачам лише `dispatch` не треба перерендерюватись).

## 10. Алгоритм

1. `createContext(default)` — один контекст = одна відповідальність.
2. Провайдер: `value` стабільний (`useMemo`).
3. Споживачі: кастомний хук з перевіркою наявності провайдера.
4. Рідко змінне — разом; часто змінне — окремий контекст або зовнішній стор.
5. Для умовного читання (19) — `use(Ctx)`.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що покаже `useContext` без провайдера?

```jsx
const Ctx = createContext('default');
function C() { return <p>{useContext(Ctx)}</p>; }
return renderToString(<C />);
```

**2.** З провайдером.

```jsx
const Ctx = createContext('default');
function C() { return <p>{useContext(Ctx)}</p>; }
return renderToString(<Ctx.Provider value="x"><C /></Ctx.Provider>);
```

**3.** Найближчий провайдер перемагає.

```jsx
const Ctx = createContext('d');
function C() { return <i>{useContext(Ctx)}</i>; }
return renderToString(<Ctx.Provider value="outer"><C /><Ctx.Provider value="inner"><C /></Ctx.Provider></Ctx.Provider>);
```

### Рівень 2. Деталі й поведінка

**4.** Скільки рендерів споживача при зміні значення контексту?

```jsx
const Ctx = createContext(0);
let renders = 0;
function Kid() { renders++; return <p>{useContext(Ctx)}</p>; }
function App({ v }) { return <Ctx.Provider value={v}><Kid /></Ctx.Provider>; }
const t = await mount(<App v={1} />);
await act(async () => { t.update(<App v={2} />); });
await act(async () => { t.update(<App v={2} />); });
return [renders, text(t)];
```

**5.** Об'єкт у `value` створюється щоразу: чи перерендерюється `memo`-споживач?

```jsx
const Ctx = createContext({});
let renders = 0;
const Kid = React.memo(function Kid() { renders++; return <p>{useContext(Ctx).a}</p>; });
function App({ n }) { return <Ctx.Provider value={{ a: 1 }}><Kid /><i>{n}</i></Ctx.Provider>; }
const t = await mount(<App n={1} />);
await act(async () => { t.update(<App n={2} />); });
return renders;
```

**6.** А зі стабільним `value` через `useMemo`.

```jsx
const Ctx = createContext({});
let renders = 0;
const Kid = React.memo(function Kid() { renders++; return <p>{useContext(Ctx).a}</p>; });
function App({ n }) { const v = useMemo(() => ({ a: 1 }), []); return <Ctx.Provider value={v}><Kid /><i>{n}</i></Ctx.Provider>; }
const t = await mount(<App n={1} />);
await act(async () => { t.update(<App n={2} />); });
return renders;
```

### Рівень 3. Нюанси та пастки

**7.** Контекст і `React.memo` проміжного компонента.

```jsx
const Ctx = createContext(0);
let inner = 0;
function Leaf() { inner++; return <p>{useContext(Ctx)}</p>; }
const Mid = React.memo(function Mid() { return <Leaf />; });
function App({ v }) { return <Ctx.Provider value={v}><Mid /></Ctx.Provider>; }
const t = await mount(<App v={1} />);
await act(async () => { t.update(<App v={2} />); });
return [inner, text(t)];
```

**8.** Два різні контексти не впливають один на одного.

```jsx
const A = createContext('a0'), B = createContext('b0');
function C() { return <p>{useContext(A)}-{useContext(B)}</p>; }
return renderToString(<A.Provider value="a1"><C /></A.Provider>);
```

**9.** `use(Context)` у React 19 читає контекст і поза умовами?

```jsx
const Ctx = createContext('v');
function C({ on }) { if (on) return <p>{use(Ctx)}</p>; return <p>off</p>; }
return [renderToString(<Ctx.Provider value="yes"><C on={true} /></Ctx.Provider>), renderToString(<C on={false} />)];
```

### Рівень 4. Практика

**10.** Значення за замовчуванням, коли `value` явно `undefined`.

```jsx
const Ctx = createContext('default');
function C() { return <p>{String(useContext(Ctx))}</p>; }
return renderToString(<Ctx.Provider value={undefined}><C /></Ctx.Provider>);
```

**11.** Яку проблему вирішує контекст?

**12.** Яка головна ціна контексту?

### Відповіді

1. `'<p>default</p>'`
2. `'<p>x</p>'`
3. `'<i>outer</i><i>inner</i>'`
4. `[3, '2']`
5. `2`
6. `1`
7. `[2, '2']`
8. `'<p>a1<!-- -->-<!-- -->b0</p>'`
9. `['<p>yes</p>', '<p>off</p>']`
10. `'<p>undefined</p>'`
11. Передача даних глибоко в дерево без «prop drilling» — через проміжні компоненти, що їх не використовують
12. Кожен споживач перерендерюється при зміні значення провайдера; тому значення стабілізують і розділяють контексти за частотою змін
