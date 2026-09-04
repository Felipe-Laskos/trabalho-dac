package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class AppendTransacional {

    private final ContaLeituraService leitura;
    private final EventoRepository eventoRepository;
    private final EventoPublisher eventoPublisher;

    public AppendTransacional(
            ContaLeituraService leitura,
            EventoRepository eventoRepository,
            EventoPublisher eventoPublisher) {
        this.leitura = leitura;
        this.eventoRepository = eventoRepository;
        this.eventoPublisher = eventoPublisher;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public Evento executar(
            String numeroConta,
            String tipo,
            Map<String, Object> payload) {

        EstadoConta estado = leitura.replay(numeroConta);
        leitura.validar(tipo, payload, estado);

        Evento evento = new Evento(
                numeroConta,
                tipo,
                payload,
                estado.getVersao() + 1,
                LocalDateTime.now()
        );

        try {
            eventoRepository.saveAndFlush(evento);
        } catch (DataIntegrityViolationException e) {
            throw new ConflitoDeVersaoException(
                    numeroConta,
                    evento.getVersao(),
                    e
            );
        }

        eventoPublisher.publicarDepoisDoCommit(evento);
        return evento;
    }
}
