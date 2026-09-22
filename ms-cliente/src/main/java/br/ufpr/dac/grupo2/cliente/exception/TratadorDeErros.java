package br.ufpr.dac.grupo2.cliente.exception;

import br.ufpr.dac.grupo2.cliente.dto.ErroDTO;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class TratadorDeErros {

    @ExceptionHandler(SolicitacaoNaoEncontradaException.class)
    public ResponseEntity<ErroDTO> naoEncontrada(SolicitacaoNaoEncontradaException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErroDTO(404, "Not Found", e.getMessage()));
    }

    @ExceptionHandler(SolicitacaoException.class)
    public ResponseEntity<ErroDTO> conflito(SolicitacaoException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErroDTO(409, "Conflict", e.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroDTO> conflitoNoBanco(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErroDTO(409, "Conflict", "CPF ou e-mail já cadastrado"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroDTO> validacao(MethodArgumentNotValidException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErroDTO(400, "Bad Request", "Requisição malformada"));
    }
}
