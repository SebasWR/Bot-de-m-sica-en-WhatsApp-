export interface TriviaQuestion {
  category: string;
  question: string;
  /** La primera opción es la correcta; se barajan al preguntar. */
  options: readonly [string, string, string, string];
}

export const TRIVIA_QUESTIONS: readonly TriviaQuestion[] = [
  // Música
  { category: '🎵 Música', question: '¿Qué banda grabó "Bohemian Rhapsody"?', options: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd'] },
  { category: '🎵 Música', question: '¿De qué país es Shakira?', options: ['Colombia', 'México', 'España', 'Argentina'] },
  { category: '🎵 Música', question: '¿Cuántas cuerdas tiene una guitarra española estándar?', options: ['6', '4', '5', '7'] },
  { category: '🎵 Música', question: '¿Quién es conocido como el "Rey del Pop"?', options: ['Michael Jackson', 'Elvis Presley', 'Prince', 'Freddie Mercury'] },
  { category: '🎵 Música', question: '¿De qué país es Bad Bunny?', options: ['Puerto Rico', 'República Dominicana', 'Panamá', 'Cuba'] },
  { category: '🎵 Música', question: '¿Qué banda argentina cantaba "De música ligera"?', options: ['Soda Stereo', 'Los Redondos', 'Enanitos Verdes', 'Los Fabulosos Cadillacs'] },
  { category: '🎵 Música', question: '¿Cuántas teclas tiene un piano estándar?', options: ['88', '76', '96', '100'] },
  { category: '🎵 Música', question: '¿Qué compositor siguió componiendo tras quedarse sordo?', options: ['Beethoven', 'Mozart', 'Bach', 'Vivaldi'] },
  { category: '🎵 Música', question: '¿En qué ciudad se formaron The Beatles?', options: ['Liverpool', 'Londres', 'Manchester', 'Dublín'] },
  { category: '🎵 Música', question: '¿Qué género musical nació en la República Dominicana?', options: ['Bachata', 'Tango', 'Cumbia', 'Salsa'] },
  { category: '🎵 Música', question: '¿Qué instrumento tocaba Jimi Hendrix?', options: ['Guitarra eléctrica', 'Batería', 'Bajo', 'Saxofón'] },
  { category: '🎵 Música', question: '¿Cómo se llama el tango más famoso de Gardel y Le Pera sobre "volver"?', options: ['Volver', 'Por una cabeza', 'Mi Buenos Aires querido', 'El día que me quieras'] },
  // Geografía
  { category: '🌍 Geografía', question: '¿Cuál es el río más caudaloso del mundo?', options: ['Amazonas', 'Nilo', 'Misisipi', 'Yangtsé'] },
  { category: '🌍 Geografía', question: '¿Cuál es la capital de Australia?', options: ['Canberra', 'Sídney', 'Melbourne', 'Perth'] },
  { category: '🌍 Geografía', question: '¿Cuál es el país más grande del mundo?', options: ['Rusia', 'Canadá', 'China', 'Estados Unidos'] },
  { category: '🌍 Geografía', question: '¿En qué continente está Egipto?', options: ['África', 'Asia', 'Europa', 'Oceanía'] },
  { category: '🌍 Geografía', question: '¿Cuál es la montaña más alta de América?', options: ['Aconcagua', 'Chimborazo', 'Denali', 'Huascarán'] },
  { category: '🌍 Geografía', question: '¿Cuál es la capital de Canadá?', options: ['Ottawa', 'Toronto', 'Montreal', 'Vancouver'] },
  { category: '🌍 Geografía', question: '¿Qué océano es el más grande?', options: ['Pacífico', 'Atlántico', 'Índico', 'Ártico'] },
  { category: '🌍 Geografía', question: '¿En qué país están las cataratas del Iguazú?', options: ['Argentina y Brasil', 'Perú y Bolivia', 'Chile y Argentina', 'Paraguay y Uruguay'] },
  // Ciencia
  { category: '🔬 Ciencia', question: '¿Cuál es el símbolo químico del oro?', options: ['Au', 'Ag', 'Or', 'Go'] },
  { category: '🔬 Ciencia', question: '¿Qué planeta es conocido como el planeta rojo?', options: ['Marte', 'Júpiter', 'Venus', 'Mercurio'] },
  { category: '🔬 Ciencia', question: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['206', '186', '226', '256'] },
  { category: '🔬 Ciencia', question: '¿Qué gas absorben las plantas para la fotosíntesis?', options: ['Dióxido de carbono', 'Oxígeno', 'Nitrógeno', 'Hidrógeno'] },
  { category: '🔬 Ciencia', question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Júpiter', 'Saturno', 'Neptuno', 'Tierra'] },
  { category: '🔬 Ciencia', question: '¿A qué temperatura hierve el agua al nivel del mar?', options: ['100 °C', '90 °C', '120 °C', '80 °C'] },
  { category: '🔬 Ciencia', question: '¿Qué órgano bombea la sangre?', options: ['Corazón', 'Hígado', 'Pulmón', 'Riñón'] },
  { category: '🔬 Ciencia', question: '¿Cuál es el animal terrestre más rápido?', options: ['Guepardo', 'León', 'Caballo', 'Antílope'] },
  // Historia
  { category: '📜 Historia', question: '¿En qué año llegó Colón a América?', options: ['1492', '1500', '1488', '1521'] },
  { category: '📜 Historia', question: '¿En qué año llegó el ser humano a la Luna?', options: ['1969', '1972', '1965', '1959'] },
  { category: '📜 Historia', question: '¿Quién pintó la Mona Lisa?', options: ['Leonardo da Vinci', 'Miguel Ángel', 'Rafael', 'Picasso'] },
  { category: '📜 Historia', question: '¿Qué civilización construyó Machu Picchu?', options: ['Inca', 'Maya', 'Azteca', 'Olmeca'] },
  { category: '📜 Historia', question: '¿En qué año cayó el Muro de Berlín?', options: ['1989', '1991', '1985', '1979'] },
  // Deportes
  { category: '⚽ Deportes', question: '¿Qué selección ganó el Mundial de fútbol 2022?', options: ['Argentina', 'Francia', 'Brasil', 'Croacia'] },
  { category: '⚽ Deportes', question: '¿Cuántos jugadores tiene un equipo de fútbol en cancha?', options: ['11', '10', '9', '12'] },
  { category: '⚽ Deportes', question: '¿Cada cuántos años se juegan los Juegos Olímpicos de verano?', options: ['4', '2', '3', '5'] },
  { category: '⚽ Deportes', question: '¿En qué deporte se usa un "birdie"?', options: ['Golf', 'Tenis', 'Béisbol', 'Críquet'] },
  { category: '⚽ Deportes', question: '¿Qué país ha ganado más Mundiales de fútbol?', options: ['Brasil', 'Alemania', 'Italia', 'Argentina'] },
  // Cultura general
  { category: '🧠 Cultura general', question: '¿Cuántos lados tiene un hexágono?', options: ['6', '5', '7', '8'] },
  { category: '🧠 Cultura general', question: '¿Quién escribió "Cien años de soledad"?', options: ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Julio Cortázar', 'Pablo Neruda'] },
  { category: '🧠 Cultura general', question: '¿Cuál es el idioma más hablado del mundo como lengua materna?', options: ['Chino mandarín', 'Inglés', 'Español', 'Hindi'] },
  { category: '🧠 Cultura general', question: '¿Cuántos minutos tiene un día?', options: ['1440', '1240', '1600', '1000'] },
  { category: '🧠 Cultura general', question: '¿Qué empresa creó WhatsApp antes de ser comprada por Facebook?', options: ['WhatsApp Inc.', 'Google', 'Microsoft', 'Yahoo'] },
  { category: '🧠 Cultura general', question: '¿De qué color se obtiene al mezclar azul y amarillo?', options: ['Verde', 'Morado', 'Naranja', 'Marrón'] },
];
