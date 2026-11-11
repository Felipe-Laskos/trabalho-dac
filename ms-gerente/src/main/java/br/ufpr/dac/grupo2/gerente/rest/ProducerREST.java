package br.ufpr.dac.grupo2.gerente.rest;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin 
@RestController
public class ProducerREST {
    /*
    uuuhhh ohhhhhhh
    ooohh yeahhhhh

    fazendo linhas
    e mais linha 

    ooooh yeahhhhhhhhhhhhh

    if (true) {
        System.out.println("true");
    } else {
        System.out.println("false");
    }

    if dac == false {
        happy = true
    } else {
        happy = false
    }
    */

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @PostMapping ("/producer")
    ResponseEntity<?> enfileirarPessoa(@RequestParam String msg) {
        rabbitTemplate.convertAndSend("ufpr.teste", msg);
        return new ResponseEntity<>("Enfileirado: " + msg, HttpStatus.OK);
    }
}
