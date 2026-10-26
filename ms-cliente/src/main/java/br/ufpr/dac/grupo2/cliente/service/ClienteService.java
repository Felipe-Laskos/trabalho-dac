package br.ufpr.dac.grupo2.cliente.service;

import br.ufpr.dac.grupo2.cliente.dto.ClienteResumoDTO;
import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;
import br.ufpr.dac.grupo2.cliente.dto.response.ClienteResponseDTO;
import br.ufpr.dac.grupo2.cliente.model.Cliente;
import br.ufpr.dac.grupo2.cliente.model.ComandoProcessado;
import br.ufpr.dac.grupo2.cliente.model.ComandoProcessadoId;
import br.ufpr.dac.grupo2.cliente.model.Solicitacao;
import br.ufpr.dac.grupo2.cliente.repository.ClienteRepository;
import br.ufpr.dac.grupo2.cliente.repository.SolicitacaoRepository;
import br.ufpr.dac.grupo2.cliente.repository.ComandosProcessadosRepository;
import br.ufpr.dac.grupo2.cliente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.cliente.messaging.dto.ResultadoSaga;

import org.modelmapper.ModelMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
public class ClienteService {

    private static final Logger log = LoggerFactory.getLogger(ClienteService.class);

    private static final String APROVAR = "aprovar-solicitacao";
    private static final String CRIAR = "criar-cliente";

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

    private ClienteResponseDTO paraDTO(Cliente cliente) {
        ClienteResponseDTO dto = mapper.map(cliente, ClienteResponseDTO.class);

        dto.setEndereco(mapper.map(cliente, EnderecoDTO.class));

        dto.setSalario(dinheiro(cliente.getSalario()));

        dto.addLink("self", "/clientes/" + cliente.getCpf());
        dto.addLink("conta", "/clientes/" + cliente.getCpf() + "/conta");

        return dto;
    }

    @Transactional(readOnly = true)
    public Optional<ClienteResponseDTO> buscarPorCpf(String cpf) {
        return clienteRepository.findById(cpf).map(this::paraDTO);
    }

