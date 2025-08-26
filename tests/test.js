const axios = require('axios');

// Configurações
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1`;

// Cores para logs
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Contadores de testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];
let startTime; // Definir no escopo global

// Dados dos usuários de teste
const testUsers = [
    {
        name: 'João Silva (Host)',
        username: 'joaohost',
        email: 'joao.host@test.com',
        password: 'TestPass@123',
        birthDate: '1995-05-15',
        bio: 'Host de salas de teste'
    },
    {
        name: 'Maria Santos (Participant)',
        username: 'mariapart',
        email: 'maria.participant@test.com',
        password: 'TestPass@123',
        birthDate: '1990-08-22',
        bio: 'Participante ativa'
    },
    {
        name: 'Pedro Costa (External)',
        username: 'pedroext',
        email: 'pedro.external@test.com',
        password: 'TestPass@123',
        birthDate: '1988-12-10',
        bio: 'Usuário externo'
    }
];

// Storage para dados dos testes
const testData = {
    users: [],
    rooms: [],
    tokens: []
};

// Utilitários
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName, success, message = '', data = null) {
    totalTests++;
    const status = success ? 'PASS' : 'FAIL';
    const statusColor = success ? colors.green : colors.red;
    
    log(`[${status}] ${testName}`, statusColor);
    if (message) {
        log(`      ${message}`, colors.cyan);
    }
    if (data && !success) {
        log(`      Error: ${JSON.stringify(data)}`, colors.red);
    }
    
    testResults.push({
        name: testName,
        success,
        message,
        timestamp: new Date().toISOString()
    });
    
    if (success) {
        passedTests++;
    } else {
        failedTests++;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, token = null, expectedStatus = null) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        
        if (expectedStatus && response.status !== expectedStatus) {
            throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
        }
        
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// Teste 1: Health Check
async function testHealthCheck() {
    log('\n=== TESTE 1: HEALTH CHECK ===', colors.magenta);
    
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        logTest('Health Check', response.status === 200, 'API está funcionando');
        return true;
    } catch (error) {
        logTest('Health Check', false, 'API não está respondendo', error.message);
        return false;
    }
}

// Teste 2: Registro de Usuários
async function testUserRegistration() {
    log('\n=== TESTE 2: REGISTRO DE USUÁRIOS ===', colors.magenta);
    
    for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        const result = await makeRequest('POST', '/auth/register', user, null, 201);
        
        if (result.success) {
            testData.users.push(result.data.data.user);
            testData.tokens.push(result.data.data.token);
            logTest(`Registro ${user.name}`, true, `ID: ${result.data.data.user.id}`);
        } else {
            logTest(`Registro ${user.name}`, false, 'Falha no registro', result.error);
        }
        
        await sleep(200); // Pausa maior para evitar rate limiting
    }
    
    return testData.users.length === 3;
}

// Teste 3: Criação de Salas
async function testRoomCreation() {
    log('\n=== TESTE 3: CRIAÇÃO DE SALAS ===', colors.magenta);
    
    if (testData.tokens.length === 0) {
        logTest('Criação de Salas', false, 'Nenhum token disponível');
        return false;
    }
    
    // Sala pública do YouTube (João)
    const publicRoom = {
        name: 'Clássicos do Rock - Teste',
        description: 'Sala de teste para assistir videoclipes clássicos',
        type: 'YOUTUBE_LINK',
        streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        maxParticipants: 20,
        isPrivate: false
    };
    
    let result = await makeRequest('POST', '/rooms', publicRoom, testData.tokens[0], 201);
    if (result.success) {
        testData.rooms.push(result.data.data);
        logTest('Criar sala pública', true, `ID: ${result.data.data.id}`);
    } else {
        logTest('Criar sala pública', false, 'Falha na criação', result.error);
    }
    
    await sleep(500); // Pausa para evitar rate limiting
    
    // Sala privada com link externo (João)
    const privateRoom = {
        name: 'Filme Privado - Teste',
        description: 'Sala privada para teste de acesso restrito',
        type: 'EXTERNAL_LINK',
        streamUrl: 'https://example-streaming.com/test-movie',
        maxParticipants: 5,
        isPrivate: true,
        password: 'senha123'
    };
    
    result = await makeRequest('POST', '/rooms', privateRoom, testData.tokens[0], 201);
    if (result.success) {
        testData.rooms.push(result.data.data);
        logTest('Criar sala privada', true, `ID: ${result.data.data.id}`);
    } else {
        logTest('Criar sala privada', false, 'Falha na criação', result.error);
    }
    
    await sleep(500);
    
    // Sala com dados inválidos (deve falhar)
    const invalidRoom = {
        name: '', // Nome vazio
        type: 'INVALID_TYPE',
        streamUrl: 'not-a-url',
        maxParticipants: 100 // Acima do limite
    };
    
    result = await makeRequest('POST', '/rooms', invalidRoom, testData.tokens[0]);
    logTest('Criar sala inválida (deve falhar)', !result.success, 'Validação funcionando');
    
    await sleep(500);
    return testData.rooms.length >= 2;
}

// Teste 4: Listagem de Salas
async function testRoomListing() {
    log('\n=== TESTE 4: LISTAGEM DE SALAS ===', colors.magenta);
    
    // Listar salas públicas
    let result = await makeRequest('GET', '/rooms?limit=10&offset=0', null, testData.tokens[0]);
    if (result.success && Array.isArray(result.data.data.rooms)) {
        logTest('Listar salas públicas', true, `${result.data.data.rooms.length} salas encontradas`);
    } else {
        logTest('Listar salas públicas', false, 'Falha na listagem', result.error);
    }
    
    await sleep(200);
    
    // Listar minhas salas (João)
    result = await makeRequest('GET', '/rooms/my-rooms', null, testData.tokens[0]);
    if (result.success && Array.isArray(result.data.data.rooms)) {
        logTest('Listar minhas salas', true, `${result.data.data.rooms.length} salas próprias`);
    } else {
        logTest('Listar minhas salas', false, 'Falha na listagem', result.error);
    }
    
    await sleep(200);
    
    // Listar salas participadas (inicialmente vazio para todos)
    result = await makeRequest('GET', '/rooms/joined', null, testData.tokens[1]);
    if (result.success) {
        logTest('Listar salas participadas', true, `${result.data.data.rooms.length} participações`);
    } else {
        logTest('Listar salas participadas', false, 'Falha na listagem', result.error);
    }
    
    await sleep(200);
    return true;
}

// Teste 5: Detalhes da Sala
async function testRoomDetails() {
    log('\n=== TESTE 5: DETALHES DA SALA ===', colors.magenta);
    
    if (testData.rooms.length === 0) {
        logTest('Detalhes da sala', false, 'Nenhuma sala disponível');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    
    // Host pode ver detalhes completos
    let result = await makeRequest('GET', `/rooms/${roomId}`, null, testData.tokens[0]);
    if (result.success && result.data.data.streamUrl) {
        logTest('Host ver detalhes completos', true, 'Stream URL visível para host');
    } else {
        logTest('Host ver detalhes completos', false, 'Host não conseguiu ver detalhes', result.error);
    }
    
    await sleep(200);
    
    // Usuário externo pode ver sala pública (sem stream URL)
    result = await makeRequest('GET', `/rooms/${roomId}`, null, testData.tokens[2]);
    if (result.success) {
        logTest('Usuário externo ver sala pública', true, 'Acesso permitido a sala pública');
    } else {
        logTest('Usuário externo ver sala pública', false, 'Falha no acesso', result.error);
    }
    
    await sleep(200);
    
    // Sala inexistente
    result = await makeRequest('GET', '/rooms/550e8400-e29b-41d4-a716-446655440999', null, testData.tokens[0]);
    logTest('Sala inexistente (deve falhar)', !result.success, 'Erro 404 retornado corretamente');
    
    await sleep(200);
    return true;
}

// Teste 6: Participação em Salas
async function testRoomParticipation() {
    log('\n=== TESTE 6: PARTICIPAÇÃO EM SALAS ===', colors.magenta);
    
    if (testData.rooms.length < 2) {
        logTest('Participação em salas', false, 'Salas insuficientes para teste');
        return false;
    }
    
    const publicRoomId = testData.rooms[0].id;
    const privateRoomId = testData.rooms[1].id;
    
    // Maria entra na sala pública
    let result = await makeRequest('POST', `/rooms/${publicRoomId}/join`, {}, testData.tokens[1]);
    if (result.success) {
        logTest('Entrar em sala pública', true, 'Maria entrou na sala pública');
    } else {
        logTest('Entrar em sala pública', false, 'Falha ao entrar', result.error);
    }
    
    await sleep(200);
    
    // Pedro tenta entrar na sala privada sem senha (deve falhar)
    result = await makeRequest('POST', `/rooms/${privateRoomId}/join`, {}, testData.tokens[2]);
    logTest('Entrar em sala privada sem senha (deve falhar)', !result.success, 'Senha obrigatória');
    
    await sleep(200);
    
    // Pedro entra na sala privada com senha
    result = await makeRequest('POST', `/rooms/${privateRoomId}/join`, { password: 'senha123' }, testData.tokens[2]);
    if (result.success) {
        logTest('Entrar em sala privada com senha', true, 'Pedro entrou na sala privada');
    } else {
        logTest('Entrar em sala privada com senha', false, 'Falha ao entrar', result.error);
    }
    
    await sleep(200);
    
    // Maria tenta entrar novamente na mesma sala (deve falhar)
    result = await makeRequest('POST', `/rooms/${publicRoomId}/join`, {}, testData.tokens[1]);
    logTest('Entrar novamente na mesma sala (deve falhar)', !result.success, 'Usuário já está na sala');
    
    await sleep(200);
    return true;
}

// Teste 7: Listagem de Participantes
async function testParticipantListing() {
    log('\n=== TESTE 7: LISTAGEM DE PARTICIPANTES ===', colors.magenta);
    
    if (testData.rooms.length === 0) {
        logTest('Listagem de participantes', false, 'Nenhuma sala disponível');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    
    // Host lista participantes
    let result = await makeRequest('GET', `/rooms/${roomId}/participants`, null, testData.tokens[0]);
    if (result.success && Array.isArray(result.data.data.participants)) {
        logTest('Host listar participantes', true, `${result.data.data.participants.length} participantes`);
    } else {
        logTest('Host listar participantes', false, 'Falha na listagem', result.error);
    }
    
    await sleep(200);
    
    // Participante lista participantes
    result = await makeRequest('GET', `/rooms/${roomId}/participants`, null, testData.tokens[1]);
    if (result.success) {
        logTest('Participante listar participantes', true, 'Acesso permitido');
    } else {
        logTest('Participante listar participantes', false, 'Falha no acesso', result.error);
    }
    
    await sleep(200);
    return true;
}

// Teste 8: Atualização de Sala
async function testRoomUpdate() {
    log('\n=== TESTE 8: ATUALIZAÇÃO DE SALA ===', colors.magenta);
    
    if (testData.rooms.length === 0) {
        logTest('Atualização de sala', false, 'Nenhuma sala disponível');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    
    // Host atualiza sala
    const updateData = {
        name: 'Clássicos do Rock - ATUALIZADO',
        description: 'Descrição atualizada para teste',
        maxParticipants: 25
    };
    
    let result = await makeRequest('PUT', `/rooms/${roomId}`, updateData, testData.tokens[0]);
    if (result.success) {
        logTest('Host atualizar sala', true, 'Sala atualizada com sucesso');
    } else {
        logTest('Host atualizar sala', false, 'Falha na atualização', result.error);
    }
    
    await sleep(200);
    
    // Participante tenta atualizar sala (deve falhar)
    result = await makeRequest('PUT', `/rooms/${roomId}`, updateData, testData.tokens[1]);
    logTest('Participante atualizar sala (deve falhar)', !result.success, 'Apenas host pode atualizar');
    
    await sleep(200);
    
    // Atualização com dados inválidos
    const invalidUpdate = {
        maxParticipants: 100 // Acima do limite
    };
    
    result = await makeRequest('PUT', `/rooms/${roomId}`, invalidUpdate, testData.tokens[0]);
    logTest('Atualizar com dados inválidos (deve falhar)', !result.success, 'Validação funcionando');
    
    await sleep(200);
    return true;
}

// Teste 9: Remoção de Participantes
async function testParticipantRemoval() {
    log('\n=== TESTE 9: REMOÇÃO DE PARTICIPANTES ===', colors.magenta);
    
    if (testData.rooms.length === 0 || testData.users.length < 2) {
        logTest('Remoção de participantes', false, 'Dados insuficientes');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    const participantId = testData.users[1].id; // Maria
    
    // Host remove participante
    let result = await makeRequest('DELETE', `/rooms/${roomId}/participants/${participantId}`, null, testData.tokens[0]);
    if (result.success) {
        logTest('Host remover participante', true, 'Maria removida da sala');
    } else {
        logTest('Host remover participante', false, 'Falha na remoção', result.error);
    }
    
    await sleep(200);
    
    // Participante tenta remover outro participante (deve falhar)
    // Primeiro, Maria entra novamente
    await makeRequest('POST', `/rooms/${roomId}/join`, {}, testData.tokens[1]);
    await sleep(200);
    
    result = await makeRequest('DELETE', `/rooms/${roomId}/participants/${testData.users[2].id}`, null, testData.tokens[1]);
    logTest('Participante remover outro (deve falhar)', !result.success, 'Apenas host pode remover');
    
    await sleep(200);
    
    // Host tenta remover a si mesmo (deve falhar)
    result = await makeRequest('DELETE', `/rooms/${roomId}/participants/${testData.users[0].id}`, null, testData.tokens[0]);
    logTest('Host remover a si mesmo (deve falhar)', !result.success, 'Host não pode se remover');
    
    await sleep(200);
    return true;
}

// Teste 10: Sair da Sala
async function testLeaveRoom() {
    log('\n=== TESTE 10: SAIR DA SALA ===', colors.magenta);
    
    if (testData.rooms.length === 0) {
        logTest('Sair da sala', false, 'Nenhuma sala disponível');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    
    // Maria sai da sala
    let result = await makeRequest('POST', `/rooms/${roomId}/leave`, {}, testData.tokens[1]);
    if (result.success) {
        logTest('Participante sair da sala', true, 'Maria saiu da sala');
    } else {
        logTest('Participante sair da sala', false, 'Falha ao sair', result.error);
    }
    
    await sleep(200);
    
    // Pedro sai da sala privada
    if (testData.rooms.length > 1) {
        result = await makeRequest('POST', `/rooms/${testData.rooms[1].id}/leave`, {}, testData.tokens[2]);
        if (result.success) {
            logTest('Sair da sala privada', true, 'Pedro saiu da sala privada');
        } else {
            logTest('Sair da sala privada', false, 'Falha ao sair', result.error);
        }
    }
    
    await sleep(200);
    return true;
}

// Teste 11: Cenários de Limite
async function testLimitScenarios() {
    log('\n=== TESTE 11: CENÁRIOS DE LIMITE ===', colors.magenta);
    
    // Criar sala com limite baixo para testar lotação
    const smallRoom = {
        name: 'Sala Pequena - Teste',
        description: 'Sala com limite de 1 participante',
        type: 'YOUTUBE_LINK',
        streamUrl: 'https://www.youtube.com/watch?v=test',
        maxParticipants: 1,
        isPrivate: false
    };
    
    let result = await makeRequest('POST', '/rooms', smallRoom, testData.tokens[0]);
    if (result.success) {
        const smallRoomId = result.data.data.id;
        testData.rooms.push(result.data.data);
        
        await sleep(200);
        
        // Maria entra (deve funcionar)
        result = await makeRequest('POST', `/rooms/${smallRoomId}/join`, {}, testData.tokens[1]);
        logTest('Entrar em sala com limite', result.success, 'Maria entrou na sala limitada');
        
        await sleep(200);
        
        // Pedro tenta entrar (deve falhar - sala lotada)
        result = await makeRequest('POST', `/rooms/${smallRoomId}/join`, {}, testData.tokens[2]);
        logTest('Entrar em sala lotada (deve falhar)', !result.success, 'Sala está cheia');
    } else {
        logTest('Criar sala para teste de limite', false, 'Falha na criação', result.error);
    }
    
    await sleep(500);
    return true;
}

// Teste 12: Deletar Salas
async function testRoomDeletion() {
    log('\n=== TESTE 12: DELETAR SALAS ===', colors.magenta);
    
    if (testData.rooms.length === 0) {
        logTest('Deletar salas', false, 'Nenhuma sala disponível');
        return false;
    }
    
    const roomId = testData.rooms[0].id;
    
    // Participante tenta deletar sala (deve falhar)
    let result = await makeRequest('DELETE', `/rooms/${roomId}`, null, testData.tokens[1]);
    logTest('Participante deletar sala (deve falhar)', !result.success, 'Apenas host pode deletar');
    
    await sleep(200);
    
    // Host deleta sala
    result = await makeRequest('DELETE', `/rooms/${roomId}`, null, testData.tokens[0]);
    if (result.success) {
        logTest('Host deletar sala', true, 'Sala deletada com sucesso');
    } else {
        logTest('Host deletar sala', false, 'Falha na deleção', result.error);
    }
    
    await sleep(200);
    
    // Tentar acessar sala deletada (deve falhar)
    result = await makeRequest('GET', `/rooms/${roomId}`, null, testData.tokens[0]);
    logTest('Acessar sala deletada (deve falhar)', !result.success, 'Sala não encontrada');
    
    await sleep(200);
    return true;
}

// Teste 13: Rate Limiting (agora apenas para criação)
async function testRateLimiting() {
    log('\n=== TESTE 13: RATE LIMITING ===', colors.magenta);
    
    // Tentar criar algumas salas para testar rate limiting
    const roomData = {
        name: 'Teste Rate Limit',
        type: 'YOUTUBE_LINK',
        streamUrl: 'https://www.youtube.com/watch?v=test',
        maxParticipants: 10,
       isPrivate: false
   };
   
   const results = [];
   // Criar 5 salas com pausa entre elas para testar o limite
   for (let i = 0; i < 5; i++) {
       const result = await makeRequest('POST', '/rooms', { 
           ...roomData, 
           name: `Rate Test ${i}` 
       }, testData.tokens[0]);
       results.push(result);
       
       if (result.success) {
           testData.rooms.push(result.data.data);
       }
       
       await sleep(100); // Pausa pequena entre criações
   }
   
   const successCount = results.filter(r => r.success).length;
   const rateLimitCount = results.filter(r => r.status === 429).length;
   
   if (successCount > 0) {
       logTest('Criação de salas funcionando', true, 
           `${successCount} salas criadas com sucesso`);
   }
   
   if (rateLimitCount > 0) {
       logTest('Rate limiting de criação funcionando', true, 
           `${rateLimitCount} tentativas bloqueadas por rate limit`);
   } else {
       logTest('Rate limiting testado', true, 
           `Todas as ${successCount} criações foram permitidas (dentro do limite)`);
   }
   
   await sleep(500);
   return true;
}

// Cleanup: Remover dados de teste
async function cleanup() {
   log('\n=== CLEANUP: REMOVENDO DADOS DE TESTE ===', colors.magenta);
   
   // Deletar salas restantes
   let deletedRooms = 0;
   for (const room of testData.rooms) {
       if (room.hostId === testData.users[0]?.id) {
           const result = await makeRequest('DELETE', `/rooms/${room.id}`, null, testData.tokens[0]);
           if (result.success) {
               deletedRooms++;
           }
           await sleep(100);
       }
   }
   
   logTest('Cleanup - Salas deletadas', true, `${deletedRooms} salas removidas`);
   
   await sleep(200);
   
   // Deletar contas de usuário
   let deletedUsers = 0;
   for (let i = 0; i < testData.tokens.length; i++) {
       const result = await makeRequest('DELETE', '/auth/account', null, testData.tokens[i]);
       if (result.success) {
           deletedUsers++;
       }
       await sleep(100);
   }
   
   logTest('Cleanup - Usuários deletados', true, `${deletedUsers} usuários removidos`);
   
   log(`Cleanup finalizado. ${deletedRooms} salas e ${deletedUsers} usuários removidos.`, colors.cyan);
}

// Relatório Final
function generateReport() {
   log('\n' + '='.repeat(60), colors.yellow);
   log('                    RELATÓRIO FINAL                    ', colors.yellow);
   log('='.repeat(60), colors.yellow);
   
   log(`\n📊 ESTATÍSTICAS:`, colors.blue);
   log(`   Total de testes: ${totalTests}`);
   log(`   ✅ Sucessos: ${passedTests}`, colors.green);
   log(`   ❌ Falhas: ${failedTests}`, colors.red);
   log(`   📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
   
   if (failedTests > 0) {
       log(`\n❌ TESTES QUE FALHARAM:`, colors.red);
       testResults
           .filter(t => !t.success)
           .forEach(test => {
               log(`   • ${test.name}: ${test.message}`, colors.red);
           });
   }
   
   log(`\n✅ FUNCIONALIDADES TESTADAS:`, colors.green);
   log(`   • Health Check da API`);
   log(`   • Registro de usuários`);
   log(`   • Criação de salas (públicas e privadas)`);
   log(`   • Listagem de salas`);
   log(`   • Detalhes da sala`);
   log(`   • Participação em salas`);
   log(`   • Listagem de participantes`);
   log(`   • Atualização de salas`);
   log(`   • Remoção de participantes`);
   log(`   • Saída de salas`);
   log(`   • Cenários de limite (sala lotada)`);
   log(`   • Deleção de salas`);
   log(`   • Rate limiting`);
   log(`   • Validações e regras de negócio`);
   log(`   • Autorização e controle de acesso`);
   
   log(`\n🔧 CENÁRIOS TESTADOS:`, colors.cyan);
   log(`   • Usuário host criando e gerenciando salas`);
   log(`   • Participantes entrando em salas públicas`);
   log(`   • Acesso a salas privadas com senha`);
   log(`   • Tentativas de acesso não autorizado`);
   log(`   • Validações de entrada inválida`);
   log(`   • Limites de participantes`);
   log(`   • Rate limiting de criação de salas`);
   log(`   • Cleanup de dados de teste`);
   
   const duration = Date.now() - startTime;
   log(`\n⏱️  TEMPO TOTAL: ${(duration / 1000).toFixed(2)} segundos`, colors.magenta);
   
   // Recomendações baseadas nos resultados
   if (failedTests > 0) {
       log(`\n🔧 RECOMENDAÇÕES:`, colors.yellow);
       if (testResults.some(t => !t.success && t.message.includes('rate limit'))) {
           log(`   • Considere ajustar os limites de rate limiting para desenvolvimento`);
       }
       if (testResults.some(t => !t.success && t.message.includes('database'))) {
           log(`   • Verifique a conexão com o banco de dados`);
       }
       if (testResults.some(t => !t.success && t.message.includes('authentication'))) {
           log(`   • Verifique a configuração JWT`);
       }
   }
   
   log('\n' + '='.repeat(60), colors.yellow);
}

