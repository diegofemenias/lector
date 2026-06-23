import type { StoryInput } from "./types";

export const STORIES: StoryInput[] = [
  {
    title: "El gato detective",
    paragraphs: [
      "Michi era un gato naranja que vivía en un edificio antiguo. Todas las tardes observaba por la ventana y anotaba en un cuaderno pequeño todo lo que pasaba en la calle.",
      "Un día, la vecina doña Rosa perdió su torta de chocolate antes de la fiesta. Michi olió migas en el pasillo y siguió un rastro hasta el balcón del tercer piso.",
      "Allí encontró a un pájaro que había llevado cerezas de la torta a su nido. Michi avisó a doña Rosa, que recuperó lo que quedaba y le regaló un trozo de queso al valiente detective.",
    ],
    questions: [
      {
        question: "¿Dónde vivía Michi?",
        options: { a: "En una casa de campo", b: "En un edificio antiguo", c: "En una tienda", d: "En el bosque" },
        correct: "b",
      },
      {
        question: "¿Qué perdió doña Rosa?",
        options: { a: "Su llave", b: "Su gato", c: "Su torta de chocolate", d: "Su libro" },
        correct: "c",
      },
      {
        question: "¿Quién se había llevado parte de la torta?",
        options: { a: "Un perro", b: "Un ratón", c: "Un pájaro", d: "Un niño" },
        correct: "c",
      },
    ],
  },
  {
    title: "La semilla valiente",
    paragraphs: [
      "En un jardín soleado había una semilla muy pequeña que tenía miedo de salir de la tierra. Escuchaba historias de viento, lluvia y noches frías.",
      "Una mañana, una gota de agua le susurró: «Si no intentas, nunca sabrás qué puedes ser». La semilla respiró hondo y empujó con todas sus fuerzas.",
      "Días después apareció un brote verde que creció y creció hasta convertirse en un girasol alto. Las abejas lo visitaban y la semilla, ya flor, sonreía al sol.",
    ],
    questions: [
      {
        question: "¿De qué tenía miedo la semilla?",
        options: { a: "De salir de la tierra", b: "De los pájaros", c: "Del jardín", d: "De las flores" },
        correct: "a",
      },
      {
        question: "¿Quién la animó a intentarlo?",
        options: { a: "Una mariposa", b: "Una gota de agua", c: "Un niño", d: "El viento" },
        correct: "b",
      },
      {
        question: "¿En qué se convirtió la semilla?",
        options: { a: "En un árbol", b: "En un cactus", c: "En un girasol", d: "En hierba" },
        correct: "c",
      },
    ],
  },
  {
    title: "El robot curioso",
    paragraphs: [
      "Beep era un robot recién salido de la fábrica. Su programación decía que debía ordenar tornillos, pero a él le fascinaba el color del cielo.",
      "Cada pausa lo llevaba a la ventana a contar nubes. Los otros robots decían que eso no servía para nada.",
      "Un día, la fábrica quedó a oscuras y solo Beep recordaba dónde estaba la linterna azul del estante alto. Gracias a su costumbre de mirar, salvó la jornada y todos aprendieron que la curiosidad también es útil.",
    ],
    questions: [
      {
        question: "¿Qué debía hacer Beep según su programación?",
        options: { a: "Pintar paredes", b: "Ordenar tornillos", c: "Cocinar", d: "Cantar" },
        correct: "b",
      },
      {
        question: "¿Qué le fascinaba a Beep?",
        options: { a: "El color del cielo", b: "Los coches", c: "La lluvia", d: "Los libros" },
        correct: "a",
      },
      {
        question: "¿Cómo ayudó Beep a los demás?",
        options: { a: "Encontró una linterna", b: "Arregló la luz", c: "Llamó al jefe", d: "Abrió la puerta" },
        correct: "a",
      },
    ],
  },
  {
    title: "La luna del picnic",
    paragraphs: [
      "Sara y Tomás querían hacer un picnic nocturno en el patio. Mamá les dijo que llevaran mantas, linternas y algo caliente para el té.",
      "Cuando llegó la noche, la luna brillaba como una lámpara gigante. Compartieron sándwiches y contaron estrellas entre bocados.",
      "De pronto vieron una estrella fugaz y pidieron el mismo deseo: que los domingos fueran siempre de cuentos y risas. Volvieron a casa con los ojos pesados y el corazón contento.",
    ],
    questions: [
      {
        question: "¿Dónde hicieron el picnic?",
        options: { a: "En la playa", b: "En el patio", c: "En el parque", d: "En la escuela" },
        correct: "b",
      },
      {
        question: "¿Qué brillaba como una lámpara gigante?",
        options: { a: "El sol", b: "La luna", c: "Un faro", d: "Una vela" },
        correct: "b",
      },
      {
        question: "¿Qué vieron en el cielo?",
        options: { a: "Un avión", b: "Un cometa", c: "Una estrella fugaz", d: "Un globo" },
        correct: "c",
      },
    ],
  },
  {
    title: "El mapa del tesoro",
    paragraphs: [
      "Lucas encontró un mapa arrugado dentro de un libro del abuelo. Tenía una X marcada cerca del roble del fondo del jardín.",
      "Con pala y paciencia cavó donde indicaba el dibujo. Primero apareció una lata oxidada y dentro había monedas de juguete y una nota.",
      "La nota decía: «El verdadero tesoro es la aventura». Lucas rió, guardó las monedas en su alcancía y dibujó un mapa nuevo para su hermana.",
    ],
    questions: [
      {
        question: "¿Dónde encontró Lucas el mapa?",
        options: { a: "En la cocina", b: "En un libro del abuelo", c: "En la escuela", d: "En la calle" },
        correct: "b",
      },
      {
        question: "¿Qué había dentro de la lata?",
        options: { a: "Dulces", b: "Llaves", c: "Monedas de juguete y una nota", d: "Flores" },
        correct: "c",
      },
      {
        question: "¿Qué decía la nota?",
        options: { a: "Corre rápido", b: "El verdadero tesoro es la aventura", c: "Vende las monedas", d: "No digas nada" },
        correct: "b",
      },
    ],
  },
  {
    title: "La ballena que cantaba",
    paragraphs: [
      "En lo profundo del océano vivía Wila, una ballena joven con una voz distinta. Su canto sonaba más a campanitas que a truenos.",
      "Los demás animales marinos la escuchaban en silencio. Un día, un barco se perdió en la niebla y los marineros no sabían hacia dónde ir.",
      "Wila cantó desde lejos y su melodía guió la embarcación hasta puerto seguro. Desde entonces, cada atardecer, el puerto escucha su canción amable.",
    ],
    questions: [
      {
        question: "¿Cómo sonaba el canto de Wila?",
        options: { a: "Como truenos", b: "Como campanitas", c: "Como silbidos", d: "Como tambores" },
        correct: "b",
      },
      {
        question: "¿Qué problema tenía el barco?",
        options: { a: "Se hundía", b: "Estaba sin comida", c: "Se perdió en la niebla", d: "No tenía velas" },
        correct: "c",
      },
      {
        question: "¿Qué hizo Wila para ayudar?",
        options: { a: "Empujó el barco", b: "Cantó para guiarlos", c: "Llamó a otros barcos", d: "Encendió una luz" },
        correct: "b",
      },
    ],
  },
  {
    title: "El zapato perdido",
    paragraphs: [
      "Emma salió corriendo al colegio y al llegar notó que le faltaba un zapato. Solo tenía puesto el derecho, azul con estrellas.",
      "Volvió sobre sus pasos y preguntó en la panadería, la plaza y la biblioteca. Nadie lo había visto.",
      "Al final, su perro Coco lo traía en la boca, todo mojado porque lo había escondido cerca del plato de agua. Emma se rió, se lo puso y prometió atarse mejor los cordones.",
    ],
    questions: [
      {
        question: "¿Qué le faltaba a Emma?",
        options: { a: "La mochila", b: "Un zapato", c: "El cuaderno", d: "El abrigo" },
        correct: "b",
      },
      {
        question: "¿Dónde buscó el zapato?",
        options: { a: "Solo en su casa", b: "En la panadería, plaza y biblioteca", c: "En el bosque", d: "En la playa" },
        correct: "b",
      },
      {
        question: "¿Quién encontró el zapato?",
        options: { a: "Su mamá", b: "Su maestra", c: "Su perro Coco", d: "Un vecino" },
        correct: "c",
      },
    ],
  },
  {
    title: "El faro de papel",
    paragraphs: [
      "Mateo construía figuras de papel todos los días. Su favorita era un faro pequeño que ponía junto a la ventana cuando llovía.",
      "Su hermana menor tenía miedo de las tormentas y se tapaba con la frazada. Mateo le enseñó a hacer su propio faro doblando la hoja paso a paso.",
      "Cuando el relámpago iluminó el cuarto, los dos faros de papel parecían brillar. La niña dejó de temblar y dijo que la luz más segura era la que inventaban juntos.",
    ],
    questions: [
      {
        question: "¿Qué figura favorita hacía Mateo?",
        options: { a: "Un barco", b: "Un faro", c: "Una flor", d: "Un avión" },
        correct: "b",
      },
      {
        question: "¿Por qué le enseñó a su hermana?",
        options: { a: "Porque ella tenía miedo de las tormentas", b: "Porque era un deber", c: "Porque perdió su juguete", d: "Porque quería jugar afuera" },
        correct: "a",
      },
      {
        question: "¿Qué dijo la niña sobre la luz más segura?",
        options: { a: "Era la del sol", b: "Era la de la lámpara", c: "Era la que inventaban juntos", d: "Era la de la luna" },
        correct: "c",
      },
    ],
  },
  {
    title: "La hormiga organizada",
    paragraphs: [
      "Lili era una hormiga muy ordenada. Cada mañana revisaba su lista: agua, semillas y hojas para el invierno.",
      "Sus amigas la llamaban aburrida, pero cuando llegó una lluvia fuerte, solo el túnel de Lili estaba seco y tenía comida guardada.",
      "Compartió lo que tenía y explicó que planificar no quita diversión, la prepara. Esa noche todos durmieron tranquilos gracias a su cuaderno de listas.",
    ],
    questions: [
      {
        question: "¿Cómo era Lili?",
        options: { a: "Desordenada", b: "Muy ordenada", c: "Perezosa", d: "Tímida" },
        correct: "b",
      },
      {
        question: "¿Qué pasó cuando llovió fuerte?",
        options: { a: "Se perdieron", b: "El túnel de Lili estaba seco y con comida", c: "Se fueron del hormiguero", d: "No pasó nada" },
        correct: "b",
      },
      {
        question: "¿Qué aprendieron las otras hormigas?",
        options: { a: "Que planificar ayuda", b: "Que no deben comer", c: "Que deben dormir más", d: "Que deben esconderse" },
        correct: "a",
      },
    ],
  },
  {
    title: "El tren de los sueños",
    paragraphs: [
      "Cada noche, Nico imaginaba un tren que recorría su almohada. El maquinista era un búho con gorra y los vagones estaban llenos de sueños doblados.",
      "Un vagón tenía sueños de volar, otro de montar en bici y otro de comer helado sin mancharse. Nico elegía uno antes de cerrar los ojos.",
      "Cuando amanecía, a veces recordaba el viaje y a veces no, pero siempre despertaba con ganas de hacer algo nuevo. Su mamá decía que su imaginación tenía buen horario.",
    ],
    questions: [
      {
        question: "¿Quién era el maquinista del tren?",
        options: { a: "Un gato", b: "Un búho con gorra", c: "Un conejo", d: "Un oso" },
        correct: "b",
      },
      {
        question: "¿Qué llevaban los vagones?",
        options: { a: "Juguetes", b: "Libros", c: "Sueños doblados", d: "Ropa" },
        correct: "c",
      },
      {
        question: "¿Qué hacía Nico antes de dormir?",
        options: { a: "Elegía un sueño", b: "Contaba hasta mil", c: "Leía dos horas", d: "Salía a correr" },
        correct: "a",
      },
    ],
  },
];
