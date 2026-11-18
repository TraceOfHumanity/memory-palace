# React 19: хук `use`

Виміряно на React 19.3.1 (`react-dom` + `jsdom`, `createRoot`).

## 1. Що це

`use(resource)` — новий API React 19, що **читає значення ресурсу** під час рендеру. Ресурс — це **Promise** або **Context**. Особливість: `use` — не зовсім звичайний хук: його **можна викликати умовно** (в `if`, циклах) і після раннього `return`.

```jsx
const data = use(promise);       // чекає проміс (Suspense)
const theme = use(ThemeContext); // читає контекст
```

## 2. `use(Promise)`: як це виконується (реальний вивід)

```jsx
function Child({ k }) { const d = use(getPromise(k)); return <p>{d}</p>; }
<Suspense fallback={<i>loading</i>}><Child k="a" /></Suspense>
```
Лог: `App render | Child render start | Child render start | DOM: <i>loading</i> | Child render start | Child got data-a | DOM: <p>data-a</p>`

Кроки:
1. `Child` рендериться, `use(promise)` бачить, що проміс **ще не виконаний** → React **призупиняє** (suspend) цей компонент: викидає спеціальний сигнал, і найближчий `<Suspense>` показує `fallback` (`<i>loading</i>`).
2. Компонент рендериться ще раз (повторна спроба у dev) — все ще очікування.
3. Проміс виконався → React **перерендерює** `Child` з нуля; `use` тепер одразу повертає значення (`data-a`) → показується `<p>data-a</p>`.
4. Якщо проміс **відхилений** (reject) — помилка кидається в найближчу **error boundary**.

Тіло компонента виконується **кілька разів** — воно має бути чистим.

## 3. Обов'язково: стабільний проміс

Проміс **не можна створювати під час рендеру** (`use(fetch(url))` у компоненті) — при кожній повторній спробі створюється новий проміс → безкінечне очікування. Проміс має приходити:
- з **пропса** від батька (створений у Server Component, обробнику чи кеші),
- з **кешу** (Map за ключем, як у прикладі `getPromise(k)`),
- з бібліотеки (React Query із suspense, Next.js, Relay).
У Server Components можна `await` напряму; `use` корисний для передачі промісу на клієнт.

## 4. `use(Context)`

Робить те саме, що `useContext`, але **можна в умові**. Виміряно: `if (on) { const v = use(Ctx); return <p>{v}</p>; }` → `<p>V</p>`.

## 5. Відмінності від `await`

| | `await` | `use` |
|---|---|---|
| Де | async-функція / Server Component | **звичайний компонент** (client) |
| Як чекає | блокує функцію | **призупиняє** компонент, Suspense показує fallback |
| Повторне виконання | ні | так (перерендер) |

## 6. Відмінності від звичайних хуків

- Можна в `if`/циклі й **після** раннього `return`.
- Не можна в `try/catch` (кидає сигнал призупинення). Помилки → error boundary.
- Лише в компонентах і кастомних хуках.

## 7. Типові помилки

1. `use(fetch(...))` — новий проміс щоразу.
2. Відсутній `<Suspense>` вище → помилка/неочікувана поведінка.
3. Загорнути `use` у `try/catch`.
4. Очікувати, що тіло виконається один раз (воно повторюється).
5. Не додати error boundary для rejected проміса.
6. Створювати проміс у тому ж компоненті, де його читають.
7. Мутувати стан під час рендеру в очікуванні.

## 8. Алгоритм

1. Створи проміс **поза** рендером (батько/кеш/сервер).
2. Передай його в компонент як пропс.
3. Обгорни споживача в `<Suspense fallback>` і error boundary.
4. У компоненті `const data = use(promise)`.
5. Для умовного контексту — `use(Context)`.

## Задачі для закріплення

10 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Що поверне `use(Context)` (читання контексту)?

```jsx
const Ctx = createContext('d');
function C() { return <p>{use(Ctx)}</p>; }
return renderToString(<Ctx.Provider value="v"><C /></Ctx.Provider>);
```

