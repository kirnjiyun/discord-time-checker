package com.example.demo.service;

import com.example.demo.domain.StudySession;
import com.example.demo.repository.StudySessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;

    public StudySessionService(StudySessionRepository studySessionRepository) {
        this.studySessionRepository = studySessionRepository;
    }

    @Transactional
    public void startSession(String userId, LocalDateTime startTime) {
        if (studySessionRepository.findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(userId).isPresent()) {
            return;
        }
        studySessionRepository.save(new StudySession(userId, startTime));
    }

    @Transactional
    public void closeActiveSession(String userId, LocalDateTime endTime) {
        studySessionRepository.findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(userId)
                .ifPresent(session -> {
                    session.setEndTime(endTime);
                    session.setLastSeenAt(endTime);
                    studySessionRepository.save(session);
                });
    }

    @Transactional
    public void refreshHeartbeat(LocalDateTime now) {
        List<StudySession> activeSessions = studySessionRepository.findAllByEndTimeIsNull();
        activeSessions.forEach(session -> session.setLastSeenAt(now));
        studySessionRepository.saveAll(activeSessions);
    }

    public List<StudySession> findActiveSessions() {
        return studySessionRepository.findAllByEndTimeIsNull();
    }

    @Transactional
    public void forceCloseAtLastSeen(StudySession session) {
        session.setEndTime(session.getLastSeenAt());
        studySessionRepository.save(session);
    }
}
