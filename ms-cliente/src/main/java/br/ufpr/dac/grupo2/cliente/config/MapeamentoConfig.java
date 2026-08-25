package br.ufpr.dac.grupo2.cliente.config;

import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MapeamentoConfig {

    @Bean
    public ModelMapper modelMapper() {
        return new ModelMapper();
    }
}