**2.** `use(promise)` у `Suspense`: що показується спершу і після розв'язання?

```jsx
const p = new Promise(r => setTimeout(() => r('data'), 10));
function Kid() { return <p>{use(p)}</p>; }
const t = await mount(<Suspense fallback={<i>loading</i>}><Kid /></Suspense>);
const a = text(t);
await act(async () => { await new Promise(r => setTimeout(r, 40)); });
return [a, text(t)];
```

**3.** Що станеться при відхиленні promise (error boundary)?

```jsx
class EB extends React.Component { state = { e: null }; static getDerivedStateFromError(e) { return { e }; } render() { return this.state.e ? <b>err: {this.state.e.message}</b> : this.props.children; } }
const p = Promise.reject(new Error('fail')); p.catch(() => {});
function Kid() { return <p>{use(p)}</p>; }
const orig = console.error; console.error = () => {};
const t = await mount(<EB><Suspense fallback="l"><Kid /></Suspense></EB>);
await act(async () => { await new Promise(r => setTimeout(r, 20)); });
console.error = orig;
return text(t);
```

### Рівень 2. Деталі й поведінка

**4.** `use` у умовному блоці: чи дозволено?

```jsx
const Ctx = createContext('v');
function C({ on }) { if (on) { const v = use(Ctx); return <p>{v}</p>; } return <p>off</p>; }
return [renderToString(<C on={true} />), renderToString(<C on={false} />)];
```

**5.** `use` у циклі зі списком контекстів.

```jsx
const A = createContext('a'), B = createContext('b');
function C() { const out = []; for (const c of [A, B]) out.push(use(c)); return <p>{out.join('')}</p>; }
return renderToString(<C />);
```

**6.** Чи можна створювати promise в рендері й передавати у `use`? (нестабільний promise)

```jsx
let created = 0;
function Kid() { const p = Promise.resolve('x'); created++; return <p>{use(p)}</p>; }
const orig = console.error; console.error = () => {};
let e = 'none';
try { await mount(<Suspense fallback="l"><Kid /></Suspense>); await act(async () => { await new Promise(r => setTimeout(r, 20)); }); } catch (x) { e = x.name; }
console.error = orig;
return created > 1;
```

### Рівень 3. Нюанси та пастки

**7.** Стабільний promise через `cache`/зовнішню змінну — скільки створено?

```jsx
let created = 0;
const p = (created++, Promise.resolve('ok'));
function Kid() { return <p>{use(p)}</p>; }
const t = await mount(<Suspense fallback="l"><Kid /></Suspense>);
await act(async () => { await new Promise(r => setTimeout(r, 20)); });
return [text(t), created];
```

**8.** Яке значення повертає `use` для вже розв'язаного promise при повторному рендері?

```jsx
const p = Promise.resolve(42);
function Kid({ n }) { return <p>{use(p)}-{n}</p>; }
const t = await mount(<Suspense fallback="l"><Kid n={1} /></Suspense>);
await act(async () => { await new Promise(r => setTimeout(r, 20)); });
await act(async () => { t.update(<Suspense fallback="l"><Kid n={2} /></Suspense>); });
return text(t);
```

**9.** Чим `use` відрізняється від інших хуків?

### Рівень 4. Практика

**10.** Чому promise для `use` не можна створювати прямо у рендері?

### Відповіді

1. `'<p>v</p>'`
2. `['loading', 'data']`
3. `'err: fail'`
4. `['<p>v</p>', '<p>off</p>']`
5. `'<p>ab</p>'`
6. `true`
7. `['ok', 1]`
8. `'42-2'`
9. Його можна викликати в умовах і циклах; він читає значення ресурсу: promise (з призупиненням через Suspense) або контекст
10. Новий promise на кожному рендері призводить до нескінченного очікування; promise створюють поза компонентом, у кеші чи у сервері й передають пропсами
