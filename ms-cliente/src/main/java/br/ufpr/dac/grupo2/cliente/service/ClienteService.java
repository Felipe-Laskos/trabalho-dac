package br.ufpr.dac.grupo2.cliente.service;

import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;
import br.ufpr.dac.grupo2.cliente.dto.response.ClienteResponseDTO;
import br.ufpr.dac.grupo2.cliente.model.Cliente;
import br.ufpr.dac.grupo2.cliente.repository.ClienteRepository;
import br.ufpr.dac.grupo2.cliente.repository.SolicitacaoRepository;
import br.ufpr.dac.grupo2.cliente.repository.ComandosProcessadosRepository;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final ModelMapper mapper;
    private final ComandosProcessadosRepository comandosProcessadosRepository;

    public ClienteService(ClienteRepository clienteRepository, SolicitacaoRepository solicitacaoRepository, ComandosProcessadosRepository comandosProcessadosRepository, ModelMapper mapper) {
        this.clienteRepository = clienteRepository;
        this.solicitacaoRepository = solicitacaoRepository;
        this.comandosProcessadosRepository = comandosProcessadosRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Optional<ClienteResponseDTO> buscarPorCpf(String cpf) {
        return clienteRepository.findById(cpf).map(this::paraDTO);
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

    private List<Cliente> clientesSeed() {

        Cliente c1 = new Cliente(
            "12912861012",
            "Catharyna",
            "cli1@bantads.com.br",
            "41999999999",
            new BigDecimal("10000.00"),
            "Rua das Flores",
            "123",
            "Apto 101",
            "80000000",
            "Curitiba",
            "PR"
        );

        Cliente c2 = new Cliente(
            "09506382000",
            "Cleuddônio",
            "cli2@bantads.com.br",
            "41998999999",
            new BigDecimal("20000.00"),
            "Avenida Brasil",
            "456",
            "Sala 202",
            "80000001",
            "Curitiba",
            "PR"
        );

        Cliente c3 = new Cliente(
            "85733854057",
            "Catianna",
            "cli3@bantads.com.br",
            "41997999999",
            new BigDecimal("3000.00"),
            "Travessa das Laranjeiras",
            "789",
            "Casa 303",
            "80000002",
            "Curitiba",
            "PR"
        );

        Cliente c4 = new Cliente(
            "58872160006",
            "Cutardo",
            "cli4@bantads.com.br",
            "41996999999",
            new BigDecimal("500.00"),
            "Rua dos Ipês",
            "1010",
            "Loja 10",
            "80000003",
            "Curitiba",
            "PR"
        );

        Cliente c5 = new Cliente(
            "76179646090",
            "Coândrya",
            "cli5@bantads.com.br",
            "41995999999",
            new BigDecimal("1500.00"),
            "Alameda dos Anjos",
            "1111",
            "Apartamento 202",
            "80000004",
            "Curitiba",
            "PR"
        );

        return List.of(c1, c2, c3, c4, c5);
    }

    @Transactional
    public int seed() {
        comandosProcessadosRepository.deleteAll();
        solicitacaoRepository.deleteAll();
        clienteRepository.deleteAll();

        List<Cliente> clientes = clientesSeed();

        clienteRepository.saveAll(clientes);

        return clientes.size();
    }
}
