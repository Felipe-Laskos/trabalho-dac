package br.ufpr.dac.grupo2.gerente.exception;

import br.ufpr.dac.grupo2.gerente.dto.ErroDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class TratadorDeErros {

    @ExceptionHandler(GerenteNaoEncontradoException.class)
    public ResponseEntity<ErroDTO> naoEncontrado(GerenteNaoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErroDTO(404, "Not Found", e.getMessage()));
    }

    @ExceptionHandler(CampoImutavelException.class)
    public ResponseEntity<ErroDTO> imutavel(CampoImutavelException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErroDTO(400, "Bad Request", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroDTO> validacao(MethodArgumentNotValidException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErroDTO(400, "Bad Request", "Requisição malformada"));
    }
}
