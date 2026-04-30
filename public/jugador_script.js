const socket = io({
    transports: ['websocket'],
    upgrade: false
});

let bolasSalidas = new Set();
let yaCantoLinea = false;

let datosPremios = {
    precio: 0,
    pLinea: 0,
    pBingo: 0,
    autoMarcado: false 
};

// --- FUNCIONES DEL MODAL Y SALIDA ---
function abrirModal() {
    document.getElementById('modal-confirmacion').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-confirmacion').style.display = 'none';
}

function ejecutarSalida() {
    window.onbeforeunload = null; 
    socket.emit('SALIR_VOLUNTARIO'); 
    location.reload(); 
}

// --- NUEVA FUNCIÓN: CANTAR AUDIO ---
function cantarTexto(texto) {
    window.speechSynthesis.cancel();
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = 'es-ES';
    mensaje.rate = 1;
    window.speechSynthesis.speak(mensaje);
}




function solicitar() {
    const n = document.getElementById('nombre').value.trim().toUpperCase();
    if(!n) return;

    // Esto envía la señal al servidor
    socket.emit('SOLICITAR_INGRESO', { nombre: n }); 
    
    // Cambia el mensaje para saber que el botón funcionó
    document.getElementById('mensaje-estado').innerText = "ENVIANDO PETICIÓN...";
}

    // --- NUEVO: Ocultar elementos estéticos del nuevo diseño ---
    document.querySelector('.input-group').style.display = 'none';
    document.querySelector('.btn-solicitar').style.display = 'none';
    document.querySelector('.floating-elements').style.display = 'none';
    // -----------------------------------------------------------

    socket.emit('SOLICITAR_INGRESO', { nombre: n });
    const msg = document.getElementById('mensaje-estado');
    msg.innerHTML = `<div class="loader-peticion"></div><br>ESPERANDO QUE EL HOST TE ACEPTE...`;
    msg.style.color = "#34495e";
}

// ... Todo el resto del script (actualizarPremios, socket.on, etc) 100% igual ...

function actualizarPremiosEnPantalla(jugadores) {
    const autorizados = jugadores.filter(j => j.estado === 'autorizado').length;
    const totalBote = autorizados * datosPremios.precio;
    
    const valorLinea = (totalBote * (datosPremios.pLinea / 100)).toFixed(2);
    const valorBingo = (totalBote * (datosPremios.pBingo / 100)).toFixed(2);

    document.getElementById('val-premio-linea').innerText = `${valorLinea}€`;
    document.getElementById('val-premio-bingo').innerText = `${valorBingo}€`;
}

