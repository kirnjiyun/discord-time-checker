package com.example.demo.service;

import com.example.demo.domain.User;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class UserStateService {

    private final UserRepository userRepository;

    public UserStateService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public void markJoined(String userId, LocalDateTime joinedAt) {
        User user = getOrCreate(userId);
        user.setVoiceJoinedAt(joinedAt);
        user.setWarnedAt(null);
        userRepository.save(user);
    }

    @Transactional
    public void markLeft(String userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setVoiceJoinedAt(null);
            user.setWarnedAt(null);
            userRepository.save(user);
        });
    }

    @Transactional
    public void resetGraceTimer(String userId, LocalDateTime from) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setVoiceJoinedAt(from);
            user.setWarnedAt(null);
            userRepository.save(user);
        });
    }

    @Transactional
    public User getOrCreate(String userId) {
        return userRepository.findById(userId).orElseGet(() -> userRepository.save(new User(userId)));
    }
}
