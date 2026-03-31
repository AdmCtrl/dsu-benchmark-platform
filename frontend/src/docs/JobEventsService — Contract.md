## Что это за слой по архитектуре

**`JobEventsService` = инфраструктурный transport-service**

Он:

* 🔌 **подключается к SSE**
* 🔄 **десериализует события**
* 🚫 **не знает ничего про домен**
* 🚫 **не знает ни про store, ни про UI**
* 📤 **только эмитит события наружу**
---
## Контракт `JobEventsService`

### Ответственность

```text
– Управляет соединением с SSE
– Преобразует raw EventSource → JobEvent
– Гарантирует delivery в Angular zone
– Предоставляет Replay-поток событий `events$`
– **🆕 Предоставляет актуальный статус соединения `isConnected$`**
– **🆕 Выполняет Heartbeat-проверки (HEAD /api/jobs) каждые 3с**
```

### Публичный API

```ts
events$: Observable<JobEvent>
isConnected$: Observable<boolean> // True, если бекенд доступен

connect(): void
disconnect(): void
```

✔️ **Больше ничего**
---
## Чего здесь **НЕ ДОЛЖНО БЫТЬ** 
❌ подписки на store  
❌ append логов  
❌ логика job/task  
❌ retry-loop  
❌ debounce / filter / map  
❌ side-effects  

Всё это **правильно вынесено** в `JobEventsFacade`.

> `JobEventsService` — низкоуровневый транспортный сервис.
> Он не содержит бизнес-логики и не взаимодействует со state напрямую.
> Все подписки и интерпретация самих событий выполняются в `JobEventsFacade`.

### Heartbeat Mechanism (Watchdog)
Так как браузерный `EventSource` плохо детектирует "молчаливые" разрывы связи (например, когда Spring упал, а прокси-сервер все еще держит соединение), в `connect()` запускается **Watchdog**:
* Интервал: **3000мс**.
* Метод: **HEAD /api/jobs**.
* Цель: Мгновенное обновление `isConnected$`, если сервер не ответил или вернул ошибку.
