package com.example.demo.scheduler;

import com.example.demo.config.DiscordProperties;
import com.example.demo.domain.User;
import com.example.demo.repository.StudySessionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class GracePeriodScheduler {

    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;
    private final NotificationService notificationService;
    private final DiscordProperties properties;

    public GracePeriodScheduler(UserRepository userRepository,
                                 StudySessionRepository studySessionRepository,
                                 NotificationService notificationService,
                                 DiscordProperties properties) {
        this.userRepository = userRepository;
        this.studySessionRepository = studySessionRepository;
        this.notificationService = notificationService;
        this.properties = properties;
    }

    @Scheduled(fixedRate = 180_000)
    @Transactional
    public void checkGracePeriod() {
        LocalDateTime now = LocalDateTime.now();
        List<User> waitingUsers = userRepository.findAllByVoiceJoinedAtIsNotNullAndWarnedAtIsNull();
        for (User user : waitingUsers) {
            boolean hasActiveSession = studySessionRepository
                    .findFirstByUserIdAndEndTimeIsNullOrderByStartTimeDesc(user.getId())
                    .isPresent();
            if (hasActiveSession) {
                continue;
            }
            long elapsedMinutes = Duration.between(user.getVoiceJoinedAt(), now).toMinutes();
            if (elapsedMinutes >= properties.getGracePeriodMinutes()) {
                notificationService.mentionUser(user.getId(), "화면 공유를 켜주세요!");
                user.setWarnedAt(now);
                userRepository.save(user);
            }
        }
    }
}
