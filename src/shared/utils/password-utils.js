const bcrypt = require('bcryptjs');

class PasswordUtils {
    static async hash(password) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        return await bcrypt.hash(password, rounds);
    }

    static async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    static validateStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasNonalphas = /\W/.test(password);

        if (password.length < minLength) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }

        if (!(hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas)) {
            return { 
                valid: false, 
                message: 'Password must contain uppercase, lowercase, numbers and special characters' 
            };
        }

        return { valid: true };
    }
}

module.exports = PasswordUtils;