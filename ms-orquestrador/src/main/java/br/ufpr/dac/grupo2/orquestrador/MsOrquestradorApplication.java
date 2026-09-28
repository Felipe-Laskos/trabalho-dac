package br.ufpr.dac.grupo2.orquestrador;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MsOrquestradorApplication {

	public static void main(String[] args) {
		SpringApplication.run(MsOrquestradorApplication.class, args);
	}

}
