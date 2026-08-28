package br.ufpr.dac.grupo2.conta.command.service;

import java.sql.Connection;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommandSeedService {

    private final DataSource commandDataSource;

    public CommandSeedService(
            @Qualifier("commandDataSource") DataSource commandDataSource) {
        this.commandDataSource = commandDataSource;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public void executar() {
        Connection connection = DataSourceUtils.getConnection(commandDataSource);

        try {
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/seed-command.sql")
            );
        } finally {
            DataSourceUtils.releaseConnection(connection, commandDataSource);
        }
    }
}