package com.dsu.orchestrator.controller;

import com.dsu.orchestrator.event.JobEvent;
import com.dsu.orchestrator.event.JobEventBus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

@RestController
@RequestMapping("/api/jobs/events")
public class JobEventSseController {

    private final JobEventBus bus;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public JobEventSseController(JobEventBus bus) {
        this.bus = bus;
    }

    // 1. КРИТИЧЕСКИ ВАЖНО: Указываем правильный MediaType для SSE
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        // 0L означает бесконечный таймаут (соединение не закроется само по себе)
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        Consumer<JobEvent> consumer = e -> {
            try {
                // 2. Явно упаковываем данные в формат SSE
                emitter.send(SseEmitter.event()
                        .name("message") // Совпадает с es.onmessage в Angular
                        .data(e, MediaType.APPLICATION_JSON));
            } catch (IOException ex) {
                // Если клиент отключился, завершаем эмиттер с ошибкой
                emitter.completeWithError(ex);
            }
        };

        bus.subscribe(consumer);

        // Правильная отписка при любом сценарии отключения клиента
        emitter.onCompletion(() -> cleanup(emitter, consumer));
        emitter.onTimeout(() -> cleanup(emitter, consumer));
        emitter.onError(e -> cleanup(emitter, consumer));

        return emitter;
    }

    private void cleanup(SseEmitter emitter, Consumer<JobEvent> consumer) {
        bus.unsubscribe(consumer);
        emitters.remove(emitter);
    }
}

