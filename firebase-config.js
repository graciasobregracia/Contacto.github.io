export const firebaseConfig = {
    apiKey: "REEMPLAZAR_API_KEY",
    authDomain: "REEMPLAZAR_AUTH_DOMAIN",
    projectId: "REEMPLAZAR_PROJECT_ID",
    storageBucket: "REEMPLAZAR_STORAGE_BUCKET",
    messagingSenderId: "REEMPLAZAR_MESSAGING_SENDER_ID",
    appId: "REEMPLAZAR_APP_ID"
};

export const allowedViewerEmails = [
    "graciagraciasobre1@gmail.com",
    
];

export function isFirebaseConfigured() {
    return Object.values(firebaseConfig).every((value) => value && !String(value).startsWith("REEMPLAZAR_"));
}
