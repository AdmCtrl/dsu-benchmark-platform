## Overview

Проект построен по **state-driven архитектуре** с чётким разделением:

* **UI** — отображение и пользовательские действия
* **State (Store)** — хранение и публикация состояния
* **Facade** — интерпретация событий и координация состояния
* **Services** — IO (HTTP, SSE)
* **Models** — доменные сущности без логики хранения

Ключевая цель архитектуры:

> **Избавиться от race-condition, дублирующей логики и рассинхронизации UI при параллельных задачах**

---

## Visual & UX Strategy (Premium Layer)

В дополнение к технической архитектуре, проект следует строгим принципам **Premium UX**:

### 1. Glassmorphism & Aesthetics
* **Фон**: Глубокий темно-синий (`#0f172a`).
* **Панели**: Полупрозрачные карточки с `backdrop-filter: blur(12px)`.
* **Границы**: Тонкие светлые обводки (`rgba(255, 255, 255, 0.1)`) для создания эффекта глубины.

### 2. Anti-Jitter (Стабильность верстки)
Для устранения "прыжков" интерфейса при обновлении данных:
* **`scrollbar-gutter: stable`**: Резервирует место под скроллбар заранее.
* **`table-layout: fixed`**: Ширины колонок зафиксированы, таблица не "гуляет" при изменении контента.
* **Sticky Header**: Заголовки таблиц всегда видны при скролле.
* **Internal Scrolling**: Скроллится только контент внутри панелей, сама страница остается статичной.

### 3. Real-time Heartbeat
SSE-мониторинг дополнен активным **Heartbeat** (HEAD-запросы каждые 3с). Это гарантирует, что индикатор "Live Monitoring" мгновенно станет красным, если сервер упадет (даже за прокси), не дожидаясь таймаута TCP.

---

## Directory Structure

```text
src/app
├── core
│   ├── models
│   │   ├── job.ts
│   │   ├── job-event.ts
│   │   └── task.ts
│   │
│   ├── services
│   │   ├── job.service.ts
│   │   └── job-events.service.ts
│   │
│   └── state
│       ├── job.store.ts
│       ├── task.store.ts
│       ├── job-log.store.ts
│       └── job-events.facade.ts
│
├── features
│   ├── job-grid
│   │   ├── job-grid.ts          (Table, sticky header, internal scroll)
│   │   ├── job-log.ts           (Log viewer)
│   │   └── animated-cell.ts     (Pulse & Ghost animations)
│   │
│   ├── file-uploader
│   │   └── file-uploader.ts     (Glassmorphism uploader)
│   │
│   └── ui-notifications
│       └── ui-notifications.ts  (Progress & status alerts)
```

---

## Layers & Responsibilities

### 1. Models (`core/models`)

#### `Job`

```ts
class Job {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}
```

**Contract**

* DTO + derived getters
* **Immutable с точки зрения бизнес-смысла**
* Не знает:

  * где хранится
  * как обновляется
  * откуда пришёл

Allowed:

* `isDone`
* `hasError`
* `createdDate`

Forbidden:

* side-effects
* subscriptions
* IO

---

#### `Task`

```ts
interface Task {
  id: string;
  jobId: string;
  status: 'RUNNING' | 'FINISHED' | 'ERROR';
}
```

**Contract**

* Локальная сущность
* Представляет **единицу выполнения**
* Сервер о ней не знает

---

#### `JobEvent`

```ts
type JobEvent = CREATED | UPDATED | DELETED | LOG
```

**Contract**

* Сырой серверный сигнал
* **Никогда не используется напрямую в UI**
* Обрабатывается только Facade

---

## 2. Services (`core/services`)

### `JobService`

**Назначение:** HTTP API

Responsibilities:

* CRUD jobs
* run / repair
* получение output

Explicitly NOT:

* состояние
* кэш
* SSE
* интерпретация статусов

---

### `JobEventsService`

**Назначение:** SSE transport

Responsibilities:

* открыть / закрыть EventSource
* распарсить JSON
* пробросить `JobEvent`

Explicitly NOT:

* обновление Store
* бизнес-логика
* UI

---

## 3. State (`core/state`)

