console.log("Verificación de email iniciada");
console.log("window.supabase disponible:", typeof window.supabase);

let SUPABASE_URL = "";
let SUPABASE_KEY = "";
let supabase = null;

// Cargar configuración desde el servidor e inicializar Supabase
async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_KEY = config.supabaseKey;

    // Verificar que el SDK de Supabase esté cargado
    if (!window.supabase) {
      console.error("ERROR: SDK de Supabase no está cargado");
      showError(
        "Error: No se pudo cargar el SDK de Supabase. Por favor recarga la página."
      );
      return;
    }

    // Crear cliente de Supabase
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Cliente de Supabase creado:", supabase);

    // Verificar email después de inicializar
    await verifyEmail();
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    showError("Error al cargar la configuración. Por favor recarga la página.");
  }
}

// Verificar email
async function verifyEmail() {
  try {
    console.log("URL completa:", window.location.href);
    console.log("Hash:", window.location.hash);
    console.log("Search:", window.location.search);

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    // Obtener tokens del hash (flujo implícito)
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    // Obtener token PKCE de query params
    const token = queryParams.get("token");
    const type = queryParams.get("type") || hashParams.get("type");

    console.log("Tokens encontrados:", {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      token: !!token,
      type,
    });

    // CASO 1: Token PKCE (token=pkce_xxx en query params)
    if (token && type === "signup") {
      console.log("Verificando token PKCE de confirmación de email...");
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "signup",
      });

      console.log("Resultado verifyOtp:", { data, error });

      if (error) throw error;

      if (data.session) {
        console.log("Email verificado con token PKCE");
        showSuccess();
        return;
      }
    }

    // CASO 2: Tokens en hash (flujo implícito antiguo)
    if (accessToken && type === "signup") {
      console.log("Estableciendo sesión con tokens del hash...");
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      if (data.session) {
        console.log("Email verificado con tokens del hash");
        showSuccess();
        return;
      }
    }

    // CASO 3: Verificar si ya hay una sesión (usuario ya verificado)
    console.log("Verificando sesión existente...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (session) {
      console.log("Usuario ya tiene sesión activa");
      showSuccess();
      return;
    }

    // No hay token válido o tipo incorrecto
    console.log("Token inválido o tipo incorrecto");
    showError(
      "Enlace de verificación inválido o ha expirado. Por favor solicita un nuevo enlace."
    );
  } catch (error) {
    console.error("Error al verificar email:", error);
    showError("Error al verificar el enlace: " + error.message);
  }
}

// Mostrar estado de éxito
function showSuccess() {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("error-state").classList.add("hidden");
  document.getElementById("success-state").classList.remove("hidden");

  // Redirigir automáticamente después de 3 segundos
  setTimeout(() => {
    openApp();
  }, 3000);
}

// Mostrar estado de error
function showError(message) {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("success-state").classList.add("hidden");
  document.getElementById("error-message").textContent = message;
  document.getElementById("error-state").classList.remove("hidden");
}

// Abrir app con deep link
function openApp() {
  // Intentar obtener tokens para pasarlos a la app
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);

  const accessToken =
    hashParams.get("access_token") || queryParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") || queryParams.get("refresh_token");

  let deepLink = "apppetadopt://email-verified";

  if (accessToken) {
    deepLink += `?access_token=${encodeURIComponent(accessToken)}`;
    if (refreshToken) {
      deepLink += `&refresh_token=${encodeURIComponent(refreshToken)}`;
    }
  }

  console.log("Abriendo app con deep link:", deepLink);
  window.location.href = deepLink;

  setTimeout(() => {
    alert("Si la aplicación no se abre automáticamente, ábrela manualmente.");
  }, 2000);
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadConfig);
} else {
  // DOM ya está listo
  loadConfig();
}
