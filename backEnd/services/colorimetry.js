const SCORING = [
  [['F', 3], ['C', 3], ['N', 3]],                       // 1. Tonalidad de la piel
  [['F', 1], ['C', 1], ['N', 1], [null, 0]],            // 2. Venas
  [['F', 3], ['C', 3], ['N', 3], [null, 0]],            // 3. Colores que favorecen
  [['F', 2], ['C', 2], ['N', 2]],                       // 4. Cabello natural
  [['L', 2], ['I', 2], ['P', 2]],                       // 5. Ojos
  [['L', 3], ['I', 3], ['P', 3]],                       // 6. Oscuridad del cabello
  [['L', 3], ['I', 3], ['P', 3], [null, 0]]             // 7. Contraste
];

// Temperatura + intensidad → categoría OWN
const COMBO = {
  'F-I': 'Intensa fría',
  'F-L': 'Luminosa fría',
  'F-P': 'Intensa fría',            
  'C-I': 'Intensa cálida',
  'C-L': 'Luminosa cálida',
  'C-P': 'Intensa cálida profunda'
};

// Debe ser un arreglo de 7 números enteros, cada uno dentro de las opciones de su pregunta
function isValid(answers) {
  return Array.isArray(answers)
    && answers.length === SCORING.length
    && answers.every((a, i) => Number.isInteger(a) && a >= 0 && a < SCORING[i].length);
}

// Devuelve la clave con el puntaje máximo, o null si hay empate o todo es 0
function top(group) {
  const max = Math.max(...Object.values(group));
  const keys = Object.keys(group).filter(k => group[k] === max);
  return max > 0 && keys.length === 1 ? keys[0] : null;
}

function evaluate(answers) {
  const scores = { C: 0, F: 0, N: 0, L: 0, I: 0, P: 0 };
  answers.forEach((a, i) => {
    const [key, points] = SCORING[i][a];
    if (key) scores[key] += points;
  });

  const temp = top({ C: scores.C, F: scores.F, N: scores.N });
  const inten = top({ L: scores.L, I: scores.I, P: scores.P });

  let category = null, pending = null;

  // Si hay empate en temperatura o si es neutra= neutra
  if (!temp || temp === 'N') {
    category = 'Neutra';
  } 
  // Si la intensidad empata tmb neutra
  else if (!inten) {
    category = 'Neutra'; 
  } 
  //combinación normal
  else {
    category = COMBO[`${temp}-${inten}`];
  }

  return { scores, category, pending };
}

module.exports = { isValid, evaluate };