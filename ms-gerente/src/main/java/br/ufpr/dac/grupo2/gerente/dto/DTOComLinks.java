package br.ufpr.dac.grupo2.gerente.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.LinkedHashMap;
import java.util.Map;

public abstract class DTOComLinks {

    @JsonProperty("_links")
    private final Map<String, Link> links = new LinkedHashMap<>();

    @JsonProperty("_links")
    public Map<String, Link> getLinks() {
        return links;
    }

    public void addLink(String rel, String href) {
        links.put(rel, new Link(href));
    }
}
