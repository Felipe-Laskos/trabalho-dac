package br.ufpr.dac.grupo2.gerente.service;

import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.model.Gerente;
import br.ufpr.dac.grupo2.gerente.repository.GerenteRepository;
import br.ufpr.dac.grupo2.gerente.repository.ComandosProcessadosRepository;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class GerenteService {

    private final GerenteRepository gerenteRepository;
    private final ComandosProcessadosRepository comandosProcessadosRepository;
    private final ModelMapper mapper;

    public GerenteService(GerenteRepository gerenteRepository, ComandosProcessadosRepository comandosProcessadosRepository, ModelMapper mapper) {
        this.gerenteRepository = gerenteRepository;
        this.comandosProcessadosRepository = comandosProcessadosRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Optional<GerenteResponseDTO> buscarPorCpf(String cpf) {
        return gerenteRepository.findById(cpf).map(this::paraDTO);
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

        List<Gerente> gerentes = gerentesSeed();

        gerenteRepository.saveAll(gerentes);

        return gerentes.size();
    }
}
