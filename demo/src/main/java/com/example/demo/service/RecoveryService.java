package com.example.demo.service;

import com.example.demo.domain.StudySession;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.entities.Guild;
import net.dv8tion.jda.api.entities.GuildVoiceState;
import net.dv8tion.jda.api.entities.Member;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecoveryService {

    private final StudySessionService studySessionService;
    private final JDA jda;

    public RecoveryService(StudySessionService studySessionService, JDA jda) {
        this.studySessionService = studySessionService;
        this.jda = jda;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverDanglingSessions() {
        List<StudySession> activeSessions = studySessionService.findActiveSessions();
        for (StudySession session : activeSessions) {
            if (!isCurrentlyStreaming(session.getUserId())) {
                studySessionService.forceCloseAtLastSeen(session);
            }
        }
    }

    private boolean isCurrentlyStreaming(String userId) {
        for (Guild guild : jda.getGuilds()) {
            Member member = guild.getMemberById(userId);
            if (member == null) {
                continue;
            }
            GuildVoiceState state = member.getVoiceState();
            if (state != null && state.getChannel() != null && state.isStream()) {
                return true;
            }
        }
        return false;
    }
}
