package br.ufpr.dac.grupo2.conta.query.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExtratoClockConfig {
    @Bean
    public Clock extratoClock() {
        return Clock.systemDefaultZone();
    }
}
