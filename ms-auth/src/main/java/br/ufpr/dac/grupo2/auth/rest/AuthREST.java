package br.ufpr.dac.grupo2.auth.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.dac.grupo2.auth.dto.AuthResponseDTO;
import br.ufpr.dac.grupo2.auth.dto.LoginRequestDTO;
import br.ufpr.dac.grupo2.auth.service.AuthService;

import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/auth")
public class AuthREST {
  private final AuthService service;

  public AuthREST(AuthService authService) {
    this.service = authService;
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponseDTO> login(@RequestBody LoginRequestDTO dto) {
    return service.autenticar(dto.getLogin(), dto.getSenha())
      .map(ResponseEntity::ok)
      .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
  }
}
