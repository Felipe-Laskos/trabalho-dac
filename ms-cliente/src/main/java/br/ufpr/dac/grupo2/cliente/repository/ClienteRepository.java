package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, String> {

    @Query(value = "SELECT * FROM cliente.clientes ORDER BY nome COLLATE \"pt-BR-x-icu\"", nativeQuery = true)
    List<Cliente> listarOrdenadoPorNome();

    @Query(value = """
            SELECT * FROM cliente.clientes
             WHERE strpos(cpf, :busca) > 0
                OR strpos(
                       lower(translate(nome,   'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
                       lower(translate(:busca, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
                   ) > 0
             ORDER BY nome COLLATE "pt-BR-x-icu"
            """, nativeQuery = true)
    List<Cliente> buscarOrdenado(@Param("busca") String busca);
}
