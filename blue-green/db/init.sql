CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    profile_photo TEXT,
    role          VARCHAR(20) NOT NULL DEFAULT 'cliente',
    CONSTRAINT users_role_check CHECK (role IN ('cliente', 'admin'))
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'cliente';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_role_check CHECK (role IN ('cliente', 'admin'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS materials (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100)   NOT NULL,
    useful_life  INT            NOT NULL,
    cost_per_m2  DECIMAL(10,2)  NOT NULL,
    permeability DECIMAL(5,2)   NOT NULL
);

CREATE TABLE IF NOT EXISTS simulations (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    area          INT NOT NULL,
    rain_level    INT NOT NULL,
    traffic_level INT NOT NULL,
    user_id       INT NOT NULL,
    CONSTRAINT fk_simulation_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_simulations_user ON simulations(user_id);

CREATE TABLE IF NOT EXISTS results (
    id               SERIAL PRIMARY KEY,
    filtered_water   DECIMAL(10,2) NOT NULL,
    unfiltered_water DECIMAL(10,2) NOT NULL,
    application_cost DECIMAL(10,2) NOT NULL,
    useful_life      INT NOT NULL,
    simulation_id    INT NOT NULL,
    material_id      INT NOT NULL,
    CONSTRAINT fk_result_simulation FOREIGN KEY (simulation_id)
        REFERENCES simulations(id) ON DELETE CASCADE,
    CONSTRAINT fk_result_material FOREIGN KEY (material_id)
        REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS posts (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(150),
    category   VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    message    TEXT NOT NULL,
    user_id    INT NOT NULL,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS replies (
    id         SERIAL PRIMARY KEY,
    post_id    INT NOT NULL,
    user_id    INT NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_reply_post FOREIGN KEY (post_id)
        REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_reply_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id);

CREATE TABLE IF NOT EXISTS likes (
    id      SERIAL PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    CONSTRAINT fk_like_post FOREIGN KEY (post_id)
        REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_like_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_like UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

INSERT INTO materials (name, useful_life, cost_per_m2, permeability) VALUES
    ('Hardoquin Permeable',  25, 850.00, 0.92),
    ('Asfalto Convencional', 15, 450.00, 0.05),
    ('Concreto Hidráulico',  20, 550.00, 0.03),
    ('Adoquin Tradicional',  20, 650.00, 0.15)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS faqs (
    id         SERIAL PRIMARY KEY,
    question   VARCHAR NOT NULL,
    answer     TEXT NOT NULL,
    keywords   JSONB   NOT NULL DEFAULT '[]',
    examples   JSONB            DEFAULT '[]',
    category   VARCHAR,
    is_active  BOOLEAN          DEFAULT true,
    created_at TIMESTAMP        DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_conversations (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    status     VARCHAR NOT NULL DEFAULT 'open',
    created_at TIMESTAMP        DEFAULT NOW(),
    closed_at  TIMESTAMP,
    CONSTRAINT fk_chat_conversation_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    sender_type     VARCHAR NOT NULL CHECK (sender_type IN ('user','assistant','admin','system')),
    sender_user_id  INTEGER,
    message         TEXT NOT NULL,
    metadata        JSONB            DEFAULT '{}',
    created_at      TIMESTAMP        DEFAULT NOW(),
    CONSTRAINT fk_chat_message_conversation
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_message_user
        FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);

INSERT INTO faqs (question, answer, keywords, category) VALUES
    ('¿Cuánto cuesta Hardoquin?',
     'El costo depende del área y condiciones del proyecto. Usa nuestro simulador para obtener una cotización precisa.',
     '["precio","costo","cuanto","cotiz","presupuesto","vale"]',
     'precios'),

    ('¿Qué tan permeable es Hardoquin?',
     'Hardoquin infiltra entre 70 % y 95 % del agua de lluvia, reduciendo encharcamientos hasta en un 94 %.',
     '["permeable","agua","lluvia","infiltra","filtra","encharcamiento","inundacion","permeabilidad"]',
     'permeabilidad'),

    ('¿Cómo se instala Hardoquin?',
     'La instalación es similar al adoquín tradicional: base drenante, capa de arena y adoquines permeables. No requiere maquinaria especializada.',
     '["instalar","instalacion","instala","colocar","colocacion","poner","montaje"]',
     'instalacion'),

    ('¿Cuánto dura Hardoquin?',
     'Hardoquin tiene una vida útil de hasta 25 años con mantenimiento básico anual.',
     '["dura","duracion","vida util","anos","duradero","mantenimiento"]',
     'durabilidad'),

    ('¿Es resistente al tráfico vehicular?',
     'Está diseñado para soportar tráfico vehicular y peatonal intenso sin deformarse ni perder permeabilidad.',
     '["vehiculo","carro","camion","trafico","carga","resistente","peso"]',
     'resistencia'),

    ('¿Es ecológico Hardoquin?',
     'Hardoquin favorece la recarga del manto freático al devolver el agua al suelo natural, ayudando al ciclo hídrico urbano.',
     '["ecologico","medioambiente","sostenible","verde","recarga","ambiental","ecologia"]',
     'ecologia'),

    ('¿Cómo funciona el simulador?',
     'El simulador calcula el costo de instalación y el agua filtrada según el área, nivel de lluvia y tráfico. Regístrate para guardar tus simulaciones.',
     '["simulador","simular","calcular","calculo","herramienta","comparar"]',
     'simulador'),

    ('¿Qué es Hardoquin?',
     'Hardoquin es un adoquín permeable que permite el paso del agua de lluvia al subsuelo, reduciendo inundaciones y recargando acuíferos.',
     '["que es","hardoquin","adoquin","producto","permeable","que hace"]',
     'general')

ON CONFLICT DO NOTHING;
