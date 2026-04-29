const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { generarCarton } = require('./carton');
const fs = require('fs'); // NUEVO: Para persistencia

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/master', (req, res) => { res.sendFile(__dirname + '/public/master.html'); });
app.get('/jugar', (req, res) => { res.sendFile(__dirname + '/public/jugador.html'); });
app.get('/autorizar', (req, res) => { res.sendFile(__dirname + '/public/autorizar.html'); });
app.get('/configurar', (req, res) => { res.sendFile(__dirname + '/public/configurar.html'); });

// --- LÓGICA DE PERSISTENCIA ---
const PATH_CONFIG = './config.json';

let estado = {
    fase: 'espera', 
    bombo: [],
    bolasCantadas: [],
    indiceActual: 0,
    intervalo: null,
    inicioPartida: null,    
    jugadores: {},
    premiosOtorgados: [],
    velocidad: 3000,
    jugarLinea: true,      
    autoMarcado: false,    
    precioPartida: 1.50,
    porcentajeLinea: 20,
    porcentajeBingo: 75,
    porcentajeCasa: 5,
    listaNegraIPs: []
};

// Cargar configuración guardada al iniciar
if (fs.existsSync(PATH_CONFIG)) {
    try {
        const datosGuardados = JSON.parse(fs.readFileSync(PATH_CONFIG, 'utf8'));
        estado = { ...estado, ...datosGuardados };
    } catch (e) { console.error("Error al cargar config.json", e); }
}

const guardarEnDisco = () => {
    const configAGuardar = {
        velocidad: estado.velocidad,
        jugarLinea: estado.jugarLinea,
        autoMarcado: estado.autoMarcado,
        precioPartida: estado.precioPartida,
        porcentajeLinea: estado.porcentajeLinea,
        porcentajeBingo: estado.porcentajeBingo,
        porcentajeCasa: estado.porcentajeCasa,
        listaNegraIPs: estado.listaNegraIPs
    };
    fs.writeFileSync(PATH_CONFIG, JSON.stringify(configAGuardar, null, 2));
};

const generarBombo = () => {
    let bolas = Array.from({ length: 75 }, (_, i) => i + 1);
    return bolas.sort(() => Math.random() - 0.5);
};


// Dentro de server.js
const enviarProgresoJugadores = () => {
    const progreso = Object.values(estado.jugadores).map(j => {
        let faltanParaBingo = 0;
        let minimaFaltaLinea = 5;
        const lineaYaCantada = estado.premiosOtorgados.some(p => p.tipo === 'LÍNEA');

        if (j.carton && Array.isArray(j.carton)) { 
            let aciertosTotales = 0;
            j.carton.forEach(fila => {
                let aciertosFila = fila.filter(c => c === "⭐" || estado.bolasCantadas.includes(c)).length;
                let faltanFila = 5 - aciertosFila;
                if (faltanFila < minimaFaltaLinea) minimaFaltaLinea = faltanFila;
                aciertosTotales += aciertosFila;
            });
            
            // CORRECCIÓN: Si ya tiene los 15, ponemos -1 o un valor que identifique el Bingo completado
            faltanParaBingo = (15 - aciertosTotales);
        } else {
            faltanParaBingo = 15;
            minimaFaltaLinea = 5;
        }

        return { 
            id: j.id,
            nombre: j.nombre,
            estado: j.estado,
            faltanParaBingo, 
            minimaFaltaLinea,
            lineaYaCantada 
        };
    });
    io.emit('LISTA_ESPERA_ACTUALIZADA', progreso);
};

const cantarBola = () => {
    if (estado.indiceActual < 75 && estado.fase === 'activa') {
        const numero = estado.bombo[estado.indiceActual];
        estado.bolasCantadas.push(numero);
        estado.indiceActual++;

        let letra = "";
        if (numero <= 15) letra = "B";
        else if (numero <= 30) letra = "I";
        else if (numero <= 45) letra = "N";
        else if (numero <= 60) letra = "G";
        else letra = "O";

        io.emit('NUEVA_BOLA', {
            letra: letra,
            numero: numero,
            historial: estado.bolasCantadas.slice(-5),
            restantes: 75 - estado.indiceActual
        });

        enviarProgresoJugadores();

    } else if (estado.indiceActual >= 75) {
        detenerPartida();
        estado.fase = 'finalizada';
        io.emit('ESTADO_CAMBIADO', estado.fase);
    }
};

const detenerPartida = () => {
    if (estado.intervalo) {
        clearInterval(estado.intervalo);
        estado.intervalo = null;
    }
};

