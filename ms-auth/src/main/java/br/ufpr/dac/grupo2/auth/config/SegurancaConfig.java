package br.ufpr.dac.grupo2.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

@Configuration
public class SegurancaConfig {
  @Bean
  public Argon2PasswordEncoder argon2() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
  }
}
