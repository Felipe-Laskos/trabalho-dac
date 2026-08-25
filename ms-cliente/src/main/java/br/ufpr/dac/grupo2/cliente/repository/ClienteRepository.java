package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Cliente;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, String> {
}