    private ClienteResumoDTO paraResumoDTO(Cliente cliente) {
        ClienteResumoDTO dto = new ClienteResumoDTO();
        dto.setCpf(cliente.getCpf());
        dto.setNome(cliente.getNome());
        dto.setCidade(cliente.getCidade());
        dto.setEstado(cliente.getUf());

        dto.addLink("self", "/clientes/" + cliente.getCpf());

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ClienteResumoDTO> buscarPorCpfouNome(String busca) {
        List<Cliente> clientes;

        if (busca != null && !busca.isBlank()) {
            clientes = clienteRepository.buscarOrdenado(busca);
        } else {
            clientes = clienteRepository.listarOrdenadoPorNome();
        }

        return clientes.stream()
                .map(this::paraResumoDTO)
                .toList();
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

        clienteRepository.flush();

        List<Cliente> clientes = clientesSeed();

        clienteRepository.saveAll(clientes);

        return clientes.size();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> obterClientesPorCpf(List<String> cpfs) {
        if (cpfs == null || cpfs.isEmpty()) {
            throw new IllegalArgumentException("A lista de CPFs não pode ser vazia.");
        }

        List<String> cpfsUnicos = cpfs.stream().distinct().toList();

        List<Cliente> clientes = clienteRepository.findByCpfIn(cpfsUnicos);

        if (clientes.size() != cpfsUnicos.size()) {
            throw new IllegalArgumentException("Um ou mais CPFs solicitados não foram encontrados.");
        }

        return clientes.stream()
        .map(c -> Map.<String, Object>of("cpf", c.getCpf(), "nome", c.getNome(), "email", c.getEmail()))
        .toList();
    }

    @Transactional(readOnly = true)
    public ResultadoSaga executar(MensagemSaga cmd, List<String> cpfs) {
        try {
            List<Map<String, Object>> clientes = obterClientesPorCpf(cpfs);
            Map<String, Object> payloadMap = Map.of("clientes", clientes);

            ResultadoSaga.Resposta resposta = new ResultadoSaga.Resposta(
                    cmd.sagaId(),
                    cmd.tipo(),
                    LocalDateTime.now().toString(),
                    payloadMap,
                    "SUCESSO",
                    null
            );

            return new ResultadoSaga(resposta);

        } catch (IllegalArgumentException e) {
            return registrarFalha(cmd, e.getMessage());
        } catch (Exception e) {
            return registrarFalha(cmd, "Erro interno ao buscar clientes: " + e.getMessage());
        }
    }

    @Transactional
    public ResultadoSaga aprovarSolicitacao(MensagemSaga cmd, String cpf) {
        try {
            Solicitacao solicitacao = solicitacaoRepository.findById(cpf).orElse(null);
            if (solicitacao == null) {
                return registrarFalha(cmd, "Solicitação não encontrada");
            }

            ComandoProcessadoId chave = new ComandoProcessadoId(cmd.sagaId(), cmd.tipo());
            if (!comandosProcessadosRepository.existsById(chave)) {
                if (!"PENDENTE".equals(solicitacao.getStatus())) {
                    return registrarFalha(cmd, "Esta solicitação já foi processada");
                }

                solicitacao.setStatus("APROVADA");
                solicitacao.setMotivo(null);
                solicitacao.setDataHoraProcessamento(LocalDateTime.now());
                solicitacaoRepository.saveAndFlush(solicitacao);
                comandosProcessadosRepository.saveAndFlush(new ComandoProcessado(chave, LocalDateTime.now()));
            }

            return sucesso(cmd, Map.of("nome", solicitacao.getNome(), "email", solicitacao.getEmail()));

        } catch (RuntimeException e) {
            return falhaInterna(cmd, cpf, e);
        }
    }

    @Transactional
    public ResultadoSaga compensarAprovarSolicitacao(MensagemSaga cmd, String cpf) {
        try {
            ComandoProcessadoId chave = new ComandoProcessadoId(cmd.sagaId(), cmd.tipo());
            if (!comandosProcessadosRepository.existsById(chave)) {
                if (comandosProcessadosRepository.existsById(new ComandoProcessadoId(cmd.sagaId(), APROVAR))) {
                    solicitacaoRepository.findById(cpf).ifPresent(s -> devolver(s, cmd.texto("motivoRecusa")));
                }
                comandosProcessadosRepository.saveAndFlush(new ComandoProcessado(chave, LocalDateTime.now()));
            }

            return sucesso(cmd, Map.of("cpf", cpf));

        } catch (RuntimeException e) {
            return falhaInterna(cmd, cpf, e);
        }
    }

    private void devolver(Solicitacao solicitacao, String motivoRecusa) {
        if (motivoRecusa != null && !motivoRecusa.isBlank()) {
            solicitacao.setStatus("NAO_APROVADA");
            solicitacao.setMotivo(motivoRecusa);
            solicitacao.setDataHoraProcessamento(LocalDateTime.now());
        } else {
            solicitacao.setStatus("PENDENTE");
            solicitacao.setMotivo(null);
            solicitacao.setDataHoraProcessamento(null);
        }
        solicitacaoRepository.saveAndFlush(solicitacao);
    }

    @Transactional
    public ResultadoSaga criarCliente(MensagemSaga cmd, String cpf) {
        try {
            ComandoProcessadoId chave = new ComandoProcessadoId(cmd.sagaId(), cmd.tipo());
            if (comandosProcessadosRepository.existsById(chave)) {
                return sucesso(cmd, Map.of());
            }

            Solicitacao s = solicitacaoRepository.findById(cpf).orElse(null);
            if (s == null) {
                return registrarFalha(cmd, "Solicitação não encontrada");
            }
            if (clienteRepository.existsById(cpf)) {
                return registrarFalha(cmd, "CPF já cadastrado");
            }
            if (clienteRepository.existsByEmail(s.getEmail())) {
                return recusar(cmd, "E-mail já cadastrado");
            }

            clienteRepository.saveAndFlush(new Cliente(s.getCpf(), s.getNome(), s.getEmail(), s.getTelefone(),
                    s.getSalario(), s.getLogradouro(), s.getNumero(), s.getComplemento(), s.getCep(),
                    s.getCidade(), s.getUf()));
            comandosProcessadosRepository.saveAndFlush(new ComandoProcessado(chave, LocalDateTime.now()));

            return sucesso(cmd, Map.of());

        } catch (RuntimeException e) {
            return falhaInterna(cmd, cpf, e);
        }
    }

    @Transactional
    public ResultadoSaga compensarCriarCliente(MensagemSaga cmd, String cpf) {
        try {
            ComandoProcessadoId chave = new ComandoProcessadoId(cmd.sagaId(), cmd.tipo());
            if (!comandosProcessadosRepository.existsById(chave)) {
                if (comandosProcessadosRepository.existsById(new ComandoProcessadoId(cmd.sagaId(), CRIAR))) {
                    clienteRepository.deleteById(cpf);
                    clienteRepository.flush();
                }
                comandosProcessadosRepository.saveAndFlush(new ComandoProcessado(chave, LocalDateTime.now()));
            }

            return sucesso(cmd, Map.of("cpf", cpf));

        } catch (RuntimeException e) {
            return falhaInterna(cmd, cpf, e);
        }
    }

    private ResultadoSaga falhaInterna(MensagemSaga cmd, String cpf, RuntimeException e) {
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        log.error("sagaId={} tipo={} cpf={} falhou", cmd.sagaId(), cmd.tipo(), cpf, e);
        return registrarFalha(cmd, "Erro interno no MS Cliente ao processar " + cmd.tipo());
    }

    private ResultadoSaga recusar(MensagemSaga cmd, String motivo) {
        return new ResultadoSaga(new ResultadoSaga.Resposta(cmd.sagaId(), cmd.tipo(),
                LocalDateTime.now().toString(), Map.of("motivoRecusa", motivo), "FALHA", motivo));
    }

    private ResultadoSaga sucesso(MensagemSaga cmd, Map<String, Object> payload) {
        return new ResultadoSaga(new ResultadoSaga.Resposta(cmd.sagaId(), cmd.tipo(),
                LocalDateTime.now().toString(), payload, "SUCESSO", null));
    }

    public ResultadoSaga registrarFalha(MensagemSaga cmd, String mensagemErro) {

        ResultadoSaga.Resposta resposta = new ResultadoSaga.Resposta(
                cmd.sagaId(),
                cmd.tipo(),
                LocalDateTime.now().toString(),
                null,
                "FALHA",
                mensagemErro
        );

        return new ResultadoSaga(resposta);
    }
}