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
– Предоставляет read-only Observable<JobEvent>
```

### Публичный API

```ts
events$: Observable<JobEvent>

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
> Все подписки и интерпретация событий выполняются в `JobEventsFacade`.
