const UserRepository = require('../../domain/repositories/user-repository');
const supabase = require('../../config/database');

class SupabaseUserRepository extends UserRepository {
    async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }

    async findByUsername(username) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            throw new Error(`Error finding user by username: ${error.message}`);
        }
    }

    async findById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, username, email, birth_date, avatar_url, bio, created_at, updated_at')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error.message}`);
        }
    }

    async create(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    name: userData.name,
                    username: userData.username,
                    email: userData.email,
                    password_hash: userData.passwordHash,
                    birth_date: userData.birthDate,
                    avatar_url: userData.avatarUrl,
                    bio: userData.bio
                }])
                .select('id, name, username, email, birth_date, avatar_url, bio, created_at')
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    async update(id, userData) {
        try {
            const updateData = {};
            
            if (userData.name) updateData.name = userData.name;
            if (userData.email) updateData.email = userData.email;
            if (userData.birthDate) updateData.birth_date = userData.birthDate;
            if (userData.avatarUrl !== undefined) updateData.avatar_url = userData.avatarUrl;
            if (userData.bio !== undefined) updateData.bio = userData.bio;
            if (userData.passwordHash) updateData.password_hash = userData.passwordHash;

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .eq('is_active', true)
                .select('id, name, username, email, birth_date, avatar_url, bio, updated_at')
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }
}

module.exports = SupabaseUserRepository;