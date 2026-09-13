const bantads = db.getSiblingDB('bantads_auth');

bantads.usuarios.drop();

bantads.usuarios.insertMany([
  { cpf: '12912861012', tipo: 'CLIENTE', login: 'cli1@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGNsaTFCYW5UYWRz$vRAwn2mJNfrllsb19Nz9Kt0efWrFaZS+lULqq9QlYAY' },
  { cpf: '09506382000', tipo: 'CLIENTE', login: 'cli2@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGNsaTJCYW5UYWRz$zCFctR3E5dqcNBjssF7dvrrymnYMXaMtSW5J73e6mXU' },
  { cpf: '85733854057', tipo: 'CLIENTE', login: 'cli3@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGNsaTNCYW5UYWRz$mygrXVbBn8+UqFID3w7hYLon4gCANpwfbmfZgCaD13o' },
  { cpf: '58872160006', tipo: 'CLIENTE', login: 'cli4@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGNsaTRCYW5UYWRz$ufuxpUG1b/l7QrKmRO1Pw5DwkAG2hlRYmWb9TWOMFtQ' },
  { cpf: '76179646090', tipo: 'CLIENTE', login: 'cli5@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGNsaTVCYW5UYWRz$/vI/P/bUMz9waiKMKAIV1Xroik0FOAVFQyL0itHN2Kc' },

  { cpf: '98574307084', tipo: 'GERENTE', login: 'ger1@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGdlcjFCYW5UYWRz$hKCaa1BRVbaIR2Gdd3/SV5ZWRi/enwgDl10Lb6njFwE' },
  { cpf: '64065268052', tipo: 'GERENTE', login: 'ger2@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGdlcjJCYW5UYWRz$eg9hGLvE/IJZXknwPz2+PGr4Dh3o9AauALBdxsDitZY' },
  { cpf: '23862179060', tipo: 'GERENTE', login: 'ger3@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGdlcjNCYW5UYWRz$9eMegoiaDukBULyMqH4i+H8SsIk4sJC5Ul2nCSwv7cY' },
  { cpf: '40501740066', tipo: 'GERENTE', login: 'ger4@bantads.com.br', ativo: true,
    senha: '$argon2id$v=19$m=16384,t=2,p=1$UzRsVGdlcjRCYW5UYWRz$Du+WNNa7Wq/jwrtEbQFWv6suXUf4WPp9j0AFyp+iIa4' }
]);

bantads.usuarios.createIndex({ login: 1 }, { unique: true, name: 'uk_usuarios_login' });

print('[seed-auth] usuarios: ' + bantads.usuarios.countDocuments());
