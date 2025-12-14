// Variables globales
let supabaseClient = null;

// Elementos del DOM
const resetForm = document.getElementById("resetForm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const errorDiv = document.getElementById("error");
const successDiv = document.getElementById("success");
const submitBtn = document.getElementById("submitBtn");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");

// Cargar configuración desde el servidor e inicializar Supabase
async function initSupabase() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();

    // Inicializar el cliente de Supabase
    supabaseClient = supabase.createClient(
      config.supabaseUrl,
      config.supabaseKey
    );

    return true;
  } catch (error) {
    console.error("Error al cargar configuración:", error);
    return false;
  }
}

// Mostrar mensaje de error
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  errorDiv.style.backgroundColor = "#ffe6e6";
  errorDiv.style.color = "#d63031";
  successDiv.style.display = "none";
}

// Mostrar mensaje de éxito
function showSuccess(message) {
  successDiv.textContent = message;
  successDiv.style.display = "block";
  errorDiv.style.display = "none";
}

// Mostrar mensaje de información/cargando
function showInfo(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  errorDiv.style.backgroundColor = "#fef3cd";
  errorDiv.style.color = "#856404";
  successDiv.style.display = "none";
}

// Ocultar mensajes
function hideMessages() {
  errorDiv.style.display = "none";
  successDiv.style.display = "none";
}

// Habilitar/deshabilitar el formulario
function setFormEnabled(enabled) {
  submitBtn.disabled = !enabled;
  passwordInput.disabled = !enabled;
  confirmPasswordInput.disabled = !enabled;
}

// Inicializar la aplicación
async function initApp() {
  // Deshabilitar el formulario mientras se inicializa
  setFormEnabled(false);
  showInfo("Verificando enlace...");

  // Inicializar Supabase
  const initialized = await initSupabase();
  if (!initialized) {
    showError("Error al cargar la configuración. Recarga la página.");
    return;
  }

  // Escuchar cambios en el estado de autenticación
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Evento de Auth:", event, session);

    if (event === "PASSWORD_RECOVERY") {
      // El usuario ha llegado desde un enlace de recuperación
      // Supabase ya ha procesado el código/token y establecido la sesión
      hideMessages();
      setFormEnabled(true);
      console.log("Sesión de recuperación establecida correctamente");
    } else if (event === "SIGNED_IN" && session) {
      // A veces el evento puede ser SIGNED_IN en lugar de PASSWORD_RECOVERY
      hideMessages();
      setFormEnabled(true);
      console.log("Usuario autenticado para cambio de contraseña");
    } else if (event === "TOKEN_REFRESHED") {
      // Token refrescado, mantener habilitado
      setFormEnabled(true);
    } else if (event === "SIGNED_OUT") {
      showError("Sesión expirada. Solicita un nuevo enlace de recuperación.");
      setFormEnabled(false);
    }
  });

  // Verificar si ya hay una sesión activa después de un momento
  // Esto maneja el caso donde el evento ya se disparó antes de registrar el listener
  setTimeout(async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session) {
      hideMessages();
      setFormEnabled(true);
    } else {
      // Verificar si hay parámetros en la URL que indiquen un intento de recuperación
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const hasCode = urlParams.has("code");
      const hasToken =
        urlParams.has("access_token") || hashParams.has("access_token");
      const hasError = urlParams.has("error") || hashParams.has("error");

      if (hasError) {
        const errorDescription =
          urlParams.get("error_description") ||
          hashParams.get("error_description") ||
          "Error desconocido";
        showError(`Error: ${errorDescription}`);
      } else if (!hasCode && !hasToken) {
        showError(
          "Enlace inválido. Asegúrate de usar el enlace completo del correo."
        );
      } else {
        // Hay código o token pero no se estableció sesión - puede estar expirado
        showError("El enlace ha expirado o es inválido. Solicita uno nuevo.");
      }
      setFormEnabled(false);
    }
  }, 2000);
}

// Manejar el envío del formulario
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  hideMessages();

  // Validaciones
  if (password !== confirmPassword) {
    showError("Las contraseñas no coinciden");
    return;
  }

  if (password.length < 6) {
    showError("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  // Verificar sesión antes de intentar actualizar
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    showError(
      "La sesión ha expirado. Solicita un nuevo enlace de recuperación."
    );
    return;
  }

  // Mostrar estado de carga
  submitBtn.disabled = true;
  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";

  try {
    // Actualizar la contraseña usando el cliente de Supabase
    const { data, error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Error al actualizar contraseña:", error);
      showError(error.message || "Error al actualizar contraseña");
    } else {
      showSuccess(
        "¡Contraseña actualizada correctamente! Ya puedes cerrar esta ventana e iniciar sesión en la app."
      );
      resetForm.style.display = "none"; // Ocultar formulario
      setFormEnabled(false);

      // Intentar cerrar la ventana después de 3 segundos
      // Nota: Algunos navegadores bloquean window.close() si la ventana no fue abierta por script
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          // Si no se puede cerrar, no hacer nada - el usuario cerrará manualmente
          console.log("No se pudo cerrar la ventana automáticamente");
        }
      }, 3000);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    showError("Error de conexión. Intenta nuevamente.");
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
});

// Iniciar la aplicación cuando se carga la página
initApp();