### `JobStore`

**Source of truth для Jobs**

Responsibilities:

* хранение списка `Job`
* публикация `jobs$`

Allowed:

* `add`
* `update`
* `remove`
* `setAll`
* `getJob`

Forbidden:

* логика статусов
* интерпретация SSE
* side-effects

---

### `TaskStore`

**Source of truth для runtime-выполнения**

Responsibilities:

* хранение локальных `Task`
* подсчёт running-задач
* реактивный total

Key invariant:

> **TaskStore — единственный источник правды о RUNNING**

---

### `JobLogStore`

**Source of truth для логов и UI-scroll**

Responsibilities:

* хранение логов по `jobId`
* хранение scroll position
* принятие решений о scroll-действии

Allowed:

* `logsFor(jobId)`
* `append`
* `clearLogs`
* `setScroll / getSavedScroll`
* `resolveScrollAction`

Explicitly NOT:

* DOM
* animation
* lifecycle компонентов

---

## 4. Facade (`core/state/job-events.facade.ts`)

## JobEventsFacade — Core Brain

**Единственная точка**, где:

* подписка на SSE
* интерпретация `JobEvent`
* синхронизация `Job ↔ Task ↔ Logs`
* устранение race-condition

---

### Responsibilities

✅ Подписка на `JobEventsService.events$`  
✅ Преобразование `JobEvent → Store mutations`  
✅ Учёт **многозадачности**  
✅ Вычисление итогового `Job.status`  
✅ Экспорт минимального API для UI  

---

### Explicitly NOT responsible for

❌ UI  
❌ DOM / scroll  
❌ анимации  
❌ хранение derived-состояния в компонентах  

---

### Lifecycle

```ts
facade.init();
facade.destroy();
```

Инициализируется **из UI**, чтобы SSE жил ровно столько, сколько нужен экрану.

---

### Public API

```ts
readonly totalRunningTasks$: Observable<number>;

startJob(jobId: string): void;
getRunningCount(jobId: string): number;
canRun(jobId: string): boolean;
```

---

### Core Invariant (critical)

> **Job.status НЕ равен серверному статусу напрямую**

Правило:

* если `TaskStore.runningCountForJob(jobId) > 0`
  → `Job.status = RUNNING`
* только когда **все Task завершены**
  → принимается `FINISHED / ERROR` от сервера

Это гарантирует:

* отсутствие гонок
* корректную параллельную обработку
* стабильные кнопки и счётчики

---

## 5. UI Components (`features`)

### `JobGridComponent`

**Главный экран Jobs**

Responsibilities:

* отображение jobs
* пользовательские действия
* контроль открытия логов

Allowed:

* читать Store / Facade
* вызывать Facade API

Forbidden:

* подписка на SSE
* подсчёты
* хранение состояния выполнения

---

### `JobLogComponent`

**UI-компонент логов**

Responsibilities:

* подписка на `JobLogStore.logsFor`
* DOM-scroll
* анимация
* восстановление позиции

Allowed:

* `handleNewLine`
* DOM access

Forbidden:

* хранение логов
* бизнес-логика

---

### `FileUploaderComponent`

**Command UI**

Responsibilities:

* загрузка файла
* создание Job
* repair

Allowed:

* прямой вызов `JobService`
* обновление `JobStore`

Forbidden:

* SSE
* runtime-логика
* Facade

Invariant:

> **FileUploader инициирует, но не сопровождает**

---

## Data Flow Summary

```text
HTTP → JobService → JobStore
SSE  → JobEventsService → JobEventsFacade
                         ↳ JobStore
                         ↳ TaskStore
                         ↳ JobLogStore
UI   → reads Store / Facade only
```

---

## Absolute Rules (cemented)

1. **UI не считает**
2. **Store не интерпретирует**
3. **Facade — единственный мозг**
4. **TaskStore решает RUNNING**
5. **Logs и Scroll — state, не DOM**
6. **Нет подписок на SSE вне Facade**

---

## Final Note

Эта архитектура:

* выдерживает параллельные задачи
* масштабируется (average, limits, queues)
* читается спустя месяцы
* защищает от “чуть подправил — всё сломалось”

