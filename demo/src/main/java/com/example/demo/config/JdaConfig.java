package com.example.demo.config;

import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.utils.MemberCachePolicy;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@EnableConfigurationProperties(DiscordProperties.class)
public class JdaConfig {

    @Bean
    public JDA jda(DiscordProperties properties, List<ListenerAdapter> listeners) throws InterruptedException {
        JDA jda = JDABuilder.createDefault(properties.getBotToken())
                .enableIntents(GatewayIntent.GUILD_VOICE_STATES, GatewayIntent.GUILD_MEMBERS)
                .setMemberCachePolicy(MemberCachePolicy.VOICE)
                .addEventListeners(listeners.toArray())
                .build();
        jda.awaitReady();
        return jda;
    }
}
