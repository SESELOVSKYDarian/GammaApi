CREATE TABLE familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gran_familia TEXT NOT NULL,
    tipo_familia TEXT NOT NULL,
    usar_imagen BOOLEAN DEFAULT 0,
    imagen_subtitulo TEXT
);

CREATE TABLE idea_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT
);

CREATE TABLE idea_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    title TEXT NOT NULL,
    type ENUM('pdf','video') NOT NULL,
    url TEXT NOT NULL,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES idea_categories(id) ON DELETE CASCADE
);

CREATE TABLE precios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lista_de_precio_id INT NOT NULL UNIQUE,
    porcentaje_a_agregar DECIMAL(10,2) NOT NULL
);

CREATE TABLE productos (
    id INT NOT NULL PRIMARY KEY,
    articulo TEXT NOT NULL,
    familia_id INT NOT NULL,
    linea TEXT NOT NULL,
    img_articulo TEXT,
    stock INT DEFAULT 0,
    precio DECIMAL(10,2) DEFAULT 0,
    precio_minorista DECIMAL(10,2),
    precio_mayorista DECIMAL(10,2),
    descripcion TEXT,
    url TEXT,
    slider BOOLEAN DEFAULT 0,
    codigo_color VARCHAR(20),
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE
);

CREATE TABLE usuarios (
    id INT NOT NULL PRIMARY KEY,
    cliente TEXT,
    contrasena TEXT,
    rol VARCHAR(50) DEFAULT 'cliente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lista_de_precio INT,
    FOREIGN KEY (lista_de_precio) REFERENCES precios(lista_de_precio_id)
);
