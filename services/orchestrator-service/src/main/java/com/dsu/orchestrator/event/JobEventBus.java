package com.dsu.orchestrator.event;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

@Service
public class JobEventBus {

    private final List<Consumer<JobEvent>> subscribers = new CopyOnWriteArrayList<>();

    public void subscribe(Consumer<JobEvent> consumer) {
        subscribers.add(consumer);
    }

    public void unsubscribe(Consumer<JobEvent> consumer) {
        subscribers.remove(consumer);
    }

    public void publish(JobEvent event) {
        for (var sub : subscribers) {
            try {
                sub.accept(event);
            } catch (Exception ignored) {
            }
        }
    }
}

