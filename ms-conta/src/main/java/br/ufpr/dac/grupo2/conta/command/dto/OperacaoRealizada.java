package br.ufpr.dac.grupo2.conta.command.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.model.Evento;

public record OperacaoRealizada(
        String numeroConta,
        String tipo,
        LocalDateTime dataHora,
        String valor,
        ParteTransferencia destino,
        Map<String, Map<String, String>> _links) {

    public static OperacaoRealizada de(
            Evento evento,
            String tipoResposta,
            String valor,
            ParteTransferencia destino) {

        return new OperacaoRealizada(
                evento.getObjetoId(),
                tipoResposta,
                evento.getTimestamp(),
                new BigDecimal(valor).setScale(2, RoundingMode.HALF_UP).toPlainString(),
                destino,
                Map.of(
                        "conta", Map.of(
                                "href", "/contas/"
                                        + evento.getObjetoId()
                        ),
                        "extrato", Map.of(
                                "href", "/contas/"
                                        + evento.getObjetoId()
                                        + "/extrato"
                        )
                )
        );
    }
}
