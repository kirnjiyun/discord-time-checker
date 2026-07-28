package com.example.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private int totalAttendanceDays = 0;

    @Column(nullable = false)
    private int warningCount = 0;

    private LocalDateTime voiceJoinedAt;

    private LocalDateTime warnedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public User(String id) {
        this.id = id;
    }
}
