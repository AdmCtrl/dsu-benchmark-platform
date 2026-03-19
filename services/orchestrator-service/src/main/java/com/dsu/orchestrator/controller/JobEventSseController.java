package com.dsu.orchestrator.controller;

import com.dsu.orchestrator.event.JobEvent;
import com.dsu.orchestrator.event.JobEventBus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

@RestController
@RequestMapping("/api/jobs/events")
public class JobEventSseController {

    private final JobEventBus bus;
private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    public JobEventSseController(JobEventBus bus) {
        this.bus = bus;
    }

    @GetMapping
    public SseEmitter stream() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        Consumer<JobEvent> consumer = e -> {
            try {
                emitter.send(e);
            } catch (Exception ex) {
                emitter.complete();
            }
        };

        bus.subscribe(consumer);

        emitter.onCompletion(() -> bus.unsubscribe(consumer));
        emitter.onTimeout(() -> bus.unsubscribe(consumer));
        emitter.onError(e -> bus.unsubscribe(consumer));

        return emitter;
    }
}

