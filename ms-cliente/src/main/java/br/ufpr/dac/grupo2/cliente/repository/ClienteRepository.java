package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, String> {
    boolean existsByCpf(String cpf);
    boolean existsByEmail(String email);

    @Query(value = "SELECT * FROM cliente.clientes ORDER BY nome COLLATE \"pt-BR-x-icu\"", nativeQuery = true)
    List<Cliente> listarOrdenadoPorNome();

    List<Cliente> findByCpfContainingOrNomeContainingIgnoreCase(String cpf, String nome);
}
