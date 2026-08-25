package br.ufpr.dac.grupo2.cliente.service;

import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;
import br.ufpr.dac.grupo2.cliente.dto.response.ClienteResponseDTO;
import br.ufpr.dac.grupo2.cliente.model.Cliente;
import br.ufpr.dac.grupo2.cliente.repository.ClienteRepository;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
public class ClienteService {

    private final ClienteRepository repository;
    private final ModelMapper mapper;

    public ClienteService(ClienteRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Optional<ClienteResponseDTO> buscarPorCpf(String cpf) {
        return repository.findById(cpf).map(this::paraDTO);
    }

    private ClienteResponseDTO paraDTO(Cliente cliente) {
        ClienteResponseDTO dto = mapper.map(cliente, ClienteResponseDTO.class);

        dto.setEndereco(mapper.map(cliente, EnderecoDTO.class));

        dto.setSalario(dinheiro(cliente.getSalario()));

        dto.addLink("self", "/clientes/" + cliente.getCpf());
        dto.addLink("conta", "/clientes/" + cliente.getCpf() + "/conta");

        return dto;
    }

    private static String dinheiro(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
