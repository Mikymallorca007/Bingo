// Generación de cartón: 15 espacios (12 únicos + 3 comodines) para un total de 75 bolas
const generarCarton = (idJugador) => {
    const FILAS = 3; 
    const COLUMNAS = 5; 
    
    let matriz = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));

    // 1. Llenar columnas con los rangos ajustados para 75 bolas (15 por columna)
    for (let c = 0; c < COLUMNAS; c++) {
        let min = (c * 15) + 1;
        let max = (c + 1) * 15;
        
        let numerosColumna = new Set();

        while (numerosColumna.size < FILAS) {
            let num = Math.floor(Math.random() * (max - min + 1)) + min;
            numerosColumna.add(num);
        }

        let columnaOrdenada = Array.from(numerosColumna).sort((a, b) => a - b);

        for (let f = 0; f < FILAS; f++) {
            matriz[f][c] = columnaOrdenada[f];
        }
    }

    // --- NUEVA LÓGICA: 1 COMODÍN POR FILA Y MÁXIMO 1 POR COLUMNA ---
    let columnasOcupadas = new Set();

    for (let f = 0; f < FILAS; f++) {
        let colAleatoria;
        
        // Buscamos una columna que no haya recibido un comodín todavía
        do {
            colAleatoria = Math.floor(Math.random() * COLUMNAS);
        } while (columnasOcupadas.has(colAleatoria));

        // Registramos la columna como ocupada y ponemos el comodín
        columnasOcupadas.add(colAleatoria);
        matriz[f][colAleatoria] = "⭐";
    }

    return matriz;
};

module.exports = { generarCarton };