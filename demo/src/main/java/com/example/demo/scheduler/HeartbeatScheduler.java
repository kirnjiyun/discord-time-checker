package com.example.demo.scheduler;

import com.example.demo.service.StudySessionService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class HeartbeatScheduler {

    private final StudySessionService studySessionService;

    public HeartbeatScheduler(StudySessionService studySessionService) {
        this.studySessionService = studySessionService;
    }

    @Scheduled(fixedRate = 60_000)
    public void heartbeat() {
        studySessionService.refreshHeartbeat(LocalDateTime.now());
    }
}