function actualizarUIPrecio(precio) {
    const el = document.getElementById('display-precio');
    if (precio > 0) {
        el.innerText = `${parseFloat(precio).toFixed(2)}€`;
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

// --- EVENTOS SOCKET.IO ---
socket.on('INGRESO_APROBADO', (data) => {
    const nombreUsuario = document.getElementById('nombre').value;
    document.getElementById('nombre-jugador-pantalla').innerText = `JUGADOR: ${nombreUsuario.toUpperCase()}`;
    document.getElementById('espera').style.display = 'none';
    document.getElementById('juego').style.display = 'block';
    
    if(data.configInicial) {
        if (data.configInicial.precioPartida) {
            datosPremios.precio = parseFloat(data.configInicial.precioPartida);
            actualizarUIPrecio(data.configInicial.precioPartida);
        }
        if (data.configInicial.porcentajeLinea) datosPremios.pLinea = parseFloat(data.configInicial.porcentajeLinea);
        if (data.configInicial.porcentajeBingo) datosPremios.pBingo = parseFloat(data.configInicial.porcentajeBingo);
        
        if (data.configInicial.autoMarcado !== undefined) {
            datosPremios.autoMarcado = data.configInicial.autoMarcado;
        }
    }
    
    dibujarCarton(data.carton);
});

socket.on('ACTUALIZAR_CONFIG_CLIENTE', (config) => {
    if (config.precioPartida) {
        datosPremios.precio = parseFloat(config.precioPartida);
        actualizarUIPrecio(config.precioPartida);
    }
    if (config.autoMarcado !== undefined) {
        datosPremios.autoMarcado = config.autoMarcado;
    }
});

function actualizarIconosPremios(ganadores = []) {
    const miNombre = document.getElementById('nombre').value;
    const imgL = document.getElementById('status-linea');
    const imgB = document.getElementById('status-bingo');

    imgL.src = "Linea_en_juego.jpg";
    imgB.src = "Bingo_en_juego.jpg";
    imgL.className = 'img-premio';
    imgB.className = 'img-premio';

    ganadores.forEach(p => {
        const esMio = (p.ganador === miNombre);
        if (p.tipo === 'LÍNEA') {
            imgL.src = "Linea_premiada.jpg";
            if (esMio) imgL.className = 'img-premio mi-trofeo';
        } else if (p.tipo === 'BINGO') {
            imgB.src = "Bingo_premiado.jpg";
            if (esMio) imgB.className = 'img-premio mi-trofeo';
        }
    });
}

function comprobarPremios() {
    const celdas = Array.from(document.querySelectorAll('.celda'));
    const filas = [
        celdas.slice(0, 5),
        celdas.slice(5, 10),
        celdas.slice(10, 15)
    ];

    if (!yaCantoLinea) {
        for (let fila of filas) {
            if (fila.every(c => c.classList.contains('marcado'))) {
                yaCantoLinea = true;
                socket.emit('CANTAR_PREMIO', { tipo: 'LÍNEA', nombre: document.getElementById('nombre').value });
                break;
            }
        }
    }

    if (celdas.every(c => c.classList.contains('marcado'))) {
        socket.emit('CANTAR_PREMIO', { tipo: 'BINGO', nombre: document.getElementById('nombre').value });
    }
}

function dibujarCarton(carton) {
    const contenedor = document.getElementById('contenedor-carton');
    contenedor.innerHTML = '';
    yaCantoLinea = false;
    
    carton.forEach((fila) => {
        fila.forEach(celda => {
            const div = document.createElement('div');
            div.className = 'celda';
            
            if (celda === "⭐") {
                div.classList.add('marcado');
                div.innerText = celda;
            } else {
                div.innerText = celda;
                div.onclick = () => {
                    if (bolasSalidas.has(celda) && !div.classList.contains('marcado')) {
                        div.classList.add('marcado'); 
                        comprobarPremios();
                    } else if (!bolasSalidas.has(celda)) {
                        div.classList.add('error-flash');
                        setTimeout(() => div.classList.remove('error-flash'), 400);
                    }
                };
            }
            contenedor.appendChild(div);
        });
    });
}

socket.on('CAMBIAR_MODO_MARCADO', (esAutomatico) => {
    datosPremios.autoMarcado = esAutomatico;
});

socket.on('NUEVA_BOLA', (data) => {
    document.getElementById('contenedor-aviso-premio').innerHTML = '';
    bolasSalidas.add(data.numero);
    document.getElementById('bola-actual').innerText = `${data.letra} - ${data.numero}`;
    document.getElementById('historial').innerText = "" + data.historial.join(' - ');

    cantarTexto(`${data.letra}. ${data.numero}`);

    if (datosPremios.autoMarcado === true || datosPremios.autoMarcado === "true") {
        const celdas = document.querySelectorAll('.celda');
        celdas.forEach(div => {
            if (parseInt(div.innerText) === parseInt(data.numero) && !div.classList.contains('marcado')) {
                div.classList.add('marcado');
                comprobarPremios(); 
            }
        });
    }
});

socket.on('ANUNCIO_PREMIO', (data) => {
    if (data.tipo === 'LÍNEA') yaCantoLinea = true;
    const contenedorAviso = document.getElementById('contenedor-aviso-premio');
    contenedorAviso.innerHTML = `<div class="aviso-ganador">📢 ¡${data.tipo} de ${data.nombre.toUpperCase()}! <br> JUEGO PAUSADO</div>`;
    cantarTexto(`¡Atención! ${data.nombre} ha cantado ${data.tipo}`);
    if (data.ganadores) actualizarIconosPremios(data.ganadores);
});

socket.on('LISTA_ESPERA_ACTUALIZADA', (jugadores) => {
    actualizarPremiosEnPantalla(jugadores);
});

socket.on('PARTIDA_RESET_TOTAL', (data) => {
    bolasSalidas.clear();
    yaCantoLinea = false;
    document.getElementById('contenedor-aviso-premio').innerHTML = '';
    document.getElementById('bola-actual').innerText = "--";
    actualizarIconosPremios([]);
    dibujarCarton(data.carton);
});

socket.on('EXPULSADO', () => { location.reload(); });
socket.on('PARTIDA_TERMINADA_RESET', () => { location.reload(); });

socket.on('BANEADO_PERMANENTE', () => {
    alert("Has sido vetado permanentemente de este servidor.");
    window.location.href = "https://www.google.com"; 
});

socket.on('CUENTA_REGRESIVA_INICIO', () => {
    const overlay = document.getElementById('overlay-cuenta');
    const numero = document.getElementById('numero-cuenta');
    overlay.style.display = 'flex';
    let contador = 10;
    numero.innerText = contador;
    cantarTexto("La partida comenzará en 10 segundos");

    const intervalo = setInterval(() => {
        contador--;
        numero.innerText = contador;
        if(contador <= 3 && contador > 0) cantarTexto(contador.toString());
        if (contador <= 0) {
            clearInterval(intervalo);
            overlay.style.display = 'none';
            cantarTexto("¡Empezamos! Buena suerte");
        }
    }, 1000);
});

window.addEventListener('beforeunload', (event) => {
    const juegoVisible = document.getElementById('juego').style.display === 'block';
    if (juegoVisible && window.onbeforeunload !== null) {
        event.preventDefault();
        event.returnValue = ''; 
    }
});

socket.on('ERROR_INGRESO', (data) => {
    const mensajeEstado = document.getElementById('mensaje-estado');
    mensajeEstado.innerText = `⚠️ ${data.mensaje}`;
    mensajeEstado.style.color = "red";
    if (navigator.vibrate) navigator.vibrate(200);
});

socket.on('CUENTA_REGRESIVA_REANUDAR', () => {
    const overlay = document.getElementById('overlay-cuenta');
    const numero = document.getElementById('numero-cuenta');
    const textoAviso = overlay.querySelector('div');
    const textoOriginal = textoAviso.innerText;
    textoAviso.innerText = "REANUDAMOS LA PARTIDA EN...";
    overlay.style.display = 'flex';
    
    let contador = 4; 
    numero.innerText = contador;
    cantarTexto("Atención, reanudamos en 3 segundos");

    const intervalo = setInterval(() => {
        contador--;
        if (contador > 0) {
            numero.innerText = contador;
            cantarTexto(contador.toString());
        }
        if (contador <= 0) {
            clearInterval(intervalo);
            overlay.style.display = 'none';
            textoAviso.innerText = textoOriginal; 
            cantarTexto("Partida reanudada");
        }
    }, 1000);
});

socket.on('ESTADO_CAMBIADO', (fase) => {
    if (fase === 'activa') {
        document.getElementById('contenedor-aviso-premio').innerHTML = '';
    }
});