io.on('connection', (socket) => {
    
    /* --- NUEVA LÓGICA: COMPROBACIÓN DE BANEO POR IP --- */
    const clientIp = socket.handshake.address;
    if (estado.listaNegraIPs.includes(clientIp)) {
        socket.emit('BANEADO_PERMANENTE');
        socket.disconnect();
        return;
    }

    enviarProgresoJugadores();

    // SE ACTUALIZA ESTA SECCIÓN PARA INCLUIR TODOS LOS VALORES ACTUALES
    socket.emit('ACTUALIZAR_CONFIG_CLIENTE', {
        autoMarcado: estado.autoMarcado,
        precioPartida: estado.precioPartida,
        porcentajeLinea: estado.porcentajeLinea,
        porcentajeBingo: estado.porcentajeBingo,
        porcentajeCasa: estado.porcentajeCasa,
        velocidad: estado.velocidad // <--- Se añade velocidad aquí
    });

    socket.on('MASTER_GUARDAR_CONFIG', (config) => {
        estado.velocidad = parseInt(config.velocidad);
        estado.jugarLinea = config.jugarLinea === 'true';      
        estado.autoMarcado = config.autoMarcado === 'true';    
            
        
        if (config.precioPartida) estado.precioPartida = parseFloat(config.precioPartida);
        
        if (config.porcentajeLinea) estado.porcentajeLinea = parseFloat(config.porcentajeLinea);
        if (config.porcentajeBingo) estado.porcentajeBingo = parseFloat(config.porcentajeBingo);
        if (config.porcentajeCasa) estado.porcentajeCasa = parseFloat(config.porcentajeCasa);

        // MODIFICACIÓN: Emitir el cambio de marcado a todos para que funcione en tiempo real
        io.emit('CAMBIAR_MODO_MARCADO', estado.autoMarcado);

        // NUEVO: Persistencia al guardar
        guardarEnDisco();

        io.emit('ACTUALIZAR_CONFIG_CLIENTE', {
            autoMarcado: estado.autoMarcado,
            precioPartida: estado.precioPartida,
            porcentajeLinea: estado.porcentajeLinea,
            porcentajeBingo: estado.porcentajeBingo,
            porcentajeCasa: estado.porcentajeCasa,
            velocidad: estado.velocidad // <--- También aquí para confirmar el cambio
        });

        if (estado.fase === 'activa') {
            detenerPartida();
            estado.intervalo = setInterval(cantarBola, estado.velocidad);
        }
    });








    
socket.on('CANTAR_PREMIO', (data) => {
    if (data.tipo === 'LÍNEA' && !estado.jugarLinea) return;
    if (estado.premiosOtorgados.some(p => p.tipo === data.tipo)) return;

    // --- NUEVO: CÁLCULO DE TIEMPO TRANSCURRIDO ---
    const ms = Date.now() - estado.inicioPartida;
    const totalSegundos = Math.floor(ms / 1000);
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    const tiempoTxt = `${min}m ${seg}s`;

    estado.premiosOtorgados.push({ tipo: data.tipo, ganador: data.nombre, tiempo: tiempoTxt });
    detenerPartida();
    estado.fase = 'pausada';
    
    // Enviamos el tiempo en el objeto de anuncio
    io.emit('ANUNCIO_PREMIO', { ...data, ganadores: estado.premiosOtorgados, tiempo: tiempoTxt });
    io.emit('ESTADO_CAMBIADO', 'pausada');
});

socket.on('MASTER_INICIAR', () => {
    // NUEVO: Si ya hay una partida en curso, ignoramos la petición para     evitar reinicios accidentales
    if (estado.fase === 'activa' || estado.fase === 'pausada') {
        return; 
    }   

    detenerPartida(); // Detenemos cualquier intervalo previo
    
    // 1. Reiniciamos los valores de la partida
    estado.bombo = generarBombo();
    estado.fase = 'activa';
    estado.bolasCantadas = [];
    estado.indiceActual = 0;
    estado.premiosOtorgados = [];

    // 2. Avisamos a todos los clientes que inicien su cuenta atrás visual
    io.emit('CUENTA_REGRESIVA_INICIO');
    
    // 3. Cambiamos el estado a activa para que el Master vea el cambio
    io.emit('ESTADO_CAMBIADO', 'activa');

    // 4. ESPERA DE 10 SEGUNDOS (10000 ms) antes de la primera bola
    setTimeout(() => {
        // Solo empezamos si la partida sigue activa (por si se reseteó en medio)
        if (estado.fase === 'activa') {
            estado.inicioPartida = Date.now(); // <--- NUEVO: Marcamos el tiempo de inicio real aquí
            cantarBola();
            estado.intervalo = setInterval(cantarBola, estado.velocidad);
        }
    }, 10000);
});

socket.on('SOLICITAR_INGRESO', (datos) => {
        // 1. Limpiar el nombre y convertirlo a MAYÚSCULAS inmediatamente
        const nombreNuevo = datos.nombre.trim().toUpperCase();
        const nombreNormalizado = nombreNuevo.toLowerCase();

        // 2. Verificar si ya existe alguien con ese nombre en el objeto estado.jugadores
        const nombreDuplicado = Object.values(estado.jugadores).some(
            j => j.nombre.trim().toLowerCase() === nombreNormalizado
        );

        if (nombreDuplicado) {
            // 3. Si existe, enviamos un error solo a ese socket
            socket.emit('ERROR_INGRESO', { mensaje: "Este nombre ya está en uso. Elige otro." });
        } else {
            // 4. Si es único, procedemos normalmente guardando el nombre en MAYÚSCULAS
            estado.jugadores[socket.id] = { 
                id: socket.id, 
                nombre: nombreNuevo, // Aquí ya va en mayúsculas gracias al paso 1
                estado: 'pendiente' 
            };
            enviarProgresoJugadores();
        }
    });

    /* --- NUEVA LÓGICA: BANEO PERMANENTE POR IP --- */
    socket.on('MASTER_BANEAR', (idJugador) => {
        if (estado.jugadores[idJugador]) {
            const targetSocket = io.sockets.sockets.get(idJugador);
            if (targetSocket) {
                const ipABanear = targetSocket.handshake.address;
                if (!estado.listaNegraIPs.includes(ipABanear)) {
                    estado.listaNegraIPs.push(ipABanear);
                    guardarEnDisco(); // NUEVO: Persistencia tras baneo
                }
                io.to(idJugador).emit('BANEADO_PERMANENTE');
                targetSocket.disconnect();
            }
            delete estado.jugadores[idJugador];
            enviarProgresoJugadores();
        }
    });

    socket.on('MASTER_EXPULSAR', (idJugador) => {
        if (estado.jugadores[idJugador]) {
            io.to(idJugador).emit('EXPULSADO');
            delete estado.jugadores[idJugador];
            enviarProgresoJugadores();
        }
    });


    socket.on('MASTER_PAUSA', (pausar) => {
        if (pausar) {
            estado.fase = 'pausada';
            detenerPartida();
            io.emit('ESTADO_CAMBIADO', 'pausada');
        } else {
            // --- NUEVA LÓGICA DE REANUDACIÓN ---
            // Avisamos a todos que se preparen
            io.emit('CUENTA_REGRESIVA_REANUDAR');
            
            // Esperamos 4 segundos antes de activar realmente el juego
            setTimeout(() => {
                if (estado.fase === 'pausada') { // Verificamos que siga en pausa
                    estado.fase = 'activa';
                    estado.intervalo = setInterval(cantarBola, estado.velocidad);
                    io.emit('ESTADO_CAMBIADO', 'activa');
                }
            }, 4000);
        }
    });
 
    socket.on('MASTER_RESET', () => {
            detenerPartida();
            estado.fase = 'espera';
            estado.bolasCantadas = [];
            estado.indiceActual = 0;
            estado.premiosOtorgados = []; 
            io.emit('PARTIDA_TERMINADA_RESET'); 
            estado.jugadores = {}; 
            io.emit('ESTADO_CAMBIADO', 'espera');
            enviarProgresoJugadores();
        });

    socket.on('MASTER_AUTORIZAR', (idJugador) => {
            if (estado.jugadores[idJugador]) {
                estado.jugadores[idJugador].estado = 'autorizado';
                
                // Generamos el cartón para el jugador
                estado.jugadores[idJugador].carton = generarCarton();
                
                // Enviamos la aprobación con la configuración actual
                io.to(idJugador).emit('INGRESO_APROBADO', { 
                    carton: estado.jugadores[idJugador].carton,
                    configInicial: { 
                        autoMarcado: estado.autoMarcado,
                        precioPartida: estado.precioPartida,
                        porcentajeLinea: estado.porcentajeLinea,
                        porcentajeBingo: estado.porcentajeBingo
                    }
                });
                
                // Actualizamos las listas en todos los paneles
                enviarProgresoJugadores();
            }
        });
}); // <--- ESTE ES EL CIERRE DE io.on('connection') QUE YA TIENES

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});