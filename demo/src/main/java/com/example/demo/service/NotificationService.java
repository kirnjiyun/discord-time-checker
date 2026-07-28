package com.example.demo.service;

import com.example.demo.config.DiscordProperties;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.entities.channel.concrete.TextChannel;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final JDA jda;
    private final DiscordProperties properties;

    public NotificationService(JDA jda, DiscordProperties properties) {
        this.jda = jda;
        this.properties = properties;
    }

    public void sendToNotifyChannel(String message) {
        TextChannel channel = jda.getTextChannelById(properties.getNotifyChannelId());
        if (channel != null) {
            channel.sendMessage(message).queue();
        }
    }

    public void mentionUser(String userId, String message) {
        sendToNotifyChannel("<@" + userId + "> " + message);
    }
}
