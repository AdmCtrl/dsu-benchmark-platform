## JobEventsFacade — Contract

`JobEventsFacade` — **единственная точка**, где:

* интерпретируются события SSE
* происходит подписка на JobEventsService.events$

### Responsibilities

✅ Подписка на `JobEventsService.events$`  
✅ Преобразование `JobEvent → state changes`  
✅ Учёт многозадачности (N tasks per job)  
✅ Контроль итогового статуса job  
✅ Экспорт минимального API для UI  

### Explicitly NOT responsible for

❌ Отображение  
❌ UI lifecycle  
❌ Scroll / DOM / animations  
❌ Хранение derived-состояния в компонентах  

---

### Lifecycle

```ts
facade.init();    // start listening to SSE
facade.destroy(); // stop listening
```

Facade не инициирует подписку самостоятельно, чтобы **UI** явно контролировал сетевые ресурсы **(SSE)**.

---

### Public API

```ts
readonly totalRunningTasks$: Observable<number>;

startJob(jobId: string): void;
getRunningCount(jobId: string): number;
canRun(jobId: string): boolean;
```

❗ UI **НЕ подписывается** на события фасада  
❗ UI читает данные **только** из Store / Observable  

---

### Core invariant (важно)

> **Job.status вычисляется на основе TaskStore, а не серверного статуса напрямую**  
> Server status is treated as an event, not as a source of truth.  
> (Статус сервера рассматривается как событие, а не как источник достоверной информации.)

Правило:

* если `runningCountForJob(jobId) > 0` → `job.status = RUNNING`
* только когда **все задачи завершены** → принимается серверный `FINISHED / ERROR`

Это гарантирует:

* отсутствие race-condition
* корректную работу при параллельных задачах
* стабильный UI
