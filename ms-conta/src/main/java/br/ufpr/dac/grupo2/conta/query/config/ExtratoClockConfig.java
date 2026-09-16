package br.ufpr.dac.grupo2.conta.query.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExtratoClockConfig {
    @Bean
    public Clock extratoClock() {
        return Clock.system(ZoneId.of("America/Sao_Paulo"));
    }
}