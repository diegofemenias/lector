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
        options: { a: "En el bosque", b: "En una tienda", c: "En una casa de campo", d: "En un edificio antiguo" },
        correct: "d",
      },
      {
        question: "¿Qué perdió doña Rosa?",
        options: { a: "Su llave", b: "Su libro", c: "Su torta de chocolate", d: "Su gato" },
        correct: "c",
      },
      {
        question: "¿Quién se había llevado parte de la torta?",
        options: { a: "Un pájaro", b: "Un niño", c: "Un perro", d: "Un ratón" },
        correct: "a",
      }
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
        options: { a: "De las flores", b: "De los pájaros", c: "Del jardín", d: "De salir de la tierra" },
        correct: "d",
      },
      {
        question: "¿Quién la animó a intentarlo?",
        options: { a: "Una mariposa", b: "Un niño", c: "Una gota de agua", d: "El viento" },
        correct: "c",
      },
      {
        question: "¿En qué se convirtió la semilla?",
        options: { a: "En un cactus", b: "En un girasol", c: "En un árbol", d: "En hierba" },
        correct: "b",
      }
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
        options: { a: "Cocinar", b: "Pintar paredes", c: "Cantar", d: "Ordenar tornillos" },
        correct: "d",
      },
      {
        question: "¿Qué le fascinaba a Beep?",
        options: { a: "Los libros", b: "La lluvia", c: "El color del cielo", d: "Los coches" },
        correct: "c",
      },
      {
        question: "¿Cómo ayudó Beep a los demás?",
        options: { a: "Llamó al jefe", b: "Encontró una linterna", c: "Arregló la luz", d: "Abrió la puerta" },
        correct: "b",
      }
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
        options: { a: "En el patio", b: "En la escuela", c: "En el parque", d: "En la playa" },
        correct: "a",
      },
      {
        question: "¿Qué brillaba como una lámpara gigante?",
        options: { a: "El sol", b: "La luna", c: "Un faro", d: "Una vela" },
        correct: "b",
      },
      {
        question: "¿Qué vieron en el cielo?",
        options: { a: "Un avión", b: "Una estrella fugaz", c: "Un globo", d: "Un cometa" },
        correct: "b",
      }
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
        options: { a: "En la cocina", b: "En la escuela", c: "En un libro del abuelo", d: "En la calle" },
        correct: "c",
      },
      {
        question: "¿Qué había dentro de la lata?",
        options: { a: "Llaves", b: "Flores", c: "Dulces", d: "Monedas de juguete y una nota" },
        correct: "d",
      },
      {
        question: "¿Qué decía la nota?",
        options: { a: "Vende las monedas", b: "El verdadero tesoro es la aventura", c: "No digas nada", d: "Corre rápido" },
        correct: "b",
      }
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
        options: { a: "Como silbidos", b: "Como truenos", c: "Como tambores", d: "Como campanitas" },
        correct: "d",
      },
      {
        question: "¿Qué problema tenía el barco?",
        options: { a: "No tenía velas", b: "Se perdió en la niebla", c: "Se hundía", d: "Estaba sin comida" },
        correct: "b",
      },
      {
        question: "¿Qué hizo Wila para ayudar?",
        options: { a: "Encendió una luz", b: "Llamó a otros barcos", c: "Cantó para guiarlos", d: "Empujó el barco" },
        correct: "c",
      }
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
        options: { a: "Un zapato", b: "La mochila", c: "El cuaderno", d: "El abrigo" },
        correct: "a",
      },
      {
        question: "¿Dónde buscó el zapato?",
        options: { a: "En la playa", b: "En la panadería, plaza y biblioteca", c: "En el bosque", d: "Solo en su casa" },
        correct: "b",
      },
      {
        question: "¿Quién encontró el zapato?",
        options: { a: "Su perro Coco", b: "Un vecino", c: "Su maestra", d: "Su mamá" },
        correct: "a",
      }
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
        options: { a: "Un barco", b: "Una flor", c: "Un faro", d: "Un avión" },
        correct: "c",
      },
      {
        question: "¿Por qué le enseñó a su hermana?",
        options: { a: "Porque ella tenía miedo de las tormentas", b: "Porque perdió su juguete", c: "Porque quería jugar afuera", d: "Porque era un deber" },
        correct: "a",
      },
      {
        question: "¿Qué dijo la niña sobre la luz más segura?",
        options: { a: "Era la que inventaban juntos", b: "Era la de la luna", c: "Era la de la lámpara", d: "Era la del sol" },
        correct: "a",
      }
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
        options: { a: "Tímida", b: "Desordenada", c: "Muy ordenada", d: "Perezosa" },
        correct: "c",
      },
      {
        question: "¿Qué pasó cuando llovió fuerte?",
        options: { a: "El túnel de Lili estaba seco y con comida", b: "No pasó nada", c: "Se perdieron", d: "Se fueron del hormiguero" },
        correct: "a",
      },
      {
        question: "¿Qué aprendieron las otras hormigas?",
        options: { a: "Que no deben comer", b: "Que deben dormir más", c: "Que deben esconderse", d: "Que planificar ayuda" },
        correct: "d",
      }
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
        options: { a: "Un oso", b: "Un gato", c: "Un búho con gorra", d: "Un conejo" },
        correct: "c",
      },
      {
        question: "¿Qué llevaban los vagones?",
        options: { a: "Juguetes", b: "Ropa", c: "Sueños doblados", d: "Libros" },
        correct: "c",
      },
      {
        question: "¿Qué hacía Nico antes de dormir?",
        options: { a: "Salía a correr", b: "Contaba hasta mil", c: "Elegía un sueño", d: "Leía dos horas" },
        correct: "c",
      }
    ],
  }
];