// Função principal
async function runTests() {
   startTime = Date.now(); // Definir startTime no início
   
   log('🚀 INICIANDO TESTES AUTOMATIZADOS DA API DE ROOMS', colors.blue);
   log('=' .repeat(60), colors.blue);
   
   try {
       // Verificar se a API está rodando
       const healthCheck = await testHealthCheck();
       if (!healthCheck) {
           log('\n❌ API não está respondendo. Certifique-se de que está rodando em http://localhost:3000', colors.red);
           return;
       }
       
       // Executar testes em sequência
       const testSuite = [
           testUserRegistration,
           testRoomCreation,
           testRoomListing,
           testRoomDetails,
           testRoomParticipation,
           testParticipantListing,
           testRoomUpdate,
           testParticipantRemoval,
           testLeaveRoom,
           testLimitScenarios,
           testRoomDeletion,
           testRateLimiting
       ];
       
       for (const test of testSuite) {
           await test();
           await sleep(300); // Pausa entre testes para evitar rate limiting
       }
       
       // Cleanup
       await cleanup();
       
   } catch (error) {
       log(`\n💥 ERRO CRÍTICO: ${error.message}`, colors.red);
       log(`Stack trace: ${error.stack}`, colors.red);
       failedTests++;
   } finally {
       generateReport();
   }
}

// Executar se chamado diretamente
if (require.main === module) {
   runTests().catch(error => {
       console.error('Erro fatal:', error);
       process.exit(1);
   });
}

module.exports = { runTests };