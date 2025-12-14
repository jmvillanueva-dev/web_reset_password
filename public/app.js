let SUPABASE_URL = "";
let SUPABASE_KEY = "";

// Cargar configuración desde el servidor
async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_KEY = config.supabaseKey;
  } catch (error) {
    console.error("Error al cargar configuración:", error);
  }
}

// Cargar configuración al iniciar
loadConfig();

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

  // Obtener access token de la URL (puede venir como query param o hash)
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken =
    urlParams.get("access_token") || hashParams.get("access_token");

  if (!accessToken) {
    errorDiv.textContent = "Token inválido o expirado";
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
