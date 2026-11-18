# C: загальна характеристика

## Ключові відомості

| Параметр           | Характеристика                                           |
| ------------------ | -------------------------------------------------------- |
| Автор              | Деніс Рітчі (Bell Labs)                                  |
| Рік появи          | 1972–1973                                                |
| Стандарти          | ANSI C (C89), ISO C90, C99, C11, C17, C23 (ISO/IEC 9899) |
| Парадигма          | процедурна, імперативна                                  |
| Типізація          | статична, слабка                                         |
| Виконання          | компіляція в машинний код                                |
| Керування пам'яттю | ручне (`malloc` / `free`)                                |
| Компілятори        | GCC, Clang, MSVC                                         |
| Розширення файлів  | `.c`, `.h`                                               |

## 1. Історичний контекст

Мова C створена на початку 1970-х років Денісом Рітчі в лабораторіях Bell Labs як інструмент для перепису операційної системи **Unix**, до того написаної на асемблері. Попередниками були мови BCPL і B (Кен Томпсон). Вирішальним результатом стала переносимість: після переписування на C систему Unix можна було переносити на нову архітектуру, зусиллями зосередженими здебільшого на компіляторі, а не на переписуванні всієї системи.

1978 року вийшла книга Кернігана та Рітчі *The C Programming Language* («K&R»), яка тривалий час слугувала неформальним стандартом. Формалізацію завершила комісія ANSI (1989), а рік по тому стандарт було прийнято ISO. Подальші редакції додавали, зокрема, типи фіксованого розміру, багатопоточність (C11) та нові засоби перевірки (C23).

## 2. Принципи дизайну

1. **Мінімалізм.** Мова має невелику кількість ключових слів; більшість можливостей (введення-виведення, рядки, колекції) реалізовано бібліотеками, а не самою мовою.
2. **Близькість до апаратури.** Мова надає прямий доступ до пам'яті через **вказівники**, а типи відображаються на машинні.
3. **Довіра до програміста.** Компілятор не вставляє перевірок меж масивів чи розіменування вказівників; за коректність відповідає автор програми.
4. **Відсутність прихованої вартості.** Кожен елемент коду має передбачувану вартість виконання.

## 3. Модель виконання

Програма проходить етапи: препроцесор (`#include`, `#define`) → компіляція в об'єктний код → компонування (linking) у виконуваний файл. Точка входу — функція `main`. Часу виконання (runtime) практично немає: немає збирача сміття, віртуальної машини чи рефлексії, тому програми мають малий розмір і швидкий запуск.

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;          /* p зберігає адресу x */
    printf("%d\n", *p);   /* розіменування: 42 */
    return 0;
}
```

## 4. Система типів

Типи статичні, проте перевірка **слабка**: допустимі неявні перетворення між цілими типами, вказівниками й числами з рухомою комою. Розмір базових типів (`int`, `long`) залежить від платформи; для точних розмірів застосовують заголовок `<stdint.h>` (`int32_t`, `uint64_t`). Масиви при передачі у функцію «розпадаються» до вказівника, а рядок — це просто масив `char`, що закінчується нуль-символом.

## 5. Керування пам'яттю

Розрізняють стек (автоматичні змінні) та купу (динамічна пам'ять). Пам'ять у купі виділяють `malloc` і звільняють `free`. Типові помилки:

- витік пам'яті (відсутній `free`);
- звернення до звільненої пам'яті (use-after-free);
- вихід за межі масиву (переповнення буфера);
- подвійне звільнення.

Такі помилки призводять до **невизначеної поведінки** (undefined behavior): стандарт не накладає жодних вимог на результат, тож програма може працювати «правильно» на одному компіляторі й ламатися на іншому. Саме цим пояснюється значна частина вразливостей безпеки у програмному забезпеченні.

## 6. Сфери застосування

- ядра операційних систем (Linux, Windows, BSD), драйвери;
- вбудовані системи та мікроконтролери;
- компілятори, інтерпретатори (зокрема CPython), бази даних (SQLite);
- бібліотеки, що мають викликатися з інших мов (C має найпоширеніший інтерфейс взаємодії між мовами — ABI/FFI).

## 7. Сильні сторони та обмеження

| Сильні сторони | Обмеження |
|---|---|
| Максимальний контроль над ресурсами | Ручне керування пам'яттю, ризик помилок |
| Передбачувана швидкодія | Слабкі засоби абстракції |
| Мінімальний runtime, переносимість | Невизначена поведінка, вразливості |
| Універсальний інтерфейс для інших мов | Обмежена стандартна бібліотека |

## 8. Поширені хибні уявлення

1. «C++ — це C із доповненнями». Хибно: це окрема мова, що не є строгою надмножиною C.
2. «Вказівник — це ціле число». Стандарт цього не гарантує.
3. «Код, що працює, — коректний». За наявності невизначеної поведінки коректність не підтверджується жодним тестуванням.


## 9. Рекомендована література

- Kernighan B., Ritchie D. *The C Programming Language*, 2nd ed. Prentice Hall, 1988.
- King K. N. *C Programming: A Modern Approach*, 2nd ed. W. W. Norton, 2008.
- ISO/IEC 9899 — міжнародний стандарт мови C.

## Задачі для закріплення

39 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код компілюйте командою `clang -std=c11 -Wall`.

### Рівень 1. Основи

**1.** Які розміри базових типів на цій платформі?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("%zu %zu %zu %zu %zu %zu\n", sizeof(char), sizeof(short), sizeof(int), sizeof(long), sizeof(long long), sizeof(void *));
    return 0;
}

```

