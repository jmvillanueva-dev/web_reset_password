console.log("Script iniciado");
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

    // Verificar sesión después de inicializar
    await checkSession();
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    showError("Error al cargar la configuración. Por favor recarga la página.");
  }
}

// Validar contraseña en tiempo real
function validatePassword() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn = document.getElementById("submitBtn");

  // Validar longitud
  const lengthReq = document.getElementById("req-length");
  if (password.length >= 6) {
    lengthReq.classList.add("valid");
  } else {
    lengthReq.classList.remove("valid");
  }

  // Validar coincidencia
  const matchReq = document.getElementById("req-match");
  if (password && confirmPassword && password === confirmPassword) {
    matchReq.classList.add("valid");
  } else {
    matchReq.classList.remove("valid");
  }

  // Habilitar/deshabilitar botón
  const isValid = password.length >= 6 && password === confirmPassword;
  submitBtn.disabled = !isValid;
}

// Verificar y establecer sesión al cargar
async function checkSession() {
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
    if (token && type === "recovery") {
      console.log("Verificando token PKCE de recuperación...");
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery",
      });

      console.log("Resultado verifyOtp:", { data, error });

      if (error) throw error;

      if (data.session) {
        console.log("Sesión establecida con token PKCE");
        showForm();
        return;
      }
    }

    // CASO 2: Tokens en hash (flujo implícito antiguo)
    if (accessToken) {
      console.log("Estableciendo sesión con tokens del hash...");
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      if (data.session) {
        console.log("Sesión establecida con tokens del hash");
        showForm();
        return;
      }
    }

    // CASO 3: Verificar sesión existente
    console.log("Verificando sesión existente...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (session) {
      console.log("Sesión existente encontrada");
      showForm();
      return;
    }

    // No hay sesión válida
    console.log("No se encontró sesión válida");
    showError(
      "El enlace de recuperación es inválido o ha expirado. Por favor solicita un nuevo enlace."
    );
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    showError("Error al verificar el enlace: " + error.message);
  }
}

// Mostrar formulario
function showForm() {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("form-state").classList.remove("hidden");
}

// Mostrar error
function showError(message) {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("form-state").classList.add("hidden");
  document.getElementById("success-state").classList.add("hidden");
  document.getElementById("error-message").textContent = message;
  document.getElementById("error-state").classList.remove("hidden");
}

// Mostrar éxito
function showSuccess() {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("form-state").classList.add("hidden");
  document.getElementById("error-state").classList.add("hidden");
  document.getElementById("success-state").classList.remove("hidden");
}

// Abrir app
function openApp() {
  // Intentar obtener tokens del hash primero, luego de query params
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);

  const accessToken =
    hashParams.get("access_token") || queryParams.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") || queryParams.get("refresh_token");

  let deepLink = "apppetadopt://password-reset-success";

  if (accessToken) {
    deepLink += `?access_token=${encodeURIComponent(accessToken)}`;
    if (refreshToken) {
      deepLink += `&refresh_token=${encodeURIComponent(refreshToken)}`;
    }
  }

  window.location.href = deepLink;

  setTimeout(() => {
    alert("Si la aplicación no se abre automáticamente, ábrela manualmente.");
  }, 2000);
}

// Manejar envío del formulario
async function handleSubmit(event) {
  event.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");
  const errorDiv = document.getElementById("error");

  errorDiv.style.display = "none";

  if (password !== confirmPassword) {
    errorDiv.textContent = "Las contraseñas no coinciden";
    errorDiv.style.display = "block";
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = "La contraseña debe tener al menos 6 caracteres";
    errorDiv.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";

  try {
    // Verificar que tengamos una sesión activa antes de actualizar
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("Sesión actual:", session);

    if (!session) {
      throw new Error("No hay sesión activa. Por favor recarga la página.");
    }

    // Actualizar la contraseña usando el SDK de Supabase
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    console.log("Resultado de actualización:", { data, error });

    if (error) throw error;

    // Mostrar éxito
    showSuccess();

    // Redirigir automáticamente después de 3 segundos
    setTimeout(() => {
      openApp();
    }, 3000);
  } catch (error) {
    console.error("Error completo:", error);
    errorDiv.textContent =
      "Error al actualizar la contraseña: " + error.message;
    errorDiv.style.display = "block";
    submitBtn.disabled = false;
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
}

// Configurar event listeners cuando el DOM esté listo
function setupEventListeners() {
  const form = document.getElementById("resetForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", validatePassword);
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", validatePassword);
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    loadConfig();
  });
} else {
  // DOM ya está listo
  setupEventListeners();
  loadConfig();
}
