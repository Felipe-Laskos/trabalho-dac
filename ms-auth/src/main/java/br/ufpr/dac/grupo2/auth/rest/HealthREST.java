package br.ufpr.dac.grupo2.auth.rest;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthREST {

	@GetMapping("/health")
	public ResponseEntity<Map<String, String>> health() {
		return ResponseEntity.ok(Map.of("status", "UP"));
	}

}
