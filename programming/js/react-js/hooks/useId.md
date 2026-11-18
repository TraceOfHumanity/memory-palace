# React: `useId`

Виміряно на React 18.3.1 (`react-dom/server`, `react-test-renderer`) і React 19 (`react-dom/client`, `react-dom/server`).

## 1. Що це

`useId()` генерує **унікальний, стабільний рядок-ідентифікатор**, однаковий на сервері та клієнті. Призначення — зв'язування елементів у атрибутах доступності: `<label htmlFor>` ↔ `<input id>`, `aria-describedby`, `aria-labelledby`.

```jsx
function Field({ label }) {
  const id = useId();
  return (<><label htmlFor={id}>{label}</label><input id={id} /></>);
}
```
Кожен виклик у кожному екземплярі компонента дає **інший** id → два однакові поля на сторінці не конфліктують.

## 2. Навіщо, якщо можна `Math.random()` чи лічильник

- Під час **SSR + hydration** сервер і клієнт мають згенерувати **той самий** id, інакше «hydration mismatch». `Math.random()` і глобальні лічильники дають різні значення.
- `useId` будується з **позиції компонента в дереві**, тому детермінований.

## 3. Формат (виміряно)

| Середовище | Приклад |
|---|---|
| React 18.3, сервер (`renderToString`) | `:R1:`, `:R2:` (великий `R`) |
| React 18.3, клієнт | `:r0:` (малий `r`) |
| React 19, сервер | `_R_0_` |
| React 19, клієнт | `_r_0_` |

Формат — деталь реалізації: **не парси його і не покладайся на нього** (змінювався між версіями). Не використовуй у CSS-селекторах (двокрапки) без екранування; у React 19 символи змінено на CSS-безпечніші.

Два виклики в одному дереві: `<div><label for=":R1:">…</label><label for=":R2:">…</label></div>` — різні значення для різних екземплярів.

## 4. Кілька id в одному компоненті

Викликай `useId` **один раз** і додавай суфікси:
```jsx
const id = useId();
<label htmlFor={id + "-name"}>…</label><input id={id + "-name"} />
<input id={id + "-email"} />
```
Виміряно: `:R0:-name`, `:R0:-email`.

## 5. Чого НЕ можна

- **Не для `key`** у списках: ключ має бути стабільним ідентифікатором **даних**, а не генеруватись у рендері.
- Не як ідентифікатор для БД/URL — він унікальний лише в межах дерева React.
- Не парсити й не порівнювати як числа.
- Не викликати умовно (правила хуків).

## 6. Кілька коренів на сторінці

Якщо на сторінці кілька React-коренів, задай `identifierPrefix` у `createRoot`/`hydrateRoot`, щоб id не збігалися між коренями.

## 7. Типові помилки

1. `Math.random()`/`uuid()` для `id` у SSR → hydration mismatch.
2. `useId` для `key` у списку.
3. Кілька `useId` у циклі/умовно.
4. Використати id у CSS-селекторі без екранування двокрапок (React 18).
5. Покладатись на конкретний формат рядка.
6. Забути про `identifierPrefix` при кількох коренях.

## 8. Алгоритм

1. Потрібен унікальний id для `htmlFor`/`aria-*` → `const id = useId()`.
2. Потрібно кілька → `id + "-суфікс"`.
3. `key` у списку → ID з даних, **не** `useId`.
4. Кілька коренів → `identifierPrefix`.

## Задачі для закріплення

10 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(el)` монтує елемент через `act`, `press(r)` викликає `onClick` кнопки, `text(r)` повертає текст результату; `create` і `act` беруться з `react-test-renderer`, `renderToString` — з `react-dom/server`, хуки — з `react`.

### Рівень 1. Основи

**1.** Який формат має `useId`?

```jsx
function C() { const id = useId(); return <p>{id}</p>; }
return renderToString(<C />);
```

**2.** Чи різні `id` для двох викликів в одному компоненті?

```jsx
function C() { const a = useId(), b = useId(); return <p>{a === b ? 'same' : 'diff'}</p>; }
return renderToString(<C />);
```

**3.** Чи різні `id` для двох екземплярів?

```jsx
function F() { const id = useId(); return <label htmlFor={id}>{id}</label>; }
return renderToString(<div><F /><F /></div>);
```

### Рівень 2. Деталі й поведінка

**4.** Чи стабільний `id` між рендерами клієнта?

```jsx
const seen = new Set();
function C({ n }) { const id = useId(); seen.add(id); return <p>{n}</p>; }
const t = await mount(<C n={1} />);
await act(async () => { t.update(<C n={2} />); });
return seen.size;
```

**5.** Чи однаковий `id` на сервері та клієнті (гідратація)? Порівняйте два `renderToString` одного дерева.

```jsx
function C() { const id = useId(); return <p>{id}</p>; }
return renderToString(<C />) === renderToString(<C />);
```

**6.** Побудова зв'язаних атрибутів: `htmlFor` та `id` та суфікси.

```jsx
function Field() { const id = useId(); return <div><label htmlFor={id + '-input'}>L</label><input id={id + '-input'} /></div>; }
return renderToString(<Field />);
```

### Рівень 3. Нюанси та пастки

**7.** Чи підходить `useId` для ключів списку?

```jsx
function C() { const id = useId(); return <p>{id.length > 0 ? 'has id' : 'empty'}</p>; }
return renderToString(<C />);
```

**8.** Префікс `identifierPrefix` у `renderToString`.

```jsx
function C() { const id = useId(); return <p>{id}</p>; }
return renderToString(<C />, { identifierPrefix: 'app-' });
```

**9.** Навіщо потрібен `useId`?

### Рівень 4. Практика

**10.** Чому не можна замінити його `Math.random()` або лічильником?

### Відповіді

1. `'<p>_R_0_</p>'`
2. `'<p>diff</p>'`
3. `'<div><label for="_R_1_">_R_1_</label><label for="_R_2_">_R_2_</label></div>'`
4. `1`
5. `true`
6. `'<div><label for="_R_0_-input">L</label><input id="_R_0_-input"/></div>'`
7. `'<p>has id</p>'`
8. `'<p>_app-R_0_</p>'`
9. Генерує стабільні унікальні ідентифікатори, однакові на сервері та клієнті, для зв'язування атрибутів доступності (`htmlFor`, `aria-describedby`)
10. Вони дають різні значення на сервері й клієнті (помилка гідратації) або конфліктують при кількох коренях
