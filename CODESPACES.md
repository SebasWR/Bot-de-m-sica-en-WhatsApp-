# Prender el bot sin PC y sin Termux (GitHub Codespaces)

Codespaces es una compu en la nube de GitHub que se maneja desde el navegador del celular.
Es gratis hasta ~60 horas por mes.

1. Abrí este link (con tu cuenta de GitHub):
   https://codespaces.new/SebasWR/Bot-de-m-sica-en-WhatsApp-/tree/claude/project-thread-jhxkae
2. Tocá **Create codespace** y esperá unos 3 minutos a que termine de instalar.
3. Abajo aparece una **terminal**. Pegá esto y apretá Enter (con el número del bot):

   ```
   bash .devcontainer/prender.sh 59896570220
   ```

4. Va a aparecer `CÓDIGO PARA VINCULAR: XXXX-XXXX`. En el celular del bot:
   WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo →
   **Vincular con el número de teléfono** → escribí el código.
   Si se vence, aparece uno nuevo solo.

## A tener en cuenta

- El Codespace se **apaga solo si no lo usás** (30 min por defecto). Podés subirlo a 4 horas en
  https://github.com/settings/codespaces → *Default idle timeout* → 240.
- Para volver a prenderlo: entrá a https://github.com/codespaces, abrí el tuyo y pegá
  `bash .devcontainer/prender.sh` (ya no hace falta vincular de nuevo).
- Para ver la consola sin apagarlo: `tmux attach -t bot`. Para salir: Ctrl+B y después D.
