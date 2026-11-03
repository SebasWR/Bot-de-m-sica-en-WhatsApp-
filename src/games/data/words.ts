/** Palabras para el ahorcado, agrupadas por categoría (la categoría se muestra como pista). */
export const HANGMAN_WORDS: Record<string, readonly string[]> = {
  'Música': [
    'guitarra', 'bateria', 'trompeta', 'violin', 'acordeon', 'saxofon', 'microfono', 'melodia',
    'reguetón', 'cumbia', 'bachata', 'concierto', 'auriculares', 'partitura', 'orquesta', 'cantante',
  ],
  'Animales': [
    'elefante', 'jirafa', 'cocodrilo', 'murcielago', 'pingüino', 'mariposa', 'tiburon', 'camaleon',
    'ñandu', 'hipopotamo', 'canguro', 'armadillo', 'flamenco', 'tortuga',
  ],
  'Comida': [
    'empanada', 'milanesa', 'chocolate', 'hamburguesa', 'aguacate', 'tortilla', 'alfajor', 'paella',
    'tamales', 'ceviche', 'arepa', 'churros', 'lasaña', 'helado',
  ],
  'Países': [
    'argentina', 'mexico', 'colombia', 'españa', 'uruguay', 'venezuela', 'paraguay', 'japon',
    'australia', 'marruecos', 'noruega', 'canada', 'portugal', 'ecuador',
  ],
  'Tecnología': [
    'computadora', 'teclado', 'internet', 'whatsapp', 'algoritmo', 'servidor', 'pantalla', 'bateria',
    'videojuego', 'programador', 'contraseña', 'robot',
  ],
};
