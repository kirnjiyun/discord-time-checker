package com.example.demo.repository;

import com.example.demo.domain.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(String userId);

    List<StudySession> findAllByEndTimeIsNull();

    List<StudySession> findAllByEndTimeBetween(LocalDateTime start, LocalDateTime end);
}
