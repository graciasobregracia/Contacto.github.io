import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const formulario = document.getElementById("contacto-formulario");
const checkbox = document.getElementById("hacerPeticion");
const peticionContainer = document.getElementById("peticion-container");
const peticion = document.getElementById("peticion");
const peticionError = document.getElementById("peticion-error");
const nombre = document.getElementById("nombre");
const fecha = document.getElementById("fecha");
const telefonoPrefijo = document.getElementById("telefono-prefijo");
const telefonoNumero = document.getElementById("telefono-numero");
const telefono = document.getElementById("telefono");
const telefonoError = document.getElementById("telefono-error");
const estadoEnvio = document.getElementById("estado-envio");
const botonEnviar = document.getElementById("boton-enviar");

let db = null;

if (isFirebaseConfigured()) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
}

function setEstado(mensaje, tipo) {
    estadoEnvio.hidden = false;
    estadoEnvio.textContent = mensaje;
    estadoEnvio.dataset.tipo = tipo;
}

function limpiarEstado() {
    estadoEnvio.hidden = true;
    estadoEnvio.textContent = "";
    delete estadoEnvio.dataset.tipo;
}

function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function mostrarErrorPeticion(mensaje) {
    peticion.setCustomValidity(mensaje);
    peticionError.textContent = mensaje;
}

function limpiarErrorPeticion() {
    peticion.setCustomValidity("");
    peticionError.textContent = "";
}

function actualizarTelefono() {
    const soloNumeros = telefonoNumero.value.replace(/\D/g, "");
    telefonoNumero.value = soloNumeros;

    if (!soloNumeros) {
        telefono.value = "";
        telefonoNumero.setCustomValidity("Ingresa un numero de telefono.");
        telefonoError.textContent = "Ingresa un numero de telefono.";
        return;
    }

    if (soloNumeros.length < 7) {
        telefono.value = "";
        telefonoNumero.setCustomValidity("Ingresa un numero valido.");
        telefonoError.textContent = "Ingresa un numero valido.";
        return;
    }

    telefono.value = `${telefonoPrefijo.value} ${soloNumeros}`;
    telefonoNumero.setCustomValidity("");
    telefonoError.textContent = "";
}

function esPeticionCoherente(texto) {
    const limpio = texto.trim();
    const base = normalizarTexto(limpio);
    const sinEspacios = base.replace(/\s+/g, "");
    const palabras = base.match(/[A-Za-z]+/g) || [];
    const letras = (base.match(/[A-Za-z]/g) || []).length;
    const digitos = (base.match(/\d/g) || []).length;

    if (limpio.length < 15) {
        return "Escribe una peticion un poco mas detallada.";
    }

    if (palabras.length < 3) {
        return "La peticion debe tener al menos 3 palabras con sentido.";
    }

    if (letras < 10) {
        return "Incluye una descripcion mas clara de tu peticion.";
    }

    if (/^([A-Za-z0-9])\1{5,}$/.test(sinEspacios)) {
        return "No se permiten repeticiones como 222222 o aaaaaa.";
    }

    if (digitos > 0 && digitos / limpio.length > 0.3) {
        return "La peticion no puede estar compuesta principalmente por numeros.";
    }

    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(base)) {
        return "Escribe una peticion con palabras reconocibles.";
    }

    return "";
}

checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
        peticionContainer.hidden = false;
        peticion.required = true;
        return;
    }

    peticionContainer.hidden = true;
    peticion.required = false;
    peticion.value = "";
    limpiarErrorPeticion();
});

telefonoPrefijo.addEventListener("change", actualizarTelefono);
telefonoNumero.addEventListener("input", actualizarTelefono);

peticion.addEventListener("input", () => {
    if (!checkbox.checked) {
        limpiarErrorPeticion();
        return;
    }

    const mensaje = esPeticionCoherente(peticion.value);

    if (mensaje) {
        mostrarErrorPeticion(mensaje);
        return;
    }

    limpiarErrorPeticion();
});

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    limpiarEstado();

    if (!db) {
        setEstado("Primero configura Firebase en firebase-config.js para poder guardar formularios.", "error");
        return;
    }

    if (checkbox.checked) {
        const mensaje = esPeticionCoherente(peticion.value);

        if (mensaje) {
            mostrarErrorPeticion(mensaje);
            peticion.reportValidity();
            return;
        }
    } else {
        limpiarErrorPeticion();
    }

    if (!formulario.reportValidity()) {
        return;
    }

    actualizarTelefono();

    if (!telefono.value) {
        telefonoNumero.reportValidity();
        return;
    }

    botonEnviar.disabled = true;
    setEstado("Enviando datos...", "info");

    try {
        await addDoc(collection(db, "solicitudes"), {
            nombre: nombre.value.trim(),
            fecha: fecha.value,
            telefono: telefono.value.trim(),
            hizoPeticion: checkbox.checked,
            peticion: checkbox.checked ? peticion.value.trim() : "No aplica",
            creadoEn: serverTimestamp()
        });

        formulario.reset();
        peticionContainer.hidden = true;
        peticion.required = false;
        limpiarErrorPeticion();
        telefono.value = "";
        telefonoNumero.setCustomValidity("");
        telefonoError.textContent = "";
        telefonoPrefijo.value = "+57";
        setEstado("Tu formulario fue enviado correctamente.", "success");
    } catch (error) {
        const detalle = error?.code ? ` (${error.code})` : "";
        setEstado(`No fue posible enviar el formulario${detalle}. Revisa Firestore y las reglas publicadas.`, "error");
        console.error("Error al guardar en Firebase:", error);
    } finally {
        botonEnviar.disabled = false;
    }
});

