package com.example.demo.listener;

import com.example.demo.config.DiscordProperties;
import com.example.demo.service.StudySessionService;
import com.example.demo.service.UserStateService;
import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.events.guild.voice.GuildVoiceStreamEvent;
import net.dv8tion.jda.api.events.guild.voice.GuildVoiceUpdateEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class VoiceStateListener extends ListenerAdapter {

    private final StudySessionService studySessionService;
    private final UserStateService userStateService;
    private final DiscordProperties properties;

    public VoiceStateListener(StudySessionService studySessionService,
                               UserStateService userStateService,
                               DiscordProperties properties) {
        this.studySessionService = studySessionService;
        this.userStateService = userStateService;
        this.properties = properties;
    }

    @Override
    public void onGuildVoiceUpdate(GuildVoiceUpdateEvent event) {
        Member member = event.getMember();
        String userId = member.getId();
        long joinedChannelId = event.getChannelJoined() != null ? event.getChannelJoined().getIdLong() : -1;
        long leftChannelId = event.getChannelLeft() != null ? event.getChannelLeft().getIdLong() : -1;

        if (joinedChannelId == properties.getStudyVoiceChannelId()) {
            userStateService.markJoined(userId, LocalDateTime.now());
        } else if (leftChannelId == properties.getStudyVoiceChannelId()) {
            userStateService.markLeft(userId);
            studySessionService.closeActiveSession(userId, LocalDateTime.now());
        }
    }

    @Override
    public void onGuildVoiceStream(GuildVoiceStreamEvent event) {
        String userId = event.getMember().getId();
        LocalDateTime now = LocalDateTime.now();
        if (event.isStream()) {
            studySessionService.startSession(userId, now);
        } else {
            studySessionService.closeActiveSession(userId, now);
            userStateService.resetGraceTimer(userId, now);
        }
    }
}
