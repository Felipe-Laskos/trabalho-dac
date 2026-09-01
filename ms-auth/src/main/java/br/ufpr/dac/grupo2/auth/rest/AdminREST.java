package br.ufpr.dac.grupo2.auth.rest;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.dac.grupo2.auth.service.AuthService;

@RestController
@RequestMapping("/admin")
public class AdminREST {
  private final AuthService service;

  public AdminREST(AuthService authService) {
    this.service = authService;
  }

  @PostMapping("/seed")
  public ResponseEntity<Map<String, Integer>> seed() {
    return ResponseEntity.ok(Map.of("total", service.recriarSeed()));
  }
}
