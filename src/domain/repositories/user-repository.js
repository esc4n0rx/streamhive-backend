/**
 * Interface do repositório de usuário
 * Define os contratos que devem ser implementados pela camada de infraestrutura
 */
class UserRepository {
    async findByEmail(email) {
        throw new Error('Method not implemented');
    }

    async findByUsername(username) {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async create(userData) {
        throw new Error('Method not implemented');
    }

    async update(id, userData) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }
}

module.exports = UserRepository;