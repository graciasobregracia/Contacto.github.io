import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, getDoc, getFirestore, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const firebasePendiente = document.getElementById("firebase-pendiente");
const loginPanel = document.getElementById("login-panel");
const sinAcceso = document.getElementById("sin-acceso");
const contenidoRegistros = document.getElementById("contenido-registros");
const ingresarGoogle = document.getElementById("ingresar-google");
const estadoLogin = document.getElementById("estado-login");
const cerrarSesion = document.getElementById("cerrar-sesion");
const tablaBody = document.getElementById("tabla-registros-body");
const tablaWrapper = document.getElementById("tabla-wrapper");
const tarjetas = document.getElementById("tarjetas-registros");
const sinRegistros = document.getElementById("sin-registros");

let unsubscribe = null;

function setLoginState(mensaje, tipo) {
    estadoLogin.hidden = false;
    estadoLogin.textContent = mensaje;
    estadoLogin.dataset.tipo = tipo;
}

function clearLoginState() {
    estadoLogin.hidden = true;
    estadoLogin.textContent = "";
    delete estadoLogin.dataset.tipo;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatFormDate(value) {
    if (!value) {
        return "Sin fecha";
    }

    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function formatCreatedAt(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
        return "Sin registro";
    }

    return date.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function createRow(record) {
    return `
        <tr>
            <td>${escapeHtml(record.nombre)}</td>
            <td>${formatFormDate(record.fecha)}</td>
            <td>${escapeHtml(record.telefono)}</td>
            <td>${record.hizoPeticion ? "Si" : "No"}</td>
            <td>${escapeHtml(record.peticion)}</td>
            <td>${formatCreatedAt(record.creadoEn)}</td>
        </tr>
    `;
}

function createCard(record) {
    return `
        <article class="tarjeta-registro">
            <h2>${escapeHtml(record.nombre)}</h2>
            <p><strong>Fecha:</strong> ${formatFormDate(record.fecha)}</p>
            <p><strong>Telefono:</strong> ${escapeHtml(record.telefono)}</p>
            <p><strong>Hizo peticion:</strong> ${record.hizoPeticion ? "Si" : "No"}</p>
            <p><strong>Detalle:</strong> ${escapeHtml(record.peticion)}</p>
            <p><strong>Registrado:</strong> ${formatCreatedAt(record.creadoEn)}</p>
        </article>
    `;
}

function renderRecords(records) {
    if (!records.length) {
        sinRegistros.hidden = false;
        tablaWrapper.hidden = true;
        tarjetas.innerHTML = "";
        return;
    }

    sinRegistros.hidden = true;
    tablaWrapper.hidden = false;
    tablaBody.innerHTML = records.map(createRow).join("");
    tarjetas.innerHTML = records.map(createCard).join("");
}

function setMode(mode) {
    firebasePendiente.hidden = mode !== "firebase-pendiente";
    loginPanel.hidden = mode !== "login";
    sinAcceso.hidden = mode !== "denied";
    contenidoRegistros.hidden = mode !== "content";
    cerrarSesion.hidden = mode === "firebase-pendiente" || mode === "login";
}

if (!isFirebaseConfigured()) {
    setMode("firebase-pendiente");
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    ingresarGoogle.addEventListener("click", async () => {
        clearLoginState();

        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            setLoginState("No fue posible iniciar sesion con Google.", "error");
        }
    });

    cerrarSesion.addEventListener("click", async () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        await signOut(auth);
        setMode("login");
    });

    onAuthStateChanged(auth, (user) => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if (!user) {
            clearLoginState();
            setMode("login");
            return;
        }

        (async () => {
            try {
                const accessRef = doc(db, "authorized_viewers", user.email);
                const accessSnap = await getDoc(accessRef);

                if (!accessSnap.exists() || accessSnap.data().active !== true) {
                    setMode("denied");
                    sinAcceso.innerHTML = `La cuenta <strong>${escapeHtml(user.email)}</strong> no esta autorizada para ver estos registros.`;
                    return;
                }

                setMode("content");
                const q = query(collection(db, "solicitudes"), orderBy("creadoEn", "desc"));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const records = snapshot.docs.map((recordDoc) => ({
                        id: recordDoc.id,
                        ...recordDoc.data()
                    }));

                    renderRecords(records);
                }, (error) => {
                    if (error?.code === "permission-denied") {
                        setMode("denied");
                        sinAcceso.innerHTML = `La cuenta <strong>${escapeHtml(user.email)}</strong> no esta autorizada para ver estos registros.`;
                        return;
                    }

                    sinRegistros.hidden = false;
                    sinRegistros.textContent = "No fue posible cargar los registros.";
                    tablaWrapper.hidden = true;
                    tarjetas.innerHTML = "";
                });
            } catch (error) {
                if (error?.code === "permission-denied") {
                    setMode("denied");
                    sinAcceso.innerHTML = `La cuenta <strong>${escapeHtml(user.email)}</strong> no esta autorizada para ver estos registros.`;
                    return;
                }

                setMode("login");
                setLoginState("No fue posible validar el acceso en este momento.", "error");
            }
        })();
    });
}
