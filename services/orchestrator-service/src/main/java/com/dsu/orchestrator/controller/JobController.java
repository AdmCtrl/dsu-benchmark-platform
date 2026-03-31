package com.dsu.orchestrator.controller;

import com.dsu.orchestrator.event.JobEvent;
import com.dsu.orchestrator.model.Job;
import com.dsu.orchestrator.service.JobService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService service;
    public JobController(JobService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Job> create(@RequestParam("file") MultipartFile file) throws IOException {
        Job job = service.createJob(file);
        return ResponseEntity.ok(job);
    }

    @GetMapping
    public List<Job> list() { return service.listJobs(); }

    @GetMapping("/{id}")
    public ResponseEntity<Job> get(@PathVariable String id) {
        Job job = service.getJob(id);
        return job == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(job);
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<?> run(@PathVariable String id, @RequestBody(required=false) Map<String, Object> body) {
        Object a = body.get("args");
        List<String> args = a instanceof List ? (List<String>) a : null;
        String xmx = body != null && body.containsKey("xmx") ? String.valueOf(body.get("xmx")) : null;
        String algo = body != null && body.containsKey("algorithm") ? String.valueOf(body.get("algorithm")) : null;
        
        Job job = service.getJob(id);
        if (job != null && algo != null) {
            try {
                job.setAlgorithmType(AlgorithmType.valueOf(algo));
            } catch (IllegalArgumentException e) {
                // Ignore unknown algo
            }
        }
        
        String executionId = service.runJobAsync(id, args, xmx);
        return ResponseEntity.accepted().body(Map.of(
            "id", id, 
            "executionId", executionId, 
            "status", "RUNNING"
        ));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<?> stop(@PathVariable String id) {
        service.stopJob(id);
        return ResponseEntity.ok(Map.of("id", id, "status", "STOPPED"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) throws IOException {
        service.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/log")
    public ResponseEntity<String> getLog(@PathVariable String id) throws IOException {
        Job job = service.getJob(id);
        if (job == null) return ResponseEntity.notFound().build();
        Path log = job.getWorkDir().resolve("job.log");
        if (!Files.exists(log)) return ResponseEntity.ok("");
        String txt = Files.readString(log);
        return ResponseEntity.ok().body(txt);
    }

    @GetMapping("/{id}/output")
    public ResponseEntity<Resource> downloadOutput(@PathVariable String id) throws IOException {
        Job job = service.getJob(id);
        if (job == null) return ResponseEntity.notFound().build();
        Path output = job.getWorkDir().resolve(job.getOutputFileName());
        if (!Files.exists(output)) return ResponseEntity.notFound().build();
        Resource resource = new UrlResource(output.toUri());
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + output.getFileName().toString() + "\"")
                .body(resource);
    }

    @PostMapping("/repair")
    public List<Job> repairJobs() {
        return service.repairJobs();
    }


}
