-- Extensão para UUID (se não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum para tipos de sala
CREATE TYPE room_type AS ENUM ('YOUTUBE_LINK', 'EXTERNAL_LINK');

-- Tabela de salas
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type room_type NOT NULL,
    stream_url TEXT NOT NULL,
    max_participants INTEGER NOT NULL DEFAULT 10 CHECK (max_participants >= 1 AND max_participants <= 50),
    is_private BOOLEAN DEFAULT false,
    password_hash VARCHAR(255), -- null se não for privada
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de participantes das salas
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Um usuário só pode estar uma vez ativa por sala
    UNIQUE(room_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_active ON rooms(is_active);
CREATE INDEX idx_rooms_type ON rooms(type);
CREATE INDEX idx_rooms_private ON rooms(is_private);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX idx_room_participants_active ON room_participants(is_active);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contador de participantes
CREATE OR REPLACE FUNCTION update_room_participants_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrementa contador quando participante entra
        UPDATE rooms 
        SET current_participants = current_participants + 1 
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Ajusta contador baseado na mudança de status
        IF OLD.is_active = true AND NEW.is_active = false THEN
            -- Participante saiu
            UPDATE rooms 
            SET current_participants = current_participants - 1 
            WHERE id = NEW.room_id;
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            -- Participante voltou
            UPDATE rooms 
            SET current_participants = current_participants + 1 
            WHERE id = NEW.room_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementa contador quando participante é removido
        IF OLD.is_active = true THEN
            UPDATE rooms 
            SET current_participants = current_participants - 1 
            WHERE id = OLD.room_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para manter contador atualizado
CREATE TRIGGER update_room_participants_count_insert
    AFTER INSERT ON room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participants_count();

CREATE TRIGGER update_room_participants_count_update
    AFTER UPDATE ON room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participants_count();

CREATE TRIGGER update_room_participants_count_delete
    AFTER DELETE ON room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participants_count();

-- Políticas de segurança RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Políticas para rooms
CREATE POLICY "Anyone can view active public rooms" ON rooms
    FOR SELECT USING (is_active = true AND is_private = false);

CREATE POLICY "Users can view their own rooms" ON rooms
    FOR SELECT USING (host_id = auth.uid());

CREATE POLICY "Users can view rooms they participate in" ON rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_participants rp 
            WHERE rp.room_id = rooms.id 
            AND rp.user_id = auth.uid() 
            AND rp.is_active = true
        )
    );

CREATE POLICY "Users can create rooms" ON rooms
    FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "Only hosts can update their rooms" ON rooms
    FOR UPDATE USING (host_id = auth.uid());

CREATE POLICY "Only hosts can delete their rooms" ON rooms
    FOR DELETE USING (host_id = auth.uid());

-- Políticas para room_participants
CREATE POLICY "Users can view participants of rooms they can see" ON room_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_participants.room_id 
            AND (
                r.is_private = false 
                OR r.host_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM room_participants rp2 
                    WHERE rp2.room_id = r.id 
                    AND rp2.user_id = auth.uid() 
                    AND rp2.is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can join rooms" ON room_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms or hosts can remove participants" ON room_participants
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_participants.room_id 
            AND r.host_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their participation or hosts can remove participants" ON room_participants
    FOR DELETE USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_participants.room_id 
            AND r.host_id = auth.uid()
        )
    );