export const firebaseConfig = {
    apiKey: "AIzaSyDvVY14MgNfIs0yGt8txALnmSpXfp-lPOg",
    authDomain: "contacto-form-f59b0.firebaseapp.com",
    projectId: "contacto-form-f59b0",
    storageBucket: "contacto-form-f59b0.firebasestorage.app",
    messagingSenderId: "243724191813",
    appId: "1:243724191813:web:6f9f48815b5532905d3b2c"
};

export const allowedViewerEmails = [
    "graciagraciasobre1@gmail.com",
    
];

export function isFirebaseConfigured() {
    return Object.values(firebaseConfig).every((value) => value && !String(value).startsWith("REEMPLAZAR_"));
}
