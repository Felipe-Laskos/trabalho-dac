package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReprojecaoService {

    private static final Logger log =
            LoggerFactory.getLogger(ReprojecaoService.class);

    private final EventoRepository eventos;
    private final EventoPublisher publisher;

    public ReprojecaoService(
            EventoRepository eventos,
            EventoPublisher publisher) {
        this.eventos = eventos;
        this.publisher = publisher;
    }

    @Transactional(
            transactionManager = "commandTransactionManager",
            readOnly = true
    )
    public int republicar(String numeroConta) {
        List<Evento> lista =
                eventos.findByObjetoIdOrderByVersaoAsc(numeroConta);

        lista.forEach(publisher::publicarAgora);

        log.info(
                "Reprojecao da conta {}: {} eventos republicados",
                numeroConta,
                lista.size()
        );

        return lista.size();
    }

    @Transactional(
            transactionManager = "commandTransactionManager",
            readOnly = true
    )
    public int republicarTudo() {
        List<Evento> lista = eventos.findAll(
                Sort.by("objetoId", "versao")
        );

        lista.forEach(publisher::publicarAgora);

        log.info(
                "Reprojecao completa: {} eventos republicados",
                lista.size()
        );

        return lista.size();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void reconciliarNaSubida() {
        try {
            republicarTudo();
        } catch (RuntimeException e) {
            log.error(
                    "Falha ao reconciliar eventos na subida - rode POST "
                            + "/admin/reprojetar",
                    e
            );
        }
    }
}
