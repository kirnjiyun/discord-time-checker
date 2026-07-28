package com.example.demo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "discord")
public class DiscordProperties {

    private String botToken;
    private long studyVoiceChannelId;
    private long notifyChannelId;
    private int gracePeriodMinutes = 3;
    private int attendanceThresholdMinutes = 60;
    private int weeklyRequiredDays = 3;
    private int maxWarningsBeforeKick = 3;
}
