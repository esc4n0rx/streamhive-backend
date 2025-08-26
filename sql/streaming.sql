-- Tabela para armazenar estado atual do streaming de cada sala
CREATE TABLE room_streaming_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    video_position DECIMAL(10,3) DEFAULT 0, -- posição em segundos com precisão de milissegundos
    is_playing BOOLEAN DEFAULT false,
    video_duration DECIMAL(10,3), -- duração total do vídeo
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id), -- quem fez a última atualização
    
    UNIQUE(room_id)
);

-- Tabela para logs de eventos de streaming (para debug e analytics)
CREATE TABLE streaming_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL, -- 'play', 'pause', 'seek', 'join', 'leave'
    event_data JSONB, -- dados específicos do evento
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_room_streaming_state_room_id ON room_streaming_state(room_id);
CREATE INDEX idx_streaming_events_room_id ON streaming_events(room_id);
CREATE INDEX idx_streaming_events_timestamp ON streaming_events(timestamp);
CREATE INDEX idx_streaming_events_type ON streaming_events(event_type);

-- Trigger para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_streaming_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_streaming_state_timestamp
    BEFORE UPDATE ON room_streaming_state
    FOR EACH ROW EXECUTE FUNCTION update_streaming_state_timestamp();

-- Políticas RLS para room_streaming_state
ALTER TABLE room_streaming_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streaming state of accessible rooms" ON room_streaming_state
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_streaming_state.room_id 
            AND (
                r.host_id = auth.uid() 
                OR r.is_private = false 
                OR EXISTS (
                    SELECT 1 FROM room_participants rp 
                    WHERE rp.room_id = r.id 
                    AND rp.user_id = auth.uid() 
                    AND rp.is_active = true
                )
            )
        )
    );

CREATE POLICY "Room hosts and participants can update streaming state" ON room_streaming_state
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = room_streaming_state.room_id 
            AND (
                r.host_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM room_participants rp 
                    WHERE rp.room_id = r.id 
                    AND rp.user_id = auth.uid() 
                    AND rp.is_active = true
                )
            )
        )
    );

-- Políticas RLS para streaming_events
ALTER TABLE streaming_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streaming events of accessible rooms" ON streaming_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = streaming_events.room_id 
            AND (
                r.host_id = auth.uid() 
                OR r.is_private = false 
                OR EXISTS (
                    SELECT 1 FROM room_participants rp 
                    WHERE rp.room_id = r.id 
                    AND rp.user_id = auth.uid() 
                    AND rp.is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can insert streaming events for accessible rooms" ON streaming_events
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.id = streaming_events.room_id 
            AND (
                r.host_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM room_participants rp 
                    WHERE rp.room_id = r.id 
                    AND rp.user_id = auth.uid() 
                    AND rp.is_active = true
                )
            )
        )
    );