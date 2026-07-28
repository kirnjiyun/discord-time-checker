package com.example.demo.domain;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

public class DailyRecordId implements Serializable {

    private String userId;
    private LocalDate date;

    public DailyRecordId() {
    }

    public DailyRecordId(String userId, LocalDate date) {
        this.userId = userId;
        this.date = date;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof DailyRecordId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && Objects.equals(date, that.date);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, date);
    }
}
