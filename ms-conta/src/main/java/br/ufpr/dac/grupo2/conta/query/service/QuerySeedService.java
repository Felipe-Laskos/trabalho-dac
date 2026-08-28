package br.ufpr.dac.grupo2.conta.query.service;

import java.sql.Connection;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuerySeedService {

    private final DataSource queryDataSource;

    public QuerySeedService(
            @Qualifier("queryDataSource") DataSource queryDataSource) {
        this.queryDataSource = queryDataSource;
    }

    @Transactional(transactionManager = "queryTransactionManager")
    public void executar() {
        Connection connection = DataSourceUtils.getConnection(queryDataSource);

        try {
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource("db/seed-query.sql")
            );
        } finally {
            DataSourceUtils.releaseConnection(connection, queryDataSource);
        }
    }
}