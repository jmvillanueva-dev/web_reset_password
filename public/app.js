let SUPABASE_URL = "";
let SUPABASE_KEY = "";
let accessToken = null;

// Cargar configuración desde el servidor
async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_KEY = config.supabaseKey;
    return true;
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    return false;
  }
}

// Intercambiar el código por un access token (flujo PKCE)
async function exchangeCodeForToken(code) {
  try {
    // Usar el endpoint verify para intercambiar el código
    const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({
        type: "recovery",
        token: code,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    } else {
      console.error("Error al verificar código:", await response.json());
      return null;
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    return null;
  }
}

// Obtener token de la URL
function getTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // Verificar si hay un código (flujo PKCE)
  const code = urlParams.get("code");
  if (code) {
    return { type: "code", value: code };
  }

  // Verificar si hay access_token directo (flujo implícito)
  const token = urlParams.get("access_token") || hashParams.get("access_token");
  if (token) {
    return { type: "token", value: token };
  }

  return null;
}

// Inicializar la aplicación
async function initApp() {
  const errorDiv = document.getElementById("error");

  // Cargar configuración primero
  const configLoaded = await loadConfig();
  if (!configLoaded) {
    errorDiv.textContent = "Error al cargar la configuración";
    errorDiv.style.display = "block";
    return;
  }

  // Obtener token o código de la URL
  const authData = getTokenFromUrl();

  if (!authData) {
    errorDiv.textContent = "Token inválido o expirado";
    errorDiv.style.display = "block";
    return;
  }

  if (authData.type === "code") {
    // Flujo PKCE: intercambiar código por token
    errorDiv.textContent = "Verificando enlace...";
    errorDiv.style.display = "block";
    errorDiv.style.backgroundColor = "#fef3cd";
    errorDiv.style.color = "#856404";

    accessToken = await exchangeCodeForToken(authData.value);

    if (!accessToken) {
      errorDiv.textContent =
        "El enlace ha expirado o es inválido. Solicita uno nuevo.";
      errorDiv.style.display = "block";
      errorDiv.style.backgroundColor = "#ffe6e6";
      errorDiv.style.color = "#d63031";
      return;
    }

    // Ocultar mensaje de verificación
    errorDiv.style.display = "none";
  } else {
    // Flujo implícito: usar token directamente
    accessToken = authData.value;
  }
}

// Iniciar la aplicación cuando se carga la página
initApp();

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorDiv = document.getElementById("error");
  const successDiv = document.getElementById("success");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");

  errorDiv.style.display = "none";
  successDiv.style.display = "none";

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

  if (!accessToken) {
    errorDiv.textContent =
      "Token inválido o expirado. Solicita un nuevo enlace.";
    errorDiv.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      successDiv.textContent = "¡Contraseña actualizada exitosamente!";
      successDiv.style.display = "block";
      document.getElementById("resetForm").reset();

      setTimeout(() => {
        window.close();
      }, 3000);
    } else {
      const error = await response.json();
      errorDiv.textContent = error.message || "Error al actualizar contraseña";
      errorDiv.style.display = "block";
    }
  } catch (error) {
    errorDiv.textContent = "Error de conexión. Intenta nuevamente.";
    errorDiv.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
});
