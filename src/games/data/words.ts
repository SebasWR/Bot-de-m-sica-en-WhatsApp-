/** Palabras para el ahorcado, agrupadas por categoría (la categoría se muestra como pista). */
export const HANGMAN_WORDS: Record<string, readonly string[]> = {
  'Música': [
    'guitarra', 'bateria', 'trompeta', 'violin', 'acordeon', 'saxofon', 'microfono', 'melodia',
    'reguetón', 'cumbia', 'bachata', 'concierto', 'auriculares', 'partitura', 'orquesta', 'cantante',
    'candombe', 'tambor', 'parlante', 'escenario', 'estribillo', 'rapero',
  ],
  'Animales': [
    'elefante', 'jirafa', 'cocodrilo', 'murcielago', 'pingüino', 'mariposa', 'tiburon', 'camaleon',
    'ñandu', 'hipopotamo', 'canguro', 'armadillo', 'flamenco', 'tortuga', 'carpincho', 'leopardo',
    'ornitorrinco', 'escorpion', 'ballena', 'gorila', 'mapache', 'lechuza',
  ],
  'Comida': [
    'empanada', 'milanesa', 'chocolate', 'hamburguesa', 'aguacate', 'tortilla', 'alfajor', 'paella',
    'tamales', 'ceviche', 'arepa', 'churros', 'lasaña', 'helado', 'chivito', 'asado', 'pizza',
    'ñoquis', 'polenta', 'sushi', 'panqueque', 'choripan',
  ],
  'Países': [
    'argentina', 'mexico', 'colombia', 'españa', 'uruguay', 'venezuela', 'paraguay', 'japon',
    'australia', 'marruecos', 'noruega', 'canada', 'portugal', 'ecuador', 'alemania', 'egipto',
    'filipinas', 'tailandia', 'nicaragua', 'islandia',
  ],
  'Tecnología': [
    'computadora', 'teclado', 'internet', 'whatsapp', 'algoritmo', 'servidor', 'pantalla', 'bateria',
    'videojuego', 'programador', 'contraseña', 'robot', 'celular', 'auriculares', 'impresora', 'wifi',
  ],
  'Deportes': [
    'futbol', 'basquetbol', 'natacion', 'ciclismo', 'voleibol', 'atletismo', 'boxeo', 'arquero',
    'penal', 'campeonato', 'estadio', 'skate', 'surf', 'karate',
  ],
  'Profesiones': [
    'bombero', 'medico', 'enfermera', 'abogado', 'carpintero', 'cocinero', 'astronauta', 'veterinario',
    'periodista', 'arquitecto', 'policia', 'electricista', 'profesor', 'peluquero',
  ],
  'Anime y videojuegos': [
    'naruto', 'pikachu', 'goku', 'minecraft', 'fortnite', 'zelda', 'luffy', 'pokemon', 'sonic',
    'mario', 'tetris', 'roblox', 'kirby', 'gohan',
  ],
};

/** Words for hangman in English, grouped by category (the category is shown as a hint). */
export const HANGMAN_WORDS_EN: Record<string, readonly string[]> = {
  'Music': [
    'guitar', 'drums', 'trumpet', 'violin', 'concert', 'melody', 'headphones', 'orchestra',
    'singer', 'microphone', 'rhythm', 'chorus', 'piano', 'saxophone',
  ],
  'Animals': [
    'elephant', 'giraffe', 'crocodile', 'butterfly', 'penguin', 'shark', 'kangaroo', 'dolphin',
    'turtle', 'octopus', 'squirrel', 'leopard', 'gorilla', 'rabbit', 'whale', 'spider',
  ],
  'Food': [
    'chocolate', 'hamburger', 'pancake', 'sandwich', 'spaghetti', 'strawberry', 'pineapple',
    'avocado', 'popcorn', 'cheese', 'cookie', 'banana', 'pizza', 'noodles',
  ],
  'Countries': [
    'argentina', 'mexico', 'canada', 'germany', 'japan', 'australia', 'brazil', 'england',
    'portugal', 'egypt', 'iceland', 'norway', 'uruguay', 'thailand',
  ],
  'Technology': [
    'computer', 'keyboard', 'internet', 'password', 'algorithm', 'screen', 'battery', 'robot',
    'printer', 'smartphone', 'software', 'website', 'download', 'charger',
  ],
  'Sports': [
    'football', 'basketball', 'swimming', 'tennis', 'volleyball', 'boxing', 'skateboard',
    'baseball', 'cycling', 'stadium', 'goalkeeper', 'champion',
  ],
  'Jobs': [
    'firefighter', 'doctor', 'teacher', 'lawyer', 'astronaut', 'chef', 'pilot', 'nurse',
    'engineer', 'farmer', 'dentist', 'police',
  ],
  'Home': [
    'kitchen', 'bedroom', 'window', 'pillow', 'blanket', 'mirror', 'garden', 'stairs',
    'fridge', 'bathroom', 'sofa', 'curtain',
  ],
};
