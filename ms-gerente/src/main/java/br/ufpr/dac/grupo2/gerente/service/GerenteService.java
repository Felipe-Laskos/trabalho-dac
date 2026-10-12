package br.ufpr.dac.grupo2.gerente.service;

import br.ufpr.dac.grupo2.gerente.dto.request.GerenteRequestDTO;
import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.exception.GerenteException;
import br.ufpr.dac.grupo2.gerente.model.Gerente;
import br.ufpr.dac.grupo2.gerente.repository.GerenteRepository;
import br.ufpr.dac.grupo2.gerente.repository.ComandosProcessadosRepository;
import br.ufpr.dac.grupo2.gerente.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.gerente.dto.MensagemSaga;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class GerenteService {

    private final GerenteRepository gerenteRepository;
    private final ComandosProcessadosRepository comandosProcessadosRepository;
    private final ModelMapper mapper;
    private final ObjectMapper json;

    public GerenteService(GerenteRepository gerenteRepository, ComandosProcessadosRepository comandosProcessadosRepository, ModelMapper mapper, ObjectMapper json) {
        this.gerenteRepository = gerenteRepository;
        this.comandosProcessadosRepository = comandosProcessadosRepository;
        this.mapper = mapper;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Optional<GerenteResponseDTO> buscarPorCpf(String cpf) {
        return gerenteRepository.findById(cpf).map(this::paraDTO);
    }

    @Transactional(readOnly = true)
    public List<GerenteResponseDTO> listarAtivos() {
        return gerenteRepository.listarAtivosOrdenadoPorNome().stream()
                .map(this::paraDTO)
                .toList();
    }

    @Transactional
    public GerenteResponseDTO atualizar(String cpf, GerenteUpdateRequestDTO dados) {
        Gerente gerente = gerenteRepository.findById(cpf)
                .orElseThrow(() -> new GerenteNaoEncontradoException("Gerente não encontrado"));

        if (dados.getCpf() != null && !dados.getCpf().equals(gerente.getCpf())) {
            throw new CampoImutavelException("O CPF não pode ser alterado");
        }
        if (dados.getEmail() != null && !dados.getEmail().equals(gerente.getEmail())) {
            throw new CampoImutavelException("O e-mail é o login e não pode ser alterado");
        }

        gerente.setNome(dados.getNome());
        gerente.setTelefone(dados.getTelefone());

        return paraDTO(gerente);
    }

    private GerenteResponseDTO paraDTO(Gerente gerente) {
        GerenteResponseDTO dto = mapper.map(gerente, GerenteResponseDTO.class);

        // quantidadeClientes vem do MS Conta por API Compositio

        String base = "/gerentes/" + gerente.getCpf();
        dto.addLink("self", base);
        dto.addLink("atualizacao", base);
        dto.addLink("remocao", base);

        return dto;
    }

    private List<Gerente> gerentesSeed() {

        Gerente g1 = new Gerente(
            "98574307084",
            "Geniéve",
            "ger1@bantads.com.br",
            "41999999999",
            true
        );

        Gerente g2 = new Gerente(
            "64065268052",
            "Godophredo",
            "ger2@bantads.com.br",
            "41998999999",
            true
        );

        Gerente g3 = new Gerente(
            "23862179060",
            "Gyândula",
            "ger3@bantads.com.br",
            "41997999999",
            true
        );

        Gerente g4 = new Gerente(
            "40501740066",
            "Gadamântio",
            "ger4@bantads.com.br",
            "41996999999",
            true
        );

        return List.of(g1, g2, g3, g4);
    }

    @Transactional 
    public int seed() {
        comandosProcessadosRepository.deleteAll();
        gerenteRepository.deleteAll();

        gerenteRepository.flush();

        List<Gerente> gerentes = gerentesSeed();

        gerenteRepository.saveAll(gerentes);

        return gerentes.size();
    }

    @Transactional
    public ResultadoSaga inserirGerente(MensagemSaga cmd) {
        try {
            String jsonPayload = json.writeValueAsString(cmd.payload());
            GerenteRequestDTO request = json.readValue(jsonPayload, GerenteRequestDTO.class);

            if (gerenteRepository.existsById(request.getCpf())) {
                return registrarFalha(cmd, "CPF já cadastrado");
            }

            if (gerenteRepository.existsByEmail(request.getEmail())) {
                return registrarFalha(cmd, "E-mail já cadastrado");
            }

            Gerente gerente = new Gerente(
                request.getCpf(),
                request.getNome(),
                request.getEmail(),
                request.getTelefone(),
                true
            );

            Gerente salvo = gerenteRepository.save(gerente);

            Map<String, Object> payloadMap = Map.of("cpf", salvo.getCpf());

            ResultadoSaga.Resposta resposta = new ResultadoSaga.Resposta(
                    cmd.sagaId(),
                    cmd.tipo(),
                    LocalDateTime.now().toString(),
                    payloadMap,
                    "SUCESSO",
                    null
            );

            return new ResultadoSaga(resposta);

        } catch (Exception e) {
            return registrarFalha(cmd, "Erro interno ao processar inserção: " + e.getMessage());
        }
    }

    @Transactional
    public ResultadoSaga compensarInserirGerente (MensagemSaga cmd, String cpf) {
        try {
            if (gerenteRepository.existsById(cpf)) {
                gerenteRepository.deleteById(cpf);
            }

            Map<String, Object> payloadMap = Map.of("cpf", cpf);

            ResultadoSaga.Resposta resposta = new ResultadoSaga.Resposta(
                    cmd.sagaId(),
                    cmd.tipo(),
                    LocalDateTime.now().toString(),
                    payloadMap,
                    "SUCESSO",
                    null
            );

            return new ResultadoSaga(resposta);

        } catch (Exception e) {
            return registrarFalha(cmd, "Erro interno ao inserir gerente: " + e.getMessage());
        }
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

    @Transactional(readOnly = true)
    public List<GerenteResponseDTO> listarAtivos() {
        return gerenteRepository.findByAtivoTrueOrderByNomeAsc()
                .stream()
                .map(this::paraDTO)
                .toList();
    }

    @Transactional
    public GerenteResponseDTO atualizarGerente(String cpf, GerenteRequestDTO request) {
        Gerente gerente = gerenteRepository.findById(cpf)
                .orElseThrow(() -> new GerenteException("Gerente com CPF " + cpf + " não encontrado."));

        if (!cpf.equals(request.getCpf())) {
            throw new GerenteException("O CPF é imutável e não pode ser alterado.");
        }
        if (!gerente.getEmail().equals(request.getEmail())) {
            throw new GerenteException("O e-mail é imutável e não pode ser alterado.");
        }

        gerente.setNome(request.getNome());
        gerente.setTelefone(request.getTelefone());

        Gerente atualizado = gerenteRepository.save(gerente);

        return paraDTO(atualizado);
    }
}
