package br.ufpr.dac.grupo2.gerente.service;

import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.model.Gerente;
import br.ufpr.dac.grupo2.gerente.repository.GerenteRepository;

import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class GerenteService {

    private final GerenteRepository repository;
    private final ModelMapper mapper;

    public GerenteService(GerenteRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Optional<GerenteResponseDTO> buscarPorCpf(String cpf) {
        return repository.findById(cpf).map(this::paraDTO);
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
}
