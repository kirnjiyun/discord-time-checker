package com.example.demo.service;

import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.entities.Guild;
import net.dv8tion.jda.api.entities.UserSnowflake;
import org.springframework.stereotype.Service;

@Service
public class KickService {

    private final JDA jda;

    public KickService(JDA jda) {
        this.jda = jda;
    }

    public void kick(String userId, String reason) {
        for (Guild guild : jda.getGuilds()) {
            if (guild.getMemberById(userId) != null) {
                guild.kick(UserSnowflake.fromId(userId)).reason(reason).queue();
            }
        }
    }
}
