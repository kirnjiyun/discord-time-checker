package com.example.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_session")
@Getter
@Setter
@NoArgsConstructor
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Column(nullable = false)
    private LocalDateTime lastSeenAt;

    public StudySession(String userId, LocalDateTime startTime) {
        this.userId = userId;
        this.startTime = startTime;
        this.lastSeenAt = startTime;
    }

    public long getDurationMinutes() {
        LocalDateTime end = endTime != null ? endTime : lastSeenAt;
        return Duration.between(startTime, end).toMinutes();
    }
}
