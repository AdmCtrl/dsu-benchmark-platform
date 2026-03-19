## Task — Runtime Execution Contract

`Task` — **локальная runtime-сущность**, отражающая *факт выполнения* job на клиенте.

> ⚠️ `Task` **не существует на сервере**  
> ⚠️ `Task` **не сериализуется**  
> ⚠️ `Task` **не отображается в UI напрямую**  

---

### Definition

```ts
export interface Task {
  id: string;        // локальный id
  jobId: string;     // к какому job относится
  status: 'RUNNING' | 'FINISHED' | 'ERROR';
}
```

---

### Purpose

`Task` используется **исключительно** для:

* учёта параллельных запусков одного `Job`
* защиты от race-condition
* вычисления итогового `Job.status`
* подсчёта running-счётчиков (per-job и total)

---

### Lifecycle

```text
UI action (Run)
   ↓
TaskStore.add(Task{ RUNNING })
   ↓
JobEventsFacade.startJob()
   ↓
SSE UPDATED / FINISHED
   ↓
TaskStore.finishOne(jobId)
```

---

### Fields semantics

#### `id: string`

* **локальный идентификатор**
* генерируется на клиенте (`crypto.randomUUID()`)
* не совпадает с `jobId`
* нужен для:

  * поддержки нескольких параллельных задач
  * потенциального future-cancel / retry

Инвариант:

> Каждый `Task.id` уникален в пределах клиента

---

#### `jobId: string`

* связь с `Job`
* используется как foreign key в `TaskStore`

Инвариант:

> Один `Job` может иметь **0..N Tasks**

---

#### `status`

```ts
'RUNNING' | 'FINISHED' | 'ERROR'
```

⚠️ В текущей архитектуре:

* `FINISHED / ERROR` **не хранятся долго**
* задача **удаляется из store** после завершения
* статус важен только в момент жизни Task

Фактически:

> `TaskStore` хранит **только активные RUNNING-задачи**

---

### Relationship with Job

Ключевое правило системы:

> **Job.status вычисляется на основе TaskStore**

Алгоритм:

```ts
if (runningCountForJob(jobId) > 0) {
  job.status = 'RUNNING';
} else {
  job.status = serverStatus; // FINISHED | ERROR
}
```

Таким образом:

* сервер может прислать `FINISHED`
* но job **останется RUNNING**, пока есть активные задачи
* race-condition невозможен

---

### Explicitly NOT responsible for

❌ UI  
❌ Логи  
❌ Время выполнения  
❌ Progress / percentage  
❌ Retry policy  
❌ Persistence  

`Task` — **минимальная техническая сущность**, не доменная.

---

### Why Task is an interface, not a class

* нет поведения
* нет derived-состояния
* нет инвариантов внутри самой сущности
* вся логика — в `TaskStore` и `JobEventsFacade`

---

### Core invariant (cemented)

> **UI никогда не работает с Task напрямую.**  
> **Только Facade имеет право создавать / завершать Task.**

Это гарантирует:

* целостность счётчиков
* предсказуемое состояние job
* контроль точки правды

---

### TL;DR

> **`Task` — это локальный маркер выполняющейся работы,
> существующий ровно столько, сколько job реально выполняется.**


