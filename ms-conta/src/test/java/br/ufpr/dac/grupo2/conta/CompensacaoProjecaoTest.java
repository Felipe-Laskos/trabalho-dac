package br.ufpr.dac.grupo2.conta;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import java.time.LocalDateTime;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;
import br.ufpr.dac.grupo2.conta.query.listener.ProjecaoContaListener;
import br.ufpr.dac.grupo2.conta.query.repository.*;
import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
class CompensacaoProjecaoTest {
    @Test void compensacaoMarcaEApaga() throws Exception {
        var contas=mock(ContaQueryRepository.class);
        var movs=mock(MovimentacaoRepository.class);
        var json=JsonMapper.builder().findAndAddModules().build();
        var listener=new ProjecaoContaListener(json,contas,movs);
        var evento=new EventoPublicado(50L,"0042","CriacaoCompensada",
                Map.of(),2,LocalDateTime.now());
        listener.projetar(json.writeValueAsString(evento));
        verify(contas).marcarCompensada("0042");
        verify(contas).apagarMovimentacoes("0042");
        verify(contas,never()).save(any());
    }
    @Test void criadoAtrasadoNaoRessuscitaConta() throws Exception {
        var contas=mock(ContaQueryRepository.class);
        var movs=mock(MovimentacaoRepository.class);
        when(contas.compensada("0042")).thenReturn(true);
        var json=JsonMapper.builder().findAndAddModules().build();
        var listener=new ProjecaoContaListener(json,contas,movs);
        var evento=new EventoPublicado(49L,"0042","Criado",Map.of(),1,
                LocalDateTime.now());
        listener.projetar(json.writeValueAsString(evento));
        verify(contas,never()).save(any());
        verifyNoInteractions(movs);
    }
}