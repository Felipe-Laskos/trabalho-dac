package br.ufpr.dac.grupo2.cliente.exception;

@RestControllerAdvice
public class TratadorDeErros {

    @ExceptionHandler(SolicitacaoDuplicadaException.class)
    public ResponseEntity<ErroDTO> duplicada(SolicitacaoDuplicadaException e) {
        return ResponseEntity.status(409)
                .body(new ErroDTO(409, "Conflict", e.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroDTO> conflitoNoBanco(DataIntegrityViolationException e) {
        return ResponseEntity.status(409)
                .body(new ErroDTO(409, "Conflict", "CPF ou e-mail já cadastrado"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroDTO> validacao(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest()
                .body(new ErroDTO(400, "Bad Request", "Requisição malformada"));
    }
}