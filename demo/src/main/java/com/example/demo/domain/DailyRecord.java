package com.example.demo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "daily_record")
@IdClass(DailyRecordId.class)
@Getter
@Setter
@NoArgsConstructor
public class DailyRecord {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Id
    private LocalDate date;

    @Column(nullable = false)
    private int totalMinutes = 0;

    @Column(nullable = false)
    private boolean attended = false;

    public DailyRecord(String userId, LocalDate date) {
        this.userId = userId;
        this.date = date;
    }
}
