package com.example.demo.repository;

import com.example.demo.domain.DailyRecord;
import com.example.demo.domain.DailyRecordId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DailyRecordRepository extends JpaRepository<DailyRecord, DailyRecordId> {

    List<DailyRecord> findAllByDateBetween(LocalDate start, LocalDate end);
}