**2.** Які межі `int` та `unsigned`?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("%d %d %u\n", INT_MIN, INT_MAX, UINT_MAX);
    return 0;
}

```

**3.** Що виведе цілочисельне ділення та залишок для від'ємних?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("%d %d %d %d\n", 7 / 2, -7 / 2, 7 % 3, -7 % 3);
    return 0;
}

```

**4.** Що станеться при переповненні `unsigned` (визначена поведінка)?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    unsigned u = UINT_MAX;
    u += 2;
    printf("%u\n", u);
    return 0;
}

```

**5.** Що виведе перетворення `double` → `int` та `int` → `char`?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int a = (int)3.99, b = (int)-3.99;
    char c = (char)321;
    printf("%d %d %d\n", a, b, c);
    return 0;
}

```

**6.** Цілі типи фіксованої ширини з `<stdint.h>`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("%zu %zu %zu %zu\n", sizeof(int8_t), sizeof(int16_t), sizeof(int32_t), sizeof(int64_t));
    return 0;
}

```

**7.** Що виведе порівняння знакового й беззнакового?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int a = -1;
    unsigned b = 1;
    printf("%d\n", a < b);
    return 0;
}

```

**8.** Пріоритет операторів і дужки.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("%d %d %d %d\n", 2 + 3 * 4, (2 + 3) * 4, 10 - 4 - 3, 1 + 2 << 3);
    return 0;
}

```

**9.** Побітові операції та зсуви.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    unsigned a = 0xF0, b = 0x3C;
    printf("%u %u %u %u %u\n", a & b, a | b, a ^ b, a >> 4, 1u << 5);
    return 0;
}

```

**10.** Масив і `sizeof`: кількість елементів.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int a[10];
    printf("%zu %zu\n", sizeof(a), sizeof(a) / sizeof(a[0]));
    return 0;
}

```

### Рівень 2. Деталі й поведінка

**11.** Розпад масиву до вказівника у параметрі функції.

```c
#include <stdio.h>
static size_t sz(int arr[10]) { return sizeof(arr); }
int main(void) {
    int a[10];
    printf("%zu %zu\n", sizeof(a), sz(a));
    return 0;
}

```

**12.** Арифметика вказівників.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int a[] = {10, 20, 30, 40};
    int *p = a;
    printf("%d %d %d %td\n", *p, *(p + 2), p[3], &a[3] - &a[0]);
    return 0;
}

```

**13.** Вказівник на вказівник та зміна значення через вказівник.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int x = 1;
    int *p = &x;
    int **pp = &p;
    **pp = 42;
    printf("%d\n", x);
    return 0;
}

