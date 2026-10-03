package br.ufpr.dac.grupo2.conta.query.repository;

import java.util.List;
import java.util.Optional;

import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContaQueryRepository
        extends JpaRepository<ContaQuery, String> {

    interface ContagemGerente {
        String getCpf();

        Long getQuantidade();
    }

    @Query("select c.cpfGerente as cpf, count(c) as quantidade "
            + "from ContaQuery c group by c.cpfGerente")
    List<ContagemGerente> contarPorGerente();

    @Modifying
    @Query(value = "LOCK TABLE conta_query.contas IN SHARE ROW EXCLUSIVE MODE",
            nativeQuery = true)
    void bloquearProjecao();

    @Query(value = "SELECT EXISTS(SELECT 1 FROM conta_query.contas_compensadas "
            + "WHERE numero = :numero)", nativeQuery = true)
    boolean compensada(@Param("numero") String numero);

    @Modifying
    @Query(value = "INSERT INTO conta_query.contas_compensadas(numero) "
            + "VALUES (:numero) ON CONFLICT DO NOTHING", nativeQuery = true)
    void marcarCompensada(@Param("numero") String numero);

    @Modifying
    @Query(value = "DELETE FROM conta_query.movimentacoes WHERE numero_conta = :numero",
            nativeQuery = true)
    void apagarMovimentacoes(@Param("numero") String numero);

    Optional<ContaQuery> findByCpfCliente(String cpfCliente);
}
