package com.example.demo.scheduler;

import com.example.demo.config.DiscordProperties;
import com.example.demo.domain.DailyRecord;
import com.example.demo.domain.DailyRecordId;
import com.example.demo.domain.StudySession;
import com.example.demo.domain.User;
import com.example.demo.repository.DailyRecordRepository;
import com.example.demo.repository.StudySessionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.KickService;
import com.example.demo.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class SettlementScheduler {

    private final StudySessionRepository studySessionRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final KickService kickService;
    private final DiscordProperties properties;

    public SettlementScheduler(StudySessionRepository studySessionRepository,
                                DailyRecordRepository dailyRecordRepository,
                                UserRepository userRepository,
                                NotificationService notificationService,
                                KickService kickService,
                                DiscordProperties properties) {
        this.studySessionRepository = studySessionRepository;
        this.dailyRecordRepository = dailyRecordRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.kickService = kickService;
        this.properties = properties;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void settleDaily() {
        LocalDate settledDay = LocalDate.now().minusDays(1);
        LocalDateTime start = settledDay.atStartOfDay();
        LocalDateTime end = settledDay.plusDays(1).atStartOfDay();

        List<StudySession> sessions = studySessionRepository.findAllByEndTimeBetween(start, end);
        Map<String, Long> minutesByUser = sessions.stream()
                .collect(Collectors.groupingBy(StudySession::getUserId,
                        Collectors.summingLong(StudySession::getDurationMinutes)));

        minutesByUser.forEach((userId, minutes) -> {
            DailyRecord record = dailyRecordRepository.findById(new DailyRecordId(userId, settledDay))
                    .orElseGet(() -> new DailyRecord(userId, settledDay));
            record.setTotalMinutes(minutes.intValue());
            boolean attended = minutes >= properties.getAttendanceThresholdMinutes();
            record.setAttended(attended);
            dailyRecordRepository.save(record);

            if (attended) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.setTotalAttendanceDays(user.getTotalAttendanceDays() + 1);
                    userRepository.save(user);
                });
            }
        });

        notificationService.sendToNotifyChannel("[일일 정산] " + settledDay + " 공부 기록이 반영되었습니다.");
    }

    @Scheduled(cron = "0 55 23 * * SUN", zone = "Asia/Seoul")
    @Transactional
    public void settleWeekly() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        List<DailyRecord> weekRecords = dailyRecordRepository.findAllByDateBetween(weekStart, today);
        Map<String, Long> attendedDaysByUser = weekRecords.stream()
                .filter(DailyRecord::isAttended)
                .collect(Collectors.groupingBy(DailyRecord::getUserId, Collectors.counting()));

        for (User user : userRepository.findAll()) {
            long attendedDays = attendedDaysByUser.getOrDefault(user.getId(), 0L);
            if (attendedDays >= properties.getWeeklyRequiredDays()) {
                continue;
            }

            user.setWarningCount(user.getWarningCount() + 1);
            userRepository.save(user);
            notificationService.mentionUser(user.getId(),
                    "이번 주 출석 기준(" + properties.getWeeklyRequiredDays() + "일)을 채우지 못해 경고가 부여되었습니다. (누적 경고: "
                            + user.getWarningCount() + ")");

            if (user.getWarningCount() >= properties.getMaxWarningsBeforeKick()) {
                kickService.kick(user.getId(), "주간 출석 기준 미달 누적 경고 초과");
                notificationService.mentionUser(user.getId(), "누적 경고 초과로 서버에서 제외되었습니다.");
            }
        }
    }
}