```

**14.** Рядок як масив `char`: довжина та `sizeof`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    char s[] = "hello";
    printf("%zu %zu\n", strlen(s), sizeof(s));
    return 0;
}

```

**15.** `strcmp`, `strcpy` та `strncpy`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    char a[8];
    strcpy(a, "abc");
    printf("%d %d %s\n", strcmp("a", "b") < 0, strcmp("b", "b"), a);
    return 0;
}

```

**16.** Рядковий літерал і змінюваний масив.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    char s[] = "abc";
    s[0] = 'X';
    printf("%s\n", s);
    return 0;
}

```

**17.** Структура та вирівнювання (padding).

```c
#include <stdio.h>
struct A { char c; int i; char d; };
struct B { int i; char c; char d; };
int main(void) {
    printf("%zu %zu\n", sizeof(struct A), sizeof(struct B));
    return 0;
}

```

**18.** Об'єднання (`union`): розмір та спільна пам'ять.

```c
#include <stdio.h>
union U { int i; float f; char c[4]; };
int main(void) {
    union U u;
    u.i = 0x41424344;
    printf("%zu %c%c%c%c\n", sizeof(u), u.c[3], u.c[2], u.c[1], u.c[0]);
    return 0;
}

```

**19.** `malloc`, `calloc` та перевірка на `NULL`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int *a = malloc(3 * sizeof *a);
    int *b = calloc(3, sizeof *b);
    for (int i = 0; i < 3; i++) a[i] = i * i;
    printf("%d %d %d | %d\n", a[0], a[1], a[2], b[0] + b[1] + b[2]);
    free(a); free(b);
    return 0;
}

```

**20.** `realloc` збільшує масив і зберігає дані.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int *a = malloc(2 * sizeof *a);
    a[0] = 1; a[1] = 2;
    a = realloc(a, 4 * sizeof *a);
    a[2] = 3; a[3] = 4;
    printf("%d %d %d %d\n", a[0], a[1], a[2], a[3]);
    free(a);
    return 0;
}

```

### Рівень 3. Нюанси та пастки

**21.** Динамічний масив рядків: копіювання через `strdup`-подібне `malloc` + `strcpy`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    const char *src = "copy me";
    char *dup = malloc(strlen(src) + 1);
    strcpy(dup, src);
    dup[0] = 'C';
    printf("%s | %s\n", src, dup);
    free(dup);
    return 0;
}

```

**22.** Вказівник на функцію та масив функцій.

```c
#include <stdio.h>
static int add(int a, int b) { return a + b; }
static int mul(int a, int b) { return a * b; }
int main(void) {
    int (*ops[])(int, int) = { add, mul };
    printf("%d %d\n", ops[0](3, 4), ops[1](3, 4));
    return 0;
}

```

**23.** Рекурсія: факторіал та числа Фібоначчі.

```c
#include <stdio.h>
static long fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
static int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
int main(void) {
    printf("%ld %d\n", fact(10), fib(15));
    return 0;
}

```

**24.** Макроси: пастка без дужок.

```c
#include <stdio.h>
#define SQ_BAD(x) x * x
#define SQ(x) ((x) * (x))
int main(void) {
    printf("%d %d\n", SQ_BAD(1 + 2), SQ(1 + 2));
    return 0;
}

```

**25.** `static` змінна в функції зберігає стан.

```c
#include <stdio.h>
static int counter(void) { static int n = 0; return ++n; }
int main(void) {
    counter(); counter();
    printf("%d\n", counter());
    return 0;
}

```

**26.** `const` та вказівники: що можна змінити?

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int x = 1, y = 2;
    const int *p = &x;
    p = &y;
    int *const q = &x;
    *q = 9;
    printf("%d %d\n", *p, x);
    return 0;
}

```

**27.** Форматування `printf`: ширина, точність, система числення.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    printf("[%5d] [%-5d] [%05d] [%.2f] [%x] [%o] [%c] [%s]\n", 42, 42, 42, 3.14159, 255, 8, 'A', "hi");
    return 0;
}

