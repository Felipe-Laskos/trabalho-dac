package br.ufpr.dac.grupo2.cliente.service;

import br.ufpr.dac.grupo2.cliente.dto.request.SolicitacaoRequestDTO;
import br.ufpr.dac.grupo2.cliente.dto.response.SolicitacaoResponseDTO;
import br.ufpr.dac.grupo2.cliente.exception.SolicitacaoDuplicadaException;

import br.ufpr.dac.grupo2.cliente.model.Solicitacao;
import br.ufpr.dac.grupo2.cliente.repository.SolicitacaoRepository;
import br.ufpr.dac.grupo2.cliente.repository.ClienteRepository;
import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
public class SolicitacaoService {

    private final SolicitacaoRepository solicitacaoRepository;
    private final ClienteRepository clienteRepository;
    private final ModelMapper mapper;

    public SolicitacaoService(SolicitacaoRepository solicitacaoRepository, ClienteRepository clienteRepository, ModelMapper mapper) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.clienteRepository = clienteRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Optional<SolicitacaoResponseDTO> buscarSolicitacaoPorCpf(String cpf) {
        return solicitacaoRepository.findById(cpf).map(this::paraDTO);
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponseDTO> listarTodasSolicitacoes() {
        List<Solicitacao> solicitacoes = solicitacaoRepository.findAll();
        return solicitacoes.stream().map(this::paraDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponseDTO> listarSolicitacoesPorStatus(String status) {
        List<Solicitacao> solicitacoes = solicitacaoRepository.findByStatus(status);
        return solicitacoes.stream().map(this::paraDTO).toList();
    }

    private SolicitacaoResponseDTO paraDTO(Solicitacao solicitacao) {
        SolicitacaoResponseDTO dto = mapper.map(solicitacao, SolicitacaoResponseDTO.class);

        dto.setEndereco(mapper.map(solicitacao, EnderecoDTO.class));

        dto.setSalario(solicitacao.getSalario()
            .setScale(2, RoundingMode.HALF_UP)
            .toPlainString()
        );

        dto.addLink("self", "/solicitacoes/" + solicitacao.getCpf());

        if ("PENDENTE".equals(solicitacao.getStatus())) {
            dto.addLink("aprovacao", "/solicitacoes/" + solicitacao.getCpf() + "/aprovacao");
            dto.addLink("rejeicao", "/solicitacoes/" + solicitacao.getCpf() + "/rejeicao");
        }
        return dto;
    }

    @Transactional
    public SolicitacaoResponseDTO criarSolicitacao(SolicitacaoRequestDTO request) {
        if (solicitacaoRepository.existsById(request.getCpf())) {
            throw new SolicitacaoDuplicadaException("Solicitação já existe para o CPF: " + request.getCpf());
        }

        if (clienteRepository.existsById(request.getCpf())) {
            throw new SolicitacaoDuplicadaException("CPF já possui conta: " + request.getCpf());
        }

        if (solicitacaoRepository.existsByEmail(request.getEmail())) {
            throw new SolicitacaoDuplicadaException("Solicitação já existe para o email: " + request.getEmail());
        }

        Solicitacao solicitacao = new Solicitacao();

        solicitacao.setCpf(request.getCpf());
        solicitacao.setNome(request.getNome());
        solicitacao.setEmail(request.getEmail());
        solicitacao.setTelefone(request.getTelefone());
        solicitacao.setSalario(request.getSalario());
        solicitacao.setLogradouro(request.getEndereco().getLogradouro());
        solicitacao.setNumero(request.getEndereco().getNumero());
        solicitacao.setComplemento(request.getEndereco().getComplemento());
        solicitacao.setCep(request.getEndereco().getCep());
        solicitacao.setCidade(request.getEndereco().getCidade());
        solicitacao.setUf(request.getEndereco().getUf());
        solicitacao.setStatus("PENDENTE");
        solicitacao.setMotivo(null);
        solicitacao.setDataHoraProcessamento(null);

        Solicitacao salva = solicitacaoRepository.save(solicitacao);

        return paraDTO(salva);
    }

}
