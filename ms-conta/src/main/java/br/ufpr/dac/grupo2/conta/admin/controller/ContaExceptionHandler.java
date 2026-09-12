package br.ufpr.dac.grupo2.conta.admin.controller;

import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.exception.AcessoNegadoException;
import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.exception.TentativasEsgotadasException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ContaExceptionHandler {

    @ExceptionHandler(ContaNaoEncontradaException.class)
    public ResponseEntity<Map<String, String>> naoEncontrada(
            RuntimeException e) {
        return resposta(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<Map<String, String>> acessoNegado(
            RuntimeException e) {
        return resposta(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(EventoInvalidoException.class)
    public ResponseEntity<Map<String, String>> regraDeNegocio(
            RuntimeException e) {
        return resposta(
                HttpStatus.UNPROCESSABLE_CONTENT,
                e.getMessage()
        );
    }

    @ExceptionHandler({
            ConflitoDeVersaoException.class,
            TentativasEsgotadasException.class
    })
    public ResponseEntity<Map<String, String>> conflito(
            RuntimeException e) {
        return resposta(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> jsonInvalido() {
        return resposta(
                HttpStatus.BAD_REQUEST,
                "JSON inválido. Verifique o corpo da requisição."
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacaoInvalida() {
        return resposta(
                HttpStatus.BAD_REQUEST,
                "Campos obrigatórios ausentes ou inválidos."
        );
    }

    private ResponseEntity<Map<String, String>> resposta(
            HttpStatus status,
            String mensagem) {
        return ResponseEntity
                .status(status)
                .body(Map.of("mensagem", mensagem));
    }
}