```

**28.** Масив із початковим значенням та зворотний обхід.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int a[5] = {1, 2};
    for (int i = 4; i >= 0; i--) printf("%d ", a[i]);
    printf("\n");
    return 0;
}

```

**29.** Двовимірний масив і порядок у пам'яті.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int *flat = &m[0][0];
    printf("%d %d %zu\n", m[1][2], flat[4], sizeof(m));
    return 0;
}

```

**30.** Перерахування `enum` і значення за замовчуванням.

```c
#include <stdio.h>
enum Color { RED, GREEN = 5, BLUE };
int main(void) {
    printf("%d %d %d\n", RED, GREEN, BLUE);
    return 0;
}

```

### Рівень 4. Практика

**31.** Бітові поля та перевірка бітів.

```c
#include <stdio.h>
int main(void) {
    unsigned flags = 0;
    flags |= 1u << 3;
    flags |= 1u << 0;
    flags &= ~(1u << 0);
    printf("%u %d\n", flags, (flags >> 3) & 1);
    return 0;
}

```

**32.** `qsort` із компаратором.

```c
#include <stdio.h>
#include <stdlib.h>
static int cmp(const void *a, const void *b) { return *(const int *)a - *(const int *)b; }
int main(void) {
    int a[] = {5, 2, 9, 1, 7};
    qsort(a, 5, sizeof a[0], cmp);
    for (int i = 0; i < 5; i++) printf("%d ", a[i]);
    printf("\n");
    return 0;
}

```

**33.** `sizeof` на вираз не обчислює його.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    int i = 5;
    size_t s = sizeof(i++);
    printf("%zu %d\n", s, i);
    return 0;
}

```

**34.** Цикл по рядку до `'\0'`.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
int main(void) {
    const char *s = "abc";
    int n = 0;
    while (*s++) n++;
    printf("%d\n", n);
    return 0;
}

```

**35.** Передача за значенням і за вказівником (swap).

```c
#include <stdio.h>
static void swap_bad(int a, int b) { int t = a; a = b; b = t; }
static void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }
int main(void) {
    int x = 1, y = 2;
    swap_bad(x, y);
    printf("%d %d\n", x, y);
    swap(&x, &y);
    printf("%d %d\n", x, y);
    return 0;
}

```

**36.** Чим `malloc` відрізняється від `calloc`?

**37.** Що таке невизначена поведінка (UB) у C?

**38.** Чому C називають мовою без рантайм-перевірок?

**39.** Яка різниця між стеком і купою в C?

### Відповіді

1. `1 2 4 8 8 8`
2. `-2147483648 2147483647 4294967295`
3. `3 -3 1 -1`
4. `1`
5. `3 -3 65`
6. `1 2 4 8`
7. `0`
8. `14 20 3 24`
9. `48 252 204 15 32`
10. `40 10`
11. `40 8`
12. `10 30 40 3`
13. `42`
14. `5 6`
15. `1 0 abc`
16. `Xbc`
17. `12 8`
18. `4 ABCD`
19. `0 1 4 | 0`
20. `1 2 3 4`
21. `copy me | Copy me`
22. `7 12`
23. `3628800 610`
24. `5 9`
25. `3`
26. `2 9`
27. `[   42] [42   ] [00042] [3.14] [ff] [10] [A] [hi]`
28. `0 0 0 2 1 `
29. `6 5 24`
30. `0 5 6`
31. `8 1`
32. `1 2 5 7 9 `
33. `4 5`
34. `3`
35. Вивід:

   ```text
   1 2
   2 1
   ```

36. `malloc` виділяє непроініціалізовану пам'ять; `calloc` виділяє `n*size` байтів і заповнює нулями (та перевіряє переповнення множення)
37. Ситуація, для якої стандарт не задає жодних вимог: розіменування `NULL`, вихід за межі масиву, переповнення знакових цілих, використання після `free`; компілятор може згенерувати будь-що
38. Компілятор не додає автоматичних перевірок меж, типів у рантаймі та збирача сміття; відповідальність за пам'ять і коректність лежить на програмісті
39. Локальні змінні лежать у стеку й звільняються автоматично при виході з функції; пам'ять у купі виділяється `malloc` і мусить бути звільнена `free`
