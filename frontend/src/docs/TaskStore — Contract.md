
## TaskStore — Contract

`TaskStore` — **низкоуровневый state**, отражающий активные задачи.

### Responsibilities

✅ Хранение списка активных tasks  
✅ Поддержка многозадачности  
✅ Derived state (total running count)  
✅ Минимальные sync-селекторы для фасада  

### Explicitly NOT responsible for

❌ Бизнес-логика  
❌ Работа с Job статусами  
❌ Интерпретация серверных событий  
❌ UI-решения  

---

### Public API

```ts
add(task: Task): void;
finishOne(jobId: string): void;

runningCountForJob(jobId: string): number;
readonly totalRunning$: Observable<number>;
```

---

### Design rules

* ❗ `TaskStore` используется **только** `JobEventsFacade`
* ❗ Компоненты **НЕ импортируют** `TaskStore`
* ❗ Нет "методов на будущее"
* ❗ Нет side-effects
* ❗ Нет бизнес-логики

Если метод не используется — он **удаляется**.

---

## Stores vs Facade — Rule of thumb

| Где?   | Что?                     |
| ------ | ------------------------ |
| Store  | Хранит состояние         |
| Store  | Делает простые селекторы |
| Facade | Принимает решения        |
| Facade | Обрабатывает события     |
| Facade | Управляет race-condition |
| UI     | Только читает и вызывает |

---

## Why this architecture

* SSE — асинхронный и недетерминированный источник
* Сервер не знает о локальных задачах
* UI должен быть **детерминирован**
* Статус job — **derived state**

Фасад решает эту задачу централизованно.

---

## Extension points (future)

* task limits
* queue / throttling
* cancel / retry
* statistics / averages

Все расширения:

* добавляются **в фасад**
* не требуют изменения UI
* не ломают Store API

---

## Final note

> **Facade is the brain.
> Stores are memory.
> UI is a projection.**

Нарушение этого правила — архитектурная ошибка.